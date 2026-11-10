#!/usr/bin/env node
/**
 * 质量报告（1.10.0）。
 *
 * 从 `.ai-team/state/TASKS.md`、`.ai-team/reviews/**`、`.ai-team/security/**`、
 * `.ai-team/qa/**` 计算团队质量目标 §0.1 的代理指标：
 *   - 一次通过率（实现任务首次进入 review；未识别结论单列 unverified）
 *   - review-ready 率（全量与最近 N 个完成/审查任务窗口）
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
 *   node quality-report.mjs --project . --window 10
 *
 * 退出码：0 = 生成成功；1 = --strict 且数据不足/有错误；2 = 参数/项目错误；3 = 读取失败。
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage: node quality-report.mjs [--project DIR] [--json] [--out FILE] [--max-files N] [--window N] [--strict]`);
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const aiTeam = path.join(project, ".ai-team");
const json = hasFlag("--json");
const strict = hasFlag("--strict");
const out = getArg("--out");
const WINDOW_DEFAULT = 30;
const windowSize = Math.max(1, Number.parseInt(getArg("--window", String(WINDOW_DEFAULT)), 10) || WINDOW_DEFAULT);
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
  const patterns = [
    /结论[：:]\s*\**\s*(修改后通过|不通过|通过)/,
    /\|\s*结论\s*\|\s*\**\s*(修改后通过|不通过|通过)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function countOf(label, text) {
  const equal = text.match(new RegExp(`${label}\\s*[=:：]\\s*(\\d+)`, "i"));
  if (equal) return Number.parseInt(equal[1], 10);
  const table = text.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*(\\d+)`, "i"));
  if (table) return Number.parseInt(table[1], 10);
  const markers = text.match(new RegExp(`^\\s*[-*]\\s*\\[${label}(?:-\\d+)?\\]`, "gmi"));
  return markers ? markers.length : null;
}

function taskIdOf(text) {
  const head = text.split(/\r?\n/).slice(0, 30).join("\n");
  const match = head.match(/\bTASK-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/);
  return match ? match[0] : null;
}

/**
 * 1.16.0：一份 review 可以同时审多个任务（如 `REV-0058 — TASK-0263-R1 + TASK-0264`）。
 * 只从标题区（前 3 行）取全部任务 ID：多任务报告会在标题里同时列出；
 * 正文/被审单里的历史任务引用不算本次归属，避免过度归因。
 */
function taskIdsOf(text) {
  const head = text.split(/\r?\n/).slice(0, 3).join("\n");
  const ids = [];
  for (const match of head.matchAll(/\bTASK-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g)) {
    if (!ids.includes(match[0])) ids.push(match[0]);
  }
  if (ids.length > 0) return ids.slice(0, 3);
  const fallback = text.split(/\r?\n/).slice(0, 30).join("\n").match(/\bTASK-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/);
  return fallback ? [fallback[0]] : [];
}

function baseTaskId(id) {
  return id.replace(/-R\d+$/, "");
}

function roundOf(file, text, taskId) {
  const base = path.basename(file);
  const fullToken = taskId.replace(/^TASK-/, "");
  const baseToken = baseTaskId(taskId).replace(/^TASK-/, "");
  // 1.16.0：只在 `TASK-<id>` 之后找 -R<n>，避免把评审编号（REV-0013-R1）误当成任务轮次。
  for (const token of [fullToken, baseToken]) {
    const matched = base.match(new RegExp(`TASK-${escapeRegex(token)}(?:-R(\\d+))?`, "i"));
    if (matched) return matched[1] ? 1 + Number.parseInt(matched[1], 10) : 1;
  }
  const fromText = text.match(/(?:第\s*|轮次[：:]\s*R?)(\d+)\s*轮/i);
  return fromText ? Number.parseInt(fromText[1], 10) : 1;
}

function parseEvidenceFile(file, phase) {
  const text = readText(file);
  const ids = taskIdsOf(text);
  const id = ids[0] || taskIdOf(text);
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
    taskIds: ids.length > 0 ? ids : [id],
    baseTaskId: baseTaskId(id),
    round: roundOf(file, text, id),
    roundById: Object.fromEntries((ids.length > 0 ? ids : [id]).map((taskId) => [taskId, roundOf(file, text, taskId)])),
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
const evidenceByKey = new Map();
for (const item of evidenceFiles) {
  const parsed = parseEvidenceFile(item.file, item.phase);
  if (!parsed) continue;
  const ids = parsed.taskIds && parsed.taskIds.length > 0 ? parsed.taskIds : [parsed.taskId];
  for (const id of ids) {
    const base = baseTaskId(id);
    const entry = {
      ...parsed,
      taskId: id,
      baseTaskId: base,
      round: parsed.roundById && parsed.roundById[id] ? parsed.roundById[id] : parsed.round,
    };
    // 同一文件同一父任务只保留一条：优先父任务 ID，避免“TASK-0013 + TASK-0013-R1”
    // 在同一标题里出现时被算成两轮 review。
    const key = `${parsed.file}::${base}`;
    const existing = evidenceByKey.get(key);
    if (!existing || (entry.taskId === base && existing.taskId !== base)) evidenceByKey.set(key, entry);
  }
}
evidence.push(...evidenceByKey.values());

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

const implementationTaskIds = new Set(implementation.map((task) => task.id));
const fixTaskIds = new Set(
  tasks
    .filter((task) => /-R\d+$/.test(task.id)
      && implementationTaskIds.has(baseTaskId(task.id))
      && /engineer/i.test(task.owner)
      && !/qa|review|security|devops|writer/i.test(task.owner))
    .map((task) => baseTaskId(task.id)),
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
  const firstVerified = Boolean(first && first.conclusion && first.p0 !== null && first.p1 !== null);
  const firstPass = Boolean(
    firstVerified
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
    first_verified: firstVerified,
    first_pass: firstPass,
    p1_findings: p1Findings,
    p1_escapes: p1Escapes,
    blocked,
    has_fix_task: hasFix,
    review_ready: reviews.length > 0,
  };
});

const reviewed = taskRows.filter((row) => row.review_ready);
const verified = reviewed.filter((row) => row.first_verified);
const unverified = reviewed.filter((row) => !row.first_verified);
const firstPass = taskRows.filter((row) => row.first_pass);
const firstPassRate = verified.length ? firstPass.length / verified.length : null;
const firstPassRateAll = reviewed.length ? firstPass.length / reviewed.length : null;
const reviewReadyRate = taskRows.length ? reviewed.length / taskRows.length : null;
const completedRows = taskRows.filter((row) => /^(done|review|qa)/i.test(row.status));
const completedReviewed = completedRows.filter((row) => row.review_ready);
const reviewReadyRateDone = completedRows.length ? completedReviewed.length / completedRows.length : null;
const windowRows = completedRows.slice(-windowSize);
const windowReviewed = windowRows.filter((row) => row.review_ready);
const windowVerified = windowReviewed.filter((row) => row.first_verified);
const windowFirstPass = windowReviewed.filter((row) => row.first_pass);
const windowFirstPassRate = windowVerified.length ? windowFirstPass.length / windowVerified.length : null;
const windowReviewReadyRate = windowRows.length ? windowReviewed.length / windowRows.length : null;
const windowRoundsAvg = windowReviewed.length
  ? windowReviewed.reduce((sum, row) => sum + row.rounds, 0) / windowReviewed.length
  : null;
const reviewRoundsAvg = reviewed.length
  ? reviewed.reduce((sum, row) => sum + row.rounds, 0) / reviewed.length
  : null;
const p1Findings = [...new Map(evidence.map((item) => [item.file, item])).values()]
  .reduce((sum, item) => sum + (item.p1 || 0), 0);
const p1Escapes = taskRows.reduce((sum, row) => sum + row.p1_escapes, 0);
const attributedFiles = new Set(
  evidence.filter((item) => implementationTaskIds.has(item.baseTaskId)).map((item) => item.file),
);
const p1Unattributed = [...new Map(evidence.map((item) => [item.file, item])).values()]
  .filter((item) => !attributedFiles.has(item.file))
  .reduce((sum, item) => sum + (item.p1 || 0), 0);

const isTeamSource = fs.existsSync(path.join(project, "team-manifest.json"))
  && fs.existsSync(path.join(aiTeam, "team", "GROWTH.md"));

/**
 * 交付面覆盖摘要（1.15.0）：只读运行页面/端点覆盖脚本，供趋势报告使用。
 * 没有 map 时返回 null；脚本失败也返回已解析的 JSON，不阻断质量报告。
 */
function surfaceMetrics() {
  const scripts = path.dirname(fileURLToPath(import.meta.url));
  const pageMap = path.join(project, ".ai-team", "design", "ux", "PAGE-MAP.json");
  const endpointMap = path.join(project, ".ai-team", "design", "architecture", "ENDPOINT-MAP.json");
  const run = (script, file) => {
    if (!fs.existsSync(file)) return null;
    const result = spawnSync(process.execPath, [path.join(scripts, script), "--project", project, "--json"], {
      cwd: project,
      encoding: "utf8",
      timeout: 20000,
    });
    if (!result.stdout) return null;
    try {
      return JSON.parse(result.stdout);
    } catch {
      return null;
    }
  };
  const pages = run("page-coverage-check.mjs", pageMap);
  const endpoints = run("endpoint-coverage-check.mjs", endpointMap);
  const pageSummary = pages?.summary || null;
  const endpointSummary = endpoints?.summary || null;
  return {
    pages: pageSummary ? {
      current_milestone: pageSummary.current_milestone,
      total: pageSummary.due?.total ?? pageSummary.total,
      real: pageSummary.due?.real ?? pageSummary.real,
      rate: pageSummary.due?.rate ?? pageSummary.rate,
      p0_total: pageSummary.due?.p0_total ?? pageSummary.p0_total,
      p0_real: pageSummary.due?.p0_real ?? pageSummary.p0_real,
      p0_rate: pageSummary.due?.p0_rate ?? pageSummary.p0_rate,
    } : null,
    endpoints: endpointSummary ? {
      total: endpointSummary.contract_endpoints,
      implemented: endpointSummary.implemented,
      deferred: endpointSummary.deferred,
      covered: endpointSummary.covered,
      rate: endpointSummary.coverage_rate,
    } : null,
    errors: [...(pages?.errors || []), ...(endpoints?.errors || [])],
    warnings: [...(pages?.warnings || []), ...(endpoints?.warnings || [])],
  };
}

const summary = {
  mode: isTeamSource ? "team-source" : "project",
  implementation_tasks: taskRows.length,
  reviewed_tasks: reviewed.length,
  verified_reviewed_tasks: verified.length,
  first_pass_unverified: unverified.length,
  first_pass_tasks: firstPass.length,
  first_pass_rate: firstPassRate,
  first_pass_pct: firstPassRate === null ? null : `${(firstPassRate * 100).toFixed(1)}%`,
  first_pass_rate_all: firstPassRateAll,
  first_pass_pct_all: firstPassRateAll === null ? null : `${(firstPassRateAll * 100).toFixed(1)}%`,
  review_ready_rate: reviewReadyRate,
  review_ready_pct: reviewReadyRate === null ? null : `${(reviewReadyRate * 100).toFixed(1)}%`,
  review_ready_rate_done: reviewReadyRateDone,
  review_ready_done_pct: reviewReadyRateDone === null ? null : `${(reviewReadyRateDone * 100).toFixed(1)}%`,
  window_size: windowSize,
  window_tasks: windowRows.length,
  window_reviewed_tasks: windowReviewed.length,
  window_first_pass_tasks: windowFirstPass.length,
  window_first_pass_unverified: windowReviewed.length - windowVerified.length,
  window_first_pass_rate: windowFirstPassRate,
  window_first_pass_pct: windowFirstPassRate === null ? null : `${(windowFirstPassRate * 100).toFixed(1)}%`,
  window_review_ready_rate: windowReviewReadyRate,
  window_review_ready_pct: windowReviewReadyRate === null ? null : `${(windowReviewReadyRate * 100).toFixed(1)}%`,
  window_review_rounds_avg: windowRoundsAvg,
  review_rounds_avg: reviewRoundsAvg,
  p1_findings: p1Findings,
  p1_escapes: p1Escapes,
  p1_unattributed: p1Unattributed,
};

const surface = surfaceMetrics();
Object.assign(summary, {
  surface_pages_present: Boolean(surface.pages),
  surface_pages_milestone: surface.pages?.current_milestone ?? null,
  surface_pages_total: surface.pages?.total ?? null,
  surface_pages_real: surface.pages?.real ?? null,
  surface_pages_pct: surface.pages?.rate === null || surface.pages?.rate === undefined ? null : `${(surface.pages.rate * 100).toFixed(1)}%`,
  surface_p0_total: surface.pages?.p0_total ?? null,
  surface_p0_real: surface.pages?.p0_real ?? null,
  surface_p0_pct: surface.pages?.p0_rate === null || surface.pages?.p0_rate === undefined ? null : `${(surface.pages.p0_rate * 100).toFixed(1)}%`,
  surface_endpoints_present: Boolean(surface.endpoints),
  surface_endpoints_total: surface.endpoints?.total ?? null,
  surface_endpoints_implemented: surface.endpoints?.implemented ?? null,
  surface_endpoints_deferred: surface.endpoints?.deferred ?? null,
  surface_endpoints_pct: surface.endpoints?.rate === null || surface.endpoints?.rate === undefined ? null : `${(surface.endpoints.rate * 100).toFixed(1)}%`,
  surface_ok: surface.errors.length === 0,
});
for (const warning of surface.warnings) warn("surface-warning", warning);

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
      "一次通过率分母 = 已进入 review 且首审结论/P0/P1 可解析的实现任务；缺失结论或 P0/P1 的任务单列 unverified，不默认算失败。",
      "首审结论同时支持 `结论：通过` 和 Markdown 表格 `| 结论 | 通过 |`；review 任务（如 TASK-XXXX-R1，owner=code-reviewer）不再计为父任务的 fix task。",
      "review-ready 同时给全量、done/review 口径和最近 N 个完成/审查任务窗口；目标 10/30 任务应看窗口值。",
      "P1 escapes = 首轮之后 review 轮次或 security/QA 中的 P1 数；为代理指标，需人工复核。",
      "P1 findings 含未能归属到实现任务的 P1；p1_unattributed 单独列出，避免与 escapes 混淆。",
      "页面/端点覆盖来自项目维护的 PAGE-MAP.json / ENDPOINT-MAP.json；缺失时只给 warning，不默认算 0 或 100。",
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
  lines.push(`| First-pass unverified | ${summary.first_pass_unverified} |`);
  lines.push(`| First-pass rate (verified) | ${summary.first_pass_pct ?? "n/a"} |`);
  lines.push(`| First-pass rate (all reviewed) | ${summary.first_pass_pct_all ?? "n/a"} |`);
  lines.push(`| Review-ready rate (all) | ${summary.review_ready_pct ?? "n/a"} |`);
  lines.push(`| Review-ready rate (done/review) | ${summary.review_ready_done_pct ?? "n/a"} |`);
  lines.push(`| Window ${summary.window_size} first-pass | ${summary.window_first_pass_pct ?? "n/a"} |`);
  lines.push(`| Window ${summary.window_size} review-ready | ${summary.window_review_ready_pct ?? "n/a"} |`);
  lines.push(`| Average review rounds | ${summary.review_rounds_avg === null ? "n/a" : summary.review_rounds_avg.toFixed(2)} |`);
  lines.push(`| P1 findings | ${summary.p1_findings} |`);
  lines.push(`| P1 escapes | ${summary.p1_escapes} |`);
  lines.push(`| P1 unattributed | ${summary.p1_unattributed} |`);
  if (summary.surface_pages_present) {
    lines.push(`| Page coverage (${summary.surface_pages_milestone || "-"}) | ${summary.surface_pages_real}/${summary.surface_pages_total} (${summary.surface_pages_pct}) |`);
    lines.push(`| P0 page coverage (${summary.surface_pages_milestone || "-"}) | ${summary.surface_p0_real}/${summary.surface_p0_total} (${summary.surface_p0_pct}) |`);
  }
  if (summary.surface_endpoints_present) {
    lines.push(`| Endpoint coverage | ${summary.surface_endpoints_implemented} implemented + ${summary.surface_endpoints_deferred} deferred / ${summary.surface_endpoints_total} (${summary.surface_endpoints_pct}) |`);
  }
  lines.push("");
  lines.push("## Tasks");
  lines.push("");
  lines.push("| Task | Owner | Status | Reviews | Rounds | First conclusion | Verified | First pass | P1 findings | P1 escapes |");
  lines.push("|---|---|---|---:|---:|---|---|---|---:|---:|");
  for (const row of taskRows) {
    lines.push(`| ${mdCell(row.id)} | ${mdCell(row.owner || "-")} | ${mdCell(row.status || "-")} | ${row.reviews} | ${row.rounds} | ${mdCell(row.first_conclusion || "-")} | ${row.first_verified ? "yes" : "no"} | ${row.first_pass ? "yes" : "no"} | ${row.p1_findings} | ${row.p1_escapes} |`);
  }
  if (taskRows.length === 0) lines.push("| - | - | - | 0 | 0 | - | no | no | 0 | 0 |");
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
