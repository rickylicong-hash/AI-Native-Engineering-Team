#!/usr/bin/env node
/**
 * 检查 GROWTH.md 的提案处置台账。
 *
 * 规则（1.3.0）：
 *   - 每条提案必须在“提案处置索引”中有一行；
 *   - 状态只能是 proposed / accepted / in_progress / deferred / done / rejected / superseded / partial；
 *   - done / rejected / superseded 为已处置；其余为未处置；
 *   - done 必须有落地版本/任务、证据和更新日期；
 *   - --strict 下未处置提案也算失败；默认只报 warning。
 *
 * 用法：
 *   node growth-check.mjs [--project <dir>] [--json] [--open] [--strict]
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
const yes = hasFlag("--yes");

const TERMINAL = new Set(["done", "rejected", "superseded"]);
const VALID = new Set(["proposed", "accepted", "in_progress", "deferred", "partial", ...TERMINAL]);

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
    if (!/^\|\s*ID\s*\|\s*提案\s*\|/.test(lines[i])) continue;
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
  const entry = {
    id,
    retro: (row.RETRO || "").trim(),
    title: (row["提案"] || "").trim(),
    status,
    landing: (row["落地版本/任务"] || "").trim(),
    evidence: (row["证据"] || "").trim(),
    date: (row["更新日期"] || "").trim(),
  };
  index.set(id, entry);
  if (!VALID.has(status)) {
    errors.push(`${id}: invalid status '${row["状态"] || ""}'`);
  }
  if (TERMINAL.has(status)) {
    if (status === "done" && isMissing(entry.landing)) errors.push(`${id}: done requires 落地版本/任务`);
    if (isMissing(entry.evidence)) errors.push(`${id}: ${status} requires 证据`);
    if (isMissing(entry.date)) errors.push(`${id}: ${status} requires 更新日期`);
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
    warnings.push(`${id}: index row has no matching RETRO proposal`);
  }
}

// 3) 统计。
const rows = [...index.values()];
const open = rows.filter((row) => !TERMINAL.has(row.status));
const done = rows.filter((row) => TERMINAL.has(row.status));
const missing = rows.filter((row) => !VALID.has(row.status));

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
    "| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 |",
    "|---|---|---|---|---|---|---|",
    ...archivedRows.map((row) => `| ${row.id} | ${row.retro} | ${row.title} | ${row.status} | ${row.landing || "-"} | ${row.evidence || "-"} | ${row.date || "-"} |`),
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
  const indexStart = next.indexOf("## 提案处置索引");
  const indexEnd = next.indexOf("## ", indexStart + 1);
  if (indexStart >= 0 && indexEnd > indexStart) {
    const before = next.slice(0, indexStart);
    const indexBlock = next.slice(indexStart, indexEnd).trimEnd();
    const after = next.slice(indexEnd);
    const nav = ["## 已归档复盘", "", ...eligible.map((item) => `- ${item.match[1]} — \`team/archive/GROWTH-${year}.md\``), "", ""].join("\n");
    next = `${before}${indexBlock}\n\n${nav}${after}`;
  }
  const remainingOpen = [...index.values()].filter((row) => !TERMINAL.has(row.status) && !eligible.some((item) => item.rows.some((p) => p.id === row.id))).length;
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
  missing: missing.length,
  errors,
  warnings,
  openProposals: open.map((row) => ({ id: row.id, retro: row.retro, title: row.title, status: row.status })),
};

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("AI Team growth check");
  console.log(`project:   ${project}`);
  console.log(`proposals: ${rows.length} (done ${done.length}, open ${open.length}, invalid ${missing.length})`);
  if (openOnly) {
    for (const row of open) console.log(`  OPEN  ${row.id} [${row.status}] ${row.retro} ${row.title}`);
  } else {
    for (const row of open) console.log(`  OPEN  ${row.id} [${row.status}] ${row.retro} ${row.title}`);
  }
  for (const error of errors) console.log(`  ERROR ${error}`);
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
  console.log(`result:   ${failed ? "FAIL" : "PASS"}${strict ? " (strict)" : ""}`);
  if (failed) console.log("action:   update 提案处置索引; every proposal needs a valid status and terminal evidence");
}

process.exit(failed ? 1 : 0);
