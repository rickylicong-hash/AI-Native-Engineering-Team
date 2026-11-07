#!/usr/bin/env node
/**
 * 检查 GROWTH.md 的提案处置台账。
 *
 * 规则（1.9.0）：
 *   - 每条提案必须在“提案处置索引”中有一行；
 *   - 状态只能是 proposed / accepted / in_progress / deferred / done / rejected / superseded / partial；
 *   - done / rejected / superseded 为已处置；其余为未处置；
 *   - done 必须有落地版本/任务、证据和更新日期；
 *   - scope 只能是 team / project；缺省按 team；
 *   - 只有 scope=team 的未处置提案计入团队 open（open）；
 *   - 净零：last_retro_new ≤ 2 且 ≤ last_retro_closed；team open 连续两轮上升报 error；
 *   - --strict 下 team 未处置提案也算失败；默认只报 warning。
 *
 * 用法：
 *   node growth-check.mjs [--project <dir>] [--json] [--open] [--strict]
 *   node growth-check.mjs --debt [--json] [--project <dir>]
 *   node growth-check.mjs --archive [--yes] [--project <dir>]
 *
 * 退出码：
 *   0 = 无 error（默认）/ 归档计划已输出
 *   1 = 有 error，或 --strict 下有 warning
 *   2 = 没有 .ai-team/team/GROWTH.md
 *   3 = 解析失败
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

const project = path.resolve(
  getArg("--project", process.cwd()).replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""),
);
const growthFile = path.join(project, ".ai-team", "team", "GROWTH.md");
const archiveDir = path.join(project, ".ai-team", "team", "archive");
const json = hasFlag("--json");
const openOnly = hasFlag("--open");
const strict = hasFlag("--strict");
const archive = hasFlag("--archive");
const debt = hasFlag("--debt");
const yes = hasFlag("--yes");

const TERMINAL = new Set(["done", "rejected", "superseded"]);
const VALID = new Set(["proposed", "accepted", "in_progress", "deferred", "partial", ...TERMINAL]);
const SCOPES = new Set(["team", "project"]);

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return data;
}

function cells(line) {
  return line.split("|").map((cell) => cell.trim()).filter((_, index, all) => index > 0 && index < all.length - 1);
}

function tableAfter(text, headingPattern) {
  const heading = text.match(headingPattern);
  if (!heading) return [];
  const rest = text.slice(heading.index + heading[0].length);
  const lines = rest.split(/\r?\n/);
  const rows = [];
  let started = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (started && rows.length > 0) break;
      continue;
    }
    if (!line.trim().startsWith("|")) {
      if (started && rows.length > 0) break;
      continue;
    }
    started = true;
    rows.push(line);
  }
  return rows;
}

function parseTable(rows, headerTest) {
  if (rows.length < 2) return [];
  const header = cells(rows[0]);
  if (!headerTest(header)) return [];
  const result = [];
  for (const line of rows.slice(1)) {
    if (/^\|[\s:|-]+\|$/.test(line.trim())) continue;
    const values = cells(line);
    if (values.length === 0) continue;
    const row = {};
    for (let i = 0; i < header.length; i += 1) row[header[i]] = values[i] ?? "";
    result.push(row);
  }
  return result;
}

function proposalTables(section) {
  const lines = section.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|\s*ID\s*\|/.test(lines[i])) continue;
    const table = [];
    let j = i;
    while (j < lines.length && lines[j].trim().startsWith("|")) {
      table.push(lines[j]);
      j += 1;
    }
    rows.push(...parseTable(table, (header) => header.includes("ID") && header.includes("提案")));
  }
  return rows;
}

function normalizeStatus(value) {
  return (value || "").replace(/`/g, "").replace(/@.*$/, "").trim().toLowerCase();
}

function isMissing(value) {
  const v = (value || "").trim();
  return !v || v === "-" || v === "—" || v === "TBD";
}

if (!fs.existsSync(growthFile)) {
  const message = `not an AI Team project: missing ${growthFile}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(2);
}

let text;
try {
  text = read(growthFile);
} catch (error) {
  const message = `could not read ${growthFile}: ${error.message}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(3);
}

const errors = [];
const warnings = [];
const archivedNav = new Set(
  [...text.matchAll(/^-\s+(RETRO-\d+)\s+[—-]\s+/gm)].map((m) => m[1]),
);

// 1) 索引表：唯一状态源。
const indexRows = parseTable(
  tableAfter(text, /^##\s+提案处置索引\s*$/m),
  (header) => header.includes("ID") && header.includes("状态"),
);
const index = new Map();
for (const row of indexRows) {
  const id = (row.ID || "").trim();
  if (!/^[PT]-\d+/.test(id)) continue;
  if (index.has(id)) {
    errors.push(`duplicate index row: ${id}`);
    continue;
  }
  const status = normalizeStatus(row["状态"]);
  const scopeRaw = (row.scope || row.SCOPE || "").trim().toLowerCase();
  const scope = scopeRaw || "team";
  const entry = {
    id,
    retro: (row.RETRO || "").trim(),
    title: (row["提案"] || "").trim(),
    status,
    scope,
    landing: (row["落地版本/任务"] || "").trim(),
    evidence: (row["证据"] || "").trim(),
    date: (row["更新日期"] || "").trim(),
    review: (row["复查日期"] || "").trim(),
  };
  index.set(id, entry);
  if (!VALID.has(status)) {
    errors.push(`${id}: invalid status '${row["状态"] || ""}'`);
  }
  if (!SCOPES.has(scope)) {
    errors.push(`${id}: invalid scope '${row.scope || row.SCOPE || ""}' (expected team|project)`);
  }
  if (TERMINAL.has(status)) {
    if (status === "done" && isMissing(entry.landing)) errors.push(`${id}: done requires 落地版本/任务`);
    if (isMissing(entry.evidence)) errors.push(`${id}: ${status} requires 证据`);
    if (isMissing(entry.date)) errors.push(`${id}: ${status} requires 更新日期`);
  }
  if (status === "deferred" && isMissing(entry.review) && !/复查/.test(entry.evidence)) {
    const message = `${id}: deferred requires 复查日期 或证据中的复查触发点`;
    if (debt) errors.push(message);
    else warnings.push(message);
  }
}

// 2) RETRO 提案表：检查索引覆盖。
const retroMatches = [...text.matchAll(/^##\s+(RETRO-\d+)\b.*$/gm)];
const proposals = new Map();
for (let i = 0; i < retroMatches.length; i += 1) {
  const match = retroMatches[i];
  const start = match.index;
  const end = i + 1 < retroMatches.length ? retroMatches[i + 1].index : text.length;
  const section = text.slice(start, end);
  const rows = proposalTables(section);
  for (const row of rows) {
    const id = (row.ID || "").trim();
    if (!/^[PT]-\d+/.test(id)) continue;
    if (proposals.has(id)) {
      errors.push(`duplicate proposal id in RETRO tables: ${id}`);
      continue;
    }
    proposals.set(id, {
      id,
      retro: match[1],
      title: (row["提案"] || "").trim(),
      section,
    });
  }
}

for (const [id, proposal] of proposals) {
  const row = index.get(id);
  if (!row) {
    errors.push(`${id}: missing row in 提案处置索引`);
    continue;
  }
  if (row.retro && row.retro !== proposal.retro) {
    warnings.push(`${id}: index RETRO=${row.retro}, proposal table RETRO=${proposal.retro}`);
  }
}
for (const id of index.keys()) {
  const row = index.get(id);
  if (!proposals.has(id) && !(row && archivedNav.has(row.retro))) {
    const message = `${id}: index row has no matching RETRO proposal`;
    if (debt) errors.push(`${message}（index-only 提案必须登记到 RETRO 表）`);
    else warnings.push(message);
  }
}

// 3) 统计：open 只算 team-core；project scope 单列（1.9.0）。
const rows = [...index.values()];
const openAll = rows.filter((row) => !TERMINAL.has(row.status));
const open = openAll.filter((row) => row.scope === "team");
const projectOpen = openAll.filter((row) => row.scope === "project");
const done = rows.filter((row) => TERMINAL.has(row.status));
const missing = rows.filter((row) => !VALID.has(row.status));

// 3.1) 净零校验：字段存在才检查，保持旧台账兼容。
const meta = frontmatter(text);
function intField(name) {
  if (!(name in meta)) return null;
  const value = Number.parseInt(meta[name], 10);
  return Number.isFinite(value) ? value : null;
}
const lastRetroNew = intField("last_retro_new");
const lastRetroClosed = intField("last_retro_closed");
const teamOpenLast = intField("team_open_at_last_retro");
const teamOpenPrev = intField("team_open_at_prev_retro");
const teamOpenPrev2 = intField("team_open_at_prev2_retro");
if ((meta.scope_model === "three-tier" || meta.net_zero === "enforced") && lastRetroNew === null) {
  errors.push("net-zero: scope_model/net_zero 已启用，但 frontmatter 缺少 last_retro_new；必须由本轮索引新增加总，不得手填 0");
}
if (lastRetroNew !== null && lastRetroNew > 2) {
  errors.push(`net-zero: last_retro_new=${lastRetroNew} > 2；每轮新增 TEAM-CORE 提案最多 2 条`);
}
if (lastRetroNew !== null && lastRetroClosed !== null && lastRetroNew > lastRetroClosed) {
  errors.push(`net-zero: last_retro_new=${lastRetroNew} > last_retro_closed=${lastRetroClosed}；新增不得高于关闭/合并数`);
}
if (teamOpenLast !== null && teamOpenPrev !== null && teamOpenPrev2 !== null
  && teamOpenLast > teamOpenPrev && teamOpenPrev > teamOpenPrev2) {
  errors.push(`net-zero: team open 连续两轮上升（${teamOpenPrev2} → ${teamOpenPrev} → ${teamOpenLast}）；本轮不得新增，先清债`);
}

// 3.2) 债务指标：年龄 + 重复簇。
function daysSince(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date || "").trim());
  if (!match) return null;
  const then = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (!Number.isFinite(then)) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - then) / 86400000));
}

function normalizeTitle(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[`*_>#]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function titleTokens(value) {
  const normalized = normalizeTitle(value);
  const tokens = new Set();
  for (const word of normalized.split(/\s+/)) {
    if (word.length >= 2 && !/^[\u4e00-\u9fff]+$/.test(word)) tokens.add(word);
  }
  const cjk = normalized.replace(/[^\u4e00-\u9fff]/g, "");
  for (let i = 0; i + 1 < cjk.length; i += 1) tokens.add(cjk.slice(i, i + 2));
  return tokens;
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function duplicateClusters(list) {
  const clusters = [];
  const consumed = new Set();
  for (let i = 0; i < list.length; i += 1) {
    const first = list[i];
    if (consumed.has(first.id)) continue;
    const group = [first.id];
    const firstNorm = normalizeTitle(first.title);
    const firstTokens = titleTokens(first.title);
    for (let j = i + 1; j < list.length; j += 1) {
      const other = list[j];
      if (consumed.has(other.id)) continue;
      const otherNorm = normalizeTitle(other.title);
      const similar = jaccard(firstTokens, titleTokens(other.title)) >= 0.5
        || (firstNorm.length >= 8 && otherNorm.length >= 8
          && (firstNorm.includes(otherNorm) || otherNorm.includes(firstNorm)));
      if (similar) {
        group.push(other.id);
        consumed.add(other.id);
      }
    }
    if (group.length > 1) {
      consumed.add(first.id);
      clusters.push(group);
    }
  }
  return clusters;
}

const ages = openAll.map((row) => ({ row, ageDays: daysSince(row.date) }));
const knownAges = ages.map((item) => item.ageDays).filter((value) => value !== null);
const oldest = ages
  .filter((item) => item.ageDays !== null)
  .sort((a, b) => b.ageDays - a.ageDays)
  .slice(0, 5)
  .map((item) => ({ id: item.row.id, scope: item.row.scope, ageDays: item.ageDays, title: item.row.title }));
const debtSummary = {
  teamOpen: open.length,
  projectOpen: projectOpen.length,
  openAll: openAll.length,
  done: done.length,
  averageAgeDays: knownAges.length
    ? Math.round((knownAges.reduce((sum, value) => sum + value, 0) / knownAges.length) * 10) / 10
    : null,
  unknownAge: openAll.length - knownAges.length,
  oldest,
  duplicates: duplicateClusters(openAll),
  netZero: {
    lastRetroNew,
    lastRetroClosed,
    teamOpenLast,
    teamOpenPrev,
    teamOpenPrev2,
  },
};

// 4) 归档：只归档“全部提案已处置”的旧 RETRO；索引行一并移入归档。
function archivePlan() {
  const numbers = retroMatches.map((m) => Number.parseInt(m[1].replace("RETRO-", ""), 10));
  const latest = numbers.length ? Math.max(...numbers) : 0;
  const eligible = [];
  for (const match of retroMatches) {
    const number = Number.parseInt(match[1].replace("RETRO-", ""), 10);
    if (number === latest) continue;
    const sectionStart = match.index;
    const next = retroMatches.find((m) => m.index > sectionStart);
    const sectionEnd = next ? next.index : text.length;
    const section = text.slice(sectionStart, sectionEnd);
    const rowsInSection = [...proposals.values()].filter((p) => p.retro === match[1]);
    if (rowsInSection.length === 0) continue;
    const allClosed = rowsInSection.every((p) => {
      const row = index.get(p.id);
      return row && TERMINAL.has(row.status);
    });
    if (allClosed) eligible.push({ match, section, rows: rowsInSection });
  }
  eligible.sort((a, b) => Number.parseInt(a.match[1].replace("RETRO-", ""), 10) - Number.parseInt(b.match[1].replace("RETRO-", ""), 10));
  return eligible;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

if (archive) {
  const eligible = archivePlan();
  if (eligible.length === 0) {
    if (json) console.log(JSON.stringify({ ok: true, archive: { eligible: [], moved: [] } }, null, 2));
    else console.log("AI Team growth archive\narchive: nothing eligible (latest RETRO or open proposals remain)");
    process.exit(0);
  }
  if (!yes) {
    if (json) {
      console.log(JSON.stringify({ ok: true, archive: { eligible: eligible.map((e) => e.match[1]), moved: [] } }, null, 2));
    } else {
      console.log("AI Team growth archive plan");
      console.log(`project:   ${project}`);
      for (const item of eligible) {
        const ids = item.rows.map((p) => p.id).join(", ");
        console.log(`  ${item.match[1]}: ${ids}`);
      }
      console.log("action:    run again with --archive --yes to move these RETRO sections");
    }
    process.exit(0);
  }

  const yearMatch = eligible[0].match[0].match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
  const archiveFile = path.join(archiveDir, `GROWTH-${year}.md`);
  fs.mkdirSync(archiveDir, { recursive: true });
  const header = fs.existsSync(archiveFile)
    ? ""
    : `# GROWTH Archive — ${year}\n\n> 归档自 \`team/GROWTH.md\`，保留完整历史；主文件只保留索引和最近复盘。\n\n`;
  const archivedRows = eligible.flatMap((item) => item.rows.map((p) => index.get(p.id)).filter(Boolean));
  const indexTable = [
    "## 提案处置索引（归档）",
    "",
    "| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 | scope |",
    "|---|---|---|---|---|---|---|---|",
    ...archivedRows.map((row) => `| ${row.id} | ${row.retro} | ${row.title} | ${row.status} | ${row.landing || "-"} | ${row.evidence || "-"} | ${row.date || "-"} | ${row.scope || "team"} |`),
    "",
  ].join("\n");
  const archiveBody = eligible.map((item) => item.section.trim()).join("\n\n");
  fs.appendFileSync(archiveFile, `${header || "\n"}${indexTable}\n${archiveBody}\n`, "utf8");

  let next = text;
  for (const item of eligible) {
    const number = item.match[1];
    const replacement = `## ${number} — archived\n\n- 归档：\`team/archive/GROWTH-${year}.md\`\n- 提案：${item.rows.map((p) => p.id).join(", ")}（全部已处置）\n\n`;
    next = next.replace(item.section, replacement);
  }
  // 保留完整处置索引（compact ledger）；只把 RETRO 详情移入 archive。
  const navHeading = "## 已归档复盘";
  const navLines = eligible.map((item) => `- ${item.match[1]} — \`team/archive/GROWTH-${year}.md\``);
  if (next.includes(navHeading)) {
    const navStart = next.indexOf(navHeading);
    const nextHeading = next.indexOf("## ", navStart + 1);
    const navEnd = nextHeading >= 0 ? nextHeading : next.length;
    const existing = next.slice(navStart, navEnd).trimEnd();
    const additions = navLines.filter((line) => !existing.includes(line));
    next = `${next.slice(0, navStart)}${existing}${additions.length ? `\n${additions.join("\n")}` : ""}\n\n${next.slice(navEnd)}`;
  } else {
    const indexStart = next.indexOf("## 提案处置索引");
    const indexEnd = next.indexOf("## ", indexStart + 1);
    if (indexStart >= 0 && indexEnd > indexStart) {
      const nav = [navHeading, "", ...navLines, "", ""].join("\n");
      next = `${next.slice(0, indexEnd)}${nav}${next.slice(indexEnd)}`;
    }
  }
  const remainingOpen = [...index.values()].filter((row) => row.scope === "team" && !TERMINAL.has(row.status) && !eligible.some((item) => item.rows.some((p) => p.id === row.id))).length;
  next = next.replace(/^open_proposals:\s*\d+\s*$/m, `open_proposals: ${remainingOpen}`);
  next = next.replace(/^last_disposition:\s*.*$/m, `last_disposition: ${today()}`);
  fs.writeFileSync(growthFile, next, "utf8");

  if (json) {
    console.log(JSON.stringify({ ok: true, archive: { file: archiveFile, moved: eligible.map((e) => e.match[1]) } }, null, 2));
  } else {
    console.log("AI Team growth archive");
    console.log(`project:   ${project}`);
    console.log(`archive:   ${archiveFile}`);
    console.log(`moved:     ${eligible.map((e) => e.match[1]).join(", ")}`);
  }
  process.exit(0);
}

const failed = errors.length > 0 || (strict && (warnings.length > 0 || open.length > 0));
const summary = {
  ok: !failed,
  proposals: rows.length,
  done: done.length,
  open: open.length,
  openAll: openAll.length,
  teamOpen: open.length,
  projectOpen: projectOpen.length,
  missing: missing.length,
  errors,
  warnings,
  debt: debtSummary,
  openProposals: openAll.map((row) => ({
    id: row.id,
    scope: row.scope,
    retro: row.retro,
    title: row.title,
    status: row.status,
  })),
};

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else if (debt) {
  console.log("AI Team growth debt");
  console.log(`project:   ${project}`);
  console.log(`proposals: ${rows.length} (done ${done.length}, team open ${open.length}, project open ${projectOpen.length}, invalid ${missing.length})`);
  console.log(`team open: ${open.length}${open.length ? ` — ${open.map((row) => row.id).join(", ")}` : ""}`);
  console.log(`project open: ${projectOpen.length}${projectOpen.length ? ` — ${projectOpen.map((row) => row.id).join(", ")}` : ""}`);
  console.log(`age:       average ${debtSummary.averageAgeDays === null ? "n/a" : `${debtSummary.averageAgeDays}d`}, unknown ${debtSummary.unknownAge}`);
  if (debtSummary.oldest.length) {
    console.log(`oldest:    ${debtSummary.oldest.map((item) => `${item.id}(${item.scope}, ${item.ageDays}d)`).join(", ")}`);
  }
  const duplicateText = debtSummary.duplicates.length
    ? debtSummary.duplicates.map((group) => `[${group.join(", ")}]`).join(" ")
    : "none";
  console.log(`duplicates: ${duplicateText}`);
  const nz = debtSummary.netZero;
  const nzParts = [];
  if (nz.lastRetroNew !== null) nzParts.push(`new ${nz.lastRetroNew}`);
  if (nz.lastRetroClosed !== null) nzParts.push(`closed ${nz.lastRetroClosed}`);
  if (nz.teamOpenLast !== null) nzParts.push(`team open ${nz.teamOpenPrev2 ?? "?"} -> ${nz.teamOpenPrev ?? "?"} -> ${nz.teamOpenLast}`);
  console.log(`net-zero:  ${nzParts.length ? nzParts.join(", ") : "not recorded (legacy ledger)"}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  console.log(`result:   ${failed ? "FAIL" : "PASS"}${strict ? " (strict)" : ""}`);
} else {
  console.log("AI Team growth check");
  console.log(`project:   ${project}`);
  console.log(`proposals: ${rows.length} (done ${done.length}, open ${open.length} team / ${projectOpen.length} project, invalid ${missing.length})`);
  if (openOnly) {
    for (const row of openAll) console.log(`  OPEN  ${row.id} [${row.scope}/${row.status}] ${row.retro} ${row.title}`);
  } else {
    for (const row of openAll) console.log(`  OPEN  ${row.id} [${row.scope}/${row.status}] ${row.retro} ${row.title}`);
  }
  for (const error of errors) console.log(`  ERROR ${error}`);
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  console.log(`result:   ${failed ? "FAIL" : "PASS"}${strict ? " (strict)" : ""}`);
  if (failed) console.log("action:   update 提案处置索引; every proposal needs a valid status and terminal evidence");
}

process.exit(failed ? 1 : 0);
