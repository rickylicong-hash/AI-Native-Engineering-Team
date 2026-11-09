#!/usr/bin/env node
/**
 * 质量报告（1.10.0）。
 *
 * 从 `.ai-team/state/TASKS.md`、`.ai-team/reviews/**`、`.ai-team/security/**`、
 * `.ai-team/qa/**` 计算团队质量目标 §0.1 的代理指标：
 *   - 一次通过率（实现任务首次进入 review）
 *   - review-ready 率
 *   - 审查轮次
 *   - P1 findings / P1 escapes
 *
 * 口径按 `docs/TEAM.md` §0.1：
 *   只统计实现任务首次进入 review；review 任务、R1/R2 修复任务不计入分母；
 *   首次通过 = 首轮结论“通过” + P0/P1=0 + 无 R1/R2 + 无 checkpoint 阻断。
 *
 * 这是**代理指标**：checkpoint 阻断、跨角色返工等无法完全从 Markdown 推断，
 * 报告会输出 data_quality 警告，不能替代 reviewer/Chief 的语义判断。
 *
 * 用法：
 *   node quality-report.mjs --project . 
 *   node quality-report.mjs --project . --json
 *   node quality-report.mjs --project . --out .ai-team/work/QUALITY-REPORT.md
 *   node quality-report.mjs --project . --strict
 *
 * 退出码：0 = 生成成功；1 = --strict 且数据不足/有错误；2 = 参数/项目错误；3 = 读取失败。
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage: node quality-report.mjs [--project DIR] [--json] [--out FILE] [--max-files N] [--strict]`);
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const aiTeam = path.join(project, ".ai-team");
const json = hasFlag("--json");
const strict = hasFlag("--strict");
const out = getArg("--out");
const MAX_FILES_DEFAULT = 2000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const maxFiles = Number.parseInt(getArg("--max-files", String(MAX_FILES_DEFAULT)), 10) || MAX_FILES_DEFAULT;
const scanState = { files: 0, truncated: false, symlinks: 0, oversized: 0 };

function readText(file) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) {
    scanState.symlinks += 1;
    return "";
  }
  if (stat.size > MAX_FILE_BYTES) {
    scanState.oversized += 1;
    return "";
  }
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function walk(dir, predicate, outFiles = []) {
  if (!fs.existsSync(dir)) return outFiles;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (scanState.files >= maxFiles) {
      scanState.truncated = true;
      return outFiles;
    }
    if (entry.isSymbolicLink()) {
      scanState.symlinks += 1;
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, outFiles);
    else if (predicate(full, entry.name)) {
      scanState.files += 1;
      outFiles.push(full);
    }
  }
  return outFiles;
}

function cells(line) {
  return line.split("|").map((cell) => cell.trim()).filter((_, index, all) => index > 0 && index < all.length - 1);
}

const warnings = [];
const errors = [];

function warn(id, detail) {
  warnings.push({ id, detail });
}

function error(id, detail) {
  errors.push({ id, detail });
}

/* ------------------------------------------------------------------ */
/* Tasks                                                              */
/* ------------------------------------------------------------------ */

function parseTasks() {
  const file = path.join(aiTeam, "state", "TASKS.md");
  const tasks = [];
  if (!fs.existsSync(file)) {
    warn("missing-tasks-md", `${file} 不存在；从 .ai-team/tasks/*.md 推断任务，结果可能不完整`);
    const taskFiles = walk(path.join(aiTeam, "tasks"), (full, name) => /^TASK-.*\.md$/i.test(name));
    for (const full of taskFiles) {
      const text = readText(full);
      const id = (text.match(/\bTASK-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/) || [])[0];
      if (!id) continue;
      const title = (text.match(/^#\s+(.+)$/m) || [])[1] || "";
      tasks.push({ id, title, owner: "", status: "unknown", source: path.relative(project, full) });
    }
    return tasks;
  }

  const text = readText(file);
  const lines = text.split(/\r?\n/);
  let header = null;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      if (header) break;
      continue;
    }
    const values = cells(line);
    if (values.some((value) => /^ID$/i.test(value)) && values.some((value) => /标题|Owner|状态/.test(value))) {
      header = values;
      continue;
    }
    if (!header) continue;
    if (/^\|[\s:|-]+\|$/.test(line.trim())) continue;
    const row = {};
    for (let i = 0; i < header.length; i += 1) row[header[i]] = values[i] ?? "";
    const id = (row.ID || "").trim();
    if (!/^TASK-/.test(id)) continue;
    tasks.push({
      id,
      title: (row["标题"] || row.Title || "").trim(),
      owner: (row.Owner || row["Owner"] || "").trim(),
      status: (row["状态"] || row.Status || "").trim().toLowerCase(),
      source: path.relative(project, file),
    });
  }
  if (tasks.length === 0) warn("tasks-md-empty", `${file} 存在但没有解析到 TASK-* 行`);
  return tasks;
}

const EXCLUDED_ID = /(^|-)R\d+$|^TASK-(GIT|DOC|DOCS|QA|REVIEW|SEC|SECURITY|DEPLOY|RELEASE|OPS|IMPROVE|SPIKE|SMOKE|RETRO|AUDIT|HANDOFF|CHECKPOINT|PLAN|DESIGN|UX|PRD)(-|$)/i;
const EXCLUDED_TITLE = /review|审查|审计|文档|发布|部署|checkpoint|handoff|retro|复盘|改进|spike|调研|smoke|冒烟|设计|需求|架构/i;

function isImplementationTask(task) {
  if (EXCLUDED_ID.test(task.id)) return false;
  if (EXCLUDED_TITLE.test(task.title)) return false;
  if (task.owner) {
    return /engineer/i.test(task.owner) && !/qa|review|security|devops|writer/i.test(task.owner);
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Reviews / security / QA                                            */
/* ------------------------------------------------------------------ */

function conclusionOf(text) {
  const match = text.match(/结论[：:]\s*\**\s*(修改后通过|不通过|通过)/);
  return match ? match[1] : null;
}

function countOf(label, text) {
  const equal = text.match(new RegExp(`${label}\\s*[=:：]\\s*(\\d+)`, "i"));
  if (equal) return Number.parseInt(equal[1], 10);
  const markers = text.match(new RegExp(`^\\s*[-*]\\s*\\[${label}(?:-\\d+)?\\]`, "gmi"));
  return markers ? markers.length : null;
}

function taskIdOf(text) {
  const head = text.split(/\r?\n/).slice(0, 30).join("\n");
  const match = head.match(/\bTASK-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/);
  return match ? match[0] : null;
}

function baseTaskId(id) {
  return id.replace(/-R\d+$/, "");
}

function roundOf(file, text, taskId) {
  const base = path.basename(file);
  const fullToken = taskId.replace(/^TASK-/, "");
  const baseToken = baseTaskId(taskId).replace(/^TASK-/, "");
  for (const token of [fullToken, baseToken]) {
    const idx = base.lastIndexOf(token);
    if (idx < 0) continue;
    const rest = base.slice(idx + token.length);
    const suffix = rest.match(/^-R(\d+)/i);
    if (suffix) return 1 + Number.parseInt(suffix[1], 10);
    return 1;
  }
  const fromText = text.match(/(?:第\s*|轮次[：:]\s*R?)(\d+)\s*轮/i);
  return fromText ? Number.parseInt(fromText[1], 10) : 1;
}

function parseEvidenceFile(file, phase) {
  const text = readText(file);
  const id = taskIdOf(text);
  if (!id) {
    warn("review-without-task-id", `${path.relative(project, file)} 未找到 TASK-* ID`);
    return null;
  }
  const conclusion = conclusionOf(text);
  if (phase === "review" && !conclusion) {
    warn("review-without-conclusion", `${path.relative(project, file)} 未找到“结论：通过/修改后通过/不通过”`);
  }
  return {
    file: path.relative(project, file),
    phase,
    taskId: id,
    baseTaskId: baseTaskId(id),
    round: roundOf(file, text, id),
    conclusion,
    p0: countOf("P0", text),
    p1: countOf("P1", text),
    p2: countOf("P2", text),
    hasReviewEntry: /Review-entry/i.test(text),
    hasIndependent: /^##\s+独立验证\s*$/m.test(text) || /^##\s+证据\s*$/m.test(text),
    hasDoneGate: /Done gate/i.test(text),
  };
}

const evidenceFiles = [
  ...walk(path.join(aiTeam, "reviews"), (full, name) => /^REV-.*\.md$/i.test(name)).map((file) => ({ file, phase: "review" })),
  ...walk(path.join(aiTeam, "security"), (full, name) => /^SEC-.*\.md$/i.test(name)).map((file) => ({ file, phase: "security" })),
  ...walk(path.join(aiTeam, "qa"), (full, name) => /\.md$/i.test(name)).map((file) => ({ file, phase: "qa" })),
];

const evidence = [];
for (const item of evidenceFiles) {
  const parsed = parseEvidenceFile(item.file, item.phase);
  if (parsed) evidence.push(parsed);
}

if (scanState.truncated) {
  warn("scan-truncated", `扫描达到 --max-files=${maxFiles}，结果可能不完整`);
}
if (scanState.symlinks > 0) {
  warn("symlink-skipped", `${scanState.symlinks} 个符号链接被跳过，避免读取项目外文件`);
}
if (scanState.oversized > 0) {
  warn("file-too-large", `${scanState.oversized} 个文件超过 ${MAX_FILE_BYTES} 字节被跳过`);
}

/* ------------------------------------------------------------------ */
/* Metrics                                                            */
/* ------------------------------------------------------------------ */

const tasks = parseTasks();
const implementation = tasks.filter(isImplementationTask);
if (implementation.length === 0) {
  warn("no-implementation-tasks", "没有识别到实现任务；检查 TASKS.md owner/标题，或项目是否只含 review/维护任务");
}

const fixTaskIds = new Set(
  [...tasks.map((task) => task.id), ...evidence.map((item) => item.taskId)]
    .filter((id) => /-R\d+$/.test(id))
    .map((id) => baseTaskId(id)),
);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const taskRows = implementation.map((task) => {
  const reviews = evidence
    .filter((item) => item.phase === "review" && item.baseTaskId === task.id)
    .map((item) => {
      const fix = item.taskId.match(new RegExp(`^${escapeRegex(task.id)}-R(\\d+)$`));
      return fix ? { ...item, round: Math.max(item.round, 1 + Number.parseInt(fix[1], 10)) } : item;
    })
    .sort((a, b) => {
      const initialA = a.taskId === task.id ? 0 : 1;
      const initialB = b.taskId === task.id ? 0 : 1;
      return initialA - initialB || a.round - b.round || a.file.localeCompare(b.file);
    });
  const first = reviews[0] || null;
  const rounds = reviews.reduce((max, item) => Math.max(max, item.round), 0);
  const blocked = /blocked/i.test(task.status);
  const hasFix = fixTaskIds.has(task.id);
  const firstPass = Boolean(
    first
    && first.conclusion === "通过"
    && first.p0 === 0
    && first.p1 === 0
    && !hasFix
    && !blocked,
  );
  const p1Findings = reviews.reduce((sum, item) => sum + (item.p1 || 0), 0);
  const firstRound = first ? first.round : 1;
  const p1Escapes = reviews
    .filter((item) => item.round > firstRound)
    .reduce((sum, item) => sum + (item.p1 || 0), 0)
    + evidence
      .filter((item) => item.phase !== "review" && item.baseTaskId === task.id)
      .reduce((sum, item) => sum + (item.p1 || 0), 0);
  return {
    id: task.id,
    title: task.title,
    owner: task.owner,
    status: task.status,
    reviews: reviews.length,
    rounds,
    first_conclusion: first ? first.conclusion : null,
    first_pass: firstPass,
    p1_findings: p1Findings,
    p1_escapes: p1Escapes,
    blocked,
    has_fix_task: hasFix,
    review_ready: reviews.length > 0,
  };
});

const reviewed = taskRows.filter((row) => row.review_ready);
const firstPass = taskRows.filter((row) => row.first_pass);
const firstPassRate = reviewed.length ? firstPass.length / reviewed.length : null;
const reviewReadyRate = taskRows.length ? reviewed.length / taskRows.length : null;
const reviewRoundsAvg = reviewed.length
  ? reviewed.reduce((sum, row) => sum + row.rounds, 0) / reviewed.length
  : null;
const p1Findings = evidence.reduce((sum, item) => sum + (item.p1 || 0), 0);
const p1Escapes = taskRows.reduce((sum, row) => sum + row.p1_escapes, 0);
const implementationIds = new Set(taskRows.map((row) => row.id));
const p1Unattributed = evidence
  .filter((item) => !implementationIds.has(item.baseTaskId))
  .reduce((sum, item) => sum + (item.p1 || 0), 0);

const isTeamSource = fs.existsSync(path.join(project, "team-manifest.json"))
  && fs.existsSync(path.join(aiTeam, "team", "GROWTH.md"));

const summary = {
  mode: isTeamSource ? "team-source" : "project",
  implementation_tasks: taskRows.length,
  reviewed_tasks: reviewed.length,
  first_pass_tasks: firstPass.length,
  first_pass_rate: firstPassRate,
  first_pass_pct: firstPassRate === null ? null : `${(firstPassRate * 100).toFixed(1)}%`,
  review_ready_rate: reviewReadyRate,
  review_ready_pct: reviewReadyRate === null ? null : `${(reviewReadyRate * 100).toFixed(1)}%`,
  review_rounds_avg: reviewRoundsAvg,
  p1_findings: p1Findings,
  p1_escapes: p1Escapes,
  p1_unattributed: p1Unattributed,
};

if (isTeamSource) {
  warn("team-source-mode", "团队源仓库没有产品实现任务；质量指标应在目标项目运行，或只作为团队维护任务的观察");
}

/* ------------------------------------------------------------------ */
/* Output                                                             */
/* ------------------------------------------------------------------ */

const generatedAt = new Date().toISOString();
const result = {
  schema: 1,
  generatedAt,
  project,
  mode: summary.mode,
  summary,
  tasks: taskRows,
  evidence: evidence.map((item) => ({
    file: item.file,
    phase: item.phase,
    task: item.taskId,
    round: item.round,
    conclusion: item.conclusion,
    p0: item.p0,
    p1: item.p1,
    p2: item.p2,
  })),
  data_quality: {
    warnings,
    errors,
    notes: [
      "一次通过率分母 = 已进入 review 的实现任务；分子 = 首轮“通过”且 P0/P1=0、无 R1/R2、无 blocked。",
      "review-ready = 已进入 review 的实现任务 / 全部实现任务。",
      "P1 escapes = 首轮之后 review 轮次或 security/QA 中的 P1 数；为代理指标，需人工复核。",
      "P1 findings 含未能归属到实现任务的 P1；p1_unattributed 单独列出，避免与 escapes 混淆。",
      "checkpoint 阻断与跨角色返工无法完全从 Markdown 推断；报告不替代 reviewer/Chief 判断。",
    ],
  },
  targets: {
    first_pass_10: 0.70,
    first_pass_30: 0.80,
    first_pass_long_term: 0.85,
    t1_t2_long_term: 0.90,
    t3_t4_long_term: 0.80,
    review_ready_10: 0.90,
    review_ready_30: 0.95,
    guardrails: "P1 逃逸不上升、审查轮次 ≤2、安全覆盖不降；趋势指标，不是硬门禁",
  },
};

function mdCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, " ");
}

function markdown() {
  const lines = [];
  lines.push(`# Quality Report — ${path.basename(project)}`);
  lines.push("");
  lines.push(`- Generated: ${generatedAt}`);
  lines.push(`- Project: \`${project}\``);
  lines.push(`- Mode: ${summary.mode}`);
  lines.push(`- Source: \`.ai-team/state/TASKS.md\` + \`.ai-team/reviews/**\` + \`.ai-team/security/**\` + \`.ai-team/qa/**\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---:|");
  lines.push(`| Implementation tasks | ${summary.implementation_tasks} |`);
  lines.push(`| Reviewed tasks | ${summary.reviewed_tasks} |`);
  lines.push(`| First-pass tasks | ${summary.first_pass_tasks} |`);
  lines.push(`| First-pass rate | ${summary.first_pass_pct ?? "n/a"} |`);
  lines.push(`| Review-ready rate | ${summary.review_ready_pct ?? "n/a"} |`);
  lines.push(`| Average review rounds | ${summary.review_rounds_avg === null ? "n/a" : summary.review_rounds_avg.toFixed(2)} |`);
  lines.push(`| P1 findings | ${summary.p1_findings} |`);
  lines.push(`| P1 escapes | ${summary.p1_escapes} |`);
  lines.push(`| P1 unattributed | ${summary.p1_unattributed} |`);
  lines.push("");
  lines.push("## Tasks");
  lines.push("");
  lines.push("| Task | Owner | Status | Reviews | Rounds | First conclusion | First pass | P1 findings | P1 escapes |");
  lines.push("|---|---|---|---:|---:|---|---|---:|---:|");
  for (const row of taskRows) {
    lines.push(`| ${mdCell(row.id)} | ${mdCell(row.owner || "-")} | ${mdCell(row.status || "-")} | ${row.reviews} | ${row.rounds} | ${mdCell(row.first_conclusion || "-")} | ${row.first_pass ? "yes" : "no"} | ${row.p1_findings} | ${row.p1_escapes} |`);
  }
  if (taskRows.length === 0) lines.push("| - | - | - | 0 | 0 | - | - | 0 | 0 |");
  lines.push("");
  lines.push("## Data quality");
  lines.push("");
  if (warnings.length === 0 && errors.length === 0) {
    lines.push("- No warnings.");
  } else {
    for (const item of errors) lines.push(`- ERROR \`${item.id}\`: ${item.detail}`);
    for (const item of warnings) lines.push(`- WARN \`${item.id}\`: ${item.detail}`);
  }
  lines.push("");
  lines.push("## Method");
  lines.push("");
  for (const note of result.data_quality.notes) lines.push(`- ${note}`);
  lines.push("");
  lines.push("## Targets (trend, not hard gate)");
  lines.push("");
  lines.push(`- First-pass: 10 tasks ≥ ${(result.targets.first_pass_10 * 100).toFixed(0)}%; 30 tasks ≥ ${(result.targets.first_pass_30 * 100).toFixed(0)}%; long-term ~${(result.targets.first_pass_long_term * 100).toFixed(0)}%.`);
  lines.push(`- T1/T2 long-term ≥ ${(result.targets.t1_t2_long_term * 100).toFixed(0)}%; T3/T4 long-term ~${(result.targets.t3_t4_long_term * 100).toFixed(0)}%.`);
  lines.push(`- Review-ready: 10 tasks ≥ ${(result.targets.review_ready_10 * 100).toFixed(0)}%; 30 tasks ≥ ${(result.targets.review_ready_30 * 100).toFixed(0)}%.`);
  lines.push(`- Guardrails: ${result.targets.guardrails}.`);
  lines.push("");
  return lines.join("\n");
}

if (out) {
  const file = path.resolve(out);
  const projectPrefix = project.endsWith(path.sep) ? project : `${project}${path.sep}`;
  const tempPrefixes = [os.tmpdir(), process.env.RUNNER_TEMP, process.env.TEMP, process.env.TMP]
    .filter(Boolean)
    .map((dir) => (dir.endsWith(path.sep) ? dir : `${dir}${path.sep}`));
  const normalize = (value) => (process.platform === "win32" ? value.toLowerCase() : value);
  const target = normalize(file);
  if (!target.startsWith(normalize(projectPrefix)) && !tempPrefixes.some((prefix) => target.startsWith(normalize(prefix)))) {
    console.error("--out must be inside the project or the OS temp directory");
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json ? `${JSON.stringify(result, null, 2)}\n` : markdown(), "utf8");
  console.log(`wrote: ${file}`);
} else if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(markdown());
}

if (strict && (taskRows.length === 0 || reviewed.length === 0 || errors.length > 0)) {
  process.exit(1);
}
