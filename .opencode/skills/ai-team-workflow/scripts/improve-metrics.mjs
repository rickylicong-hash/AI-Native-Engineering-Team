#!/usr/bin/env node
/**
 * `/ai-improve` 历史指标与成长曲线（1.14.0）。
 *
 * 采集当前项目指标，与 `.ai-team/team/IMPROVEMENT-HISTORY.json` 的上一轮比较：
 *   - 质量：first-pass / review-ready / rounds / P1 findings / escapes
 *   - 债务：team open / project open / done proposals
 *   - 交付：tasks done/total、review/security 报告数
 *   - 会话（可选）：sessions/messages/tool calls/errors/permission denied
 *
 * 负成长判定：关键指标恶化超过阈值（first-pass/review-ready 下降 >5pp、
 * team open 上升、P1 escapes 上升、review rounds 上升 >0.25）。
 *
 * 用法：
 *   node improve-metrics.mjs --project . --json
 *   node improve-metrics.mjs --project . --write
 *   node improve-metrics.mjs --project . --no-sessions --json
 *
 * 退出码：0 采集完成（即使 negativeGrowth=true）；1 参数/读取错误；2 项目错误。
 */

import fs from "node:fs";
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
  console.log("Usage: node improve-metrics.mjs [--project DIR] [--history FILE] [--json] [--write] [--no-sessions] [--fail-on-negative]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const historyFile = path.resolve(project, getArg("--history", path.join(".ai-team", "team", "IMPROVEMENT-HISTORY.json")));
const json = hasFlag("--json");
const write = hasFlag("--write");
const noSessions = hasFlag("--no-sessions");
const failOnNegative = hasFlag("--fail-on-negative");

if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  console.error(`ERROR  project not found: ${project}`);
  process.exit(2);
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const node = process.execPath;

function run(script, runArgs) {
  const result = spawnSync(node, [path.join(dir, script), ...runArgs], {
    cwd: project,
    encoding: "utf8",
    timeout: 120000,
  });
  if (result.status !== 0) return { ok: false, status: result.status, error: (result.stderr || result.stdout || "").trim(), data: null };
  try {
    return { ok: true, status: 0, data: JSON.parse(result.stdout || "") };
  } catch (error) {
    return { ok: false, status: result.status, error: `cannot parse ${script} output: ${error.message}`, data: null };
  }
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function countTasks() {
  const file = path.join(project, ".ai-team", "state", "TASKS.md");
  if (!fs.existsSync(file)) return { done: 0, total: 0 };
  let done = 0;
  let total = 0;
  for (const line of readText(file).split(/\r?\n/)) {
    if (!/^\|\s*TASK-/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const status = (cells[5] || "").toLowerCase();
    total += 1;
    if (/^done\b/.test(status)) done += 1;
  }
  return { done, total };
}

function countFiles(relative, pattern) {
  const root = path.join(project, relative);
  if (!fs.existsSync(root)) return 0;
  return fs.readdirSync(root).filter((name) => pattern.test(name)).length;
}

const warnings = [];
const quality = run("quality-report.mjs", ["--project", project, "--json"]);
if (!quality.ok) warnings.push(`quality-report: ${quality.error}`);
const growth = run("growth-check.mjs", ["--project", project, "--json", "--debt"]);
if (!growth.ok) warnings.push(`growth-check: ${growth.error}`);
const sessions = noSessions ? { ok: true, data: null } : run("improve-scan.mjs", ["--project", project, "--json"]);
if (!sessions.ok) warnings.push(`improve-scan: ${sessions.error}`);

const q = quality.data?.summary || quality.data || {};
const g = growth.data || {};
const s = sessions.data?.sessions || null;
const tasks = countTasks();

const current = {
  teamOpen: Number.isFinite(Number(g.teamOpen)) ? Number(g.teamOpen) : null,
  projectOpen: Number.isFinite(Number(g.projectOpen)) ? Number(g.projectOpen) : null,
  openTotal: Number.isFinite(Number(g.openAll)) ? Number(g.openAll) : null,
  proposalsDone: Number.isFinite(Number(g.done)) ? Number(g.done) : null,
  firstPassRate: typeof q.first_pass_rate === "number" ? q.first_pass_rate : null,
  reviewReadyRate: typeof q.review_ready_rate === "number" ? q.review_ready_rate : null,
  reviewRoundsAvg: typeof q.review_rounds_avg === "number" ? q.review_rounds_avg : null,
  p1Findings: Number.isFinite(Number(q.p1_findings)) ? Number(q.p1_findings) : null,
  p1Escapes: Number.isFinite(Number(q.p1_escapes)) ? Number(q.p1_escapes) : null,
  tasksDone: tasks.done,
  tasksTotal: tasks.total,
  reviews: countFiles(path.join(".ai-team", "reviews"), /^REV-.*\.md$/i),
  securityReports: countFiles(path.join(".ai-team", "security"), /^SEC-.*\.md$/i),
  sessions: s ? s.total ?? null : null,
  messages: s ? s.messages ?? null : null,
  toolCalls: s ? s.toolCalls ?? null : null,
  toolErrors: s ? s.toolErrors ?? null : null,
  permissionDenied: s ? s.permissionDenied ?? null : null,
};

let history = { schema: 1, project, entries: [] };
if (fs.existsSync(historyFile)) {
  try {
    history = JSON.parse(readText(historyFile));
    if (!Array.isArray(history.entries)) history.entries = [];
  } catch (error) {
    warnings.push(`history parse failed: ${error.message}; starting a new history`);
    history = { schema: 1, project, entries: [] };
  }
}

const previous = history.entries.length > 0 ? history.entries[history.entries.length - 1] : null;
const METRICS = [
  { key: "teamOpen", label: "团队 open", direction: "lower", negativeDelta: 1, format: "int" },
  { key: "projectOpen", label: "项目 open", direction: "lower", negativeDelta: 1, format: "int" },
  { key: "firstPassRate", label: "一次通过率", direction: "higher", negativeDelta: 0.05, format: "pct" },
  { key: "reviewReadyRate", label: "review-ready", direction: "higher", negativeDelta: 0.05, format: "pct" },
  { key: "reviewRoundsAvg", label: "审查轮次", direction: "lower", negativeDelta: 0.25, format: "num" },
  { key: "p1Escapes", label: "P1 escapes", direction: "lower", negativeDelta: 1, format: "int" },
  { key: "p1Findings", label: "P1 findings", direction: "lower", negativeDelta: 5, format: "int" },
  { key: "tasksDone", label: "done 任务", direction: "higher", negativeDelta: 5, format: "int" },
  { key: "reviews", label: "review 报告", direction: "higher", negativeDelta: 3, format: "int" },
];

const comparisons = [];
if (previous) {
  for (const metric of METRICS) {
    const before = previous.metrics?.[metric.key];
    const after = current[metric.key];
    if (before === null || before === undefined || after === null || after === undefined) continue;
    const delta = after - before;
    const improved = metric.direction === "higher" ? delta > 0 : delta < 0;
    const declined = metric.direction === "higher" ? delta < 0 : delta > 0;
    const significant = Math.abs(delta) >= metric.negativeDelta;
    comparisons.push({
      key: metric.key,
      label: metric.label,
      before,
      after,
      delta,
      status: improved && significant ? "improved" : declined && significant ? "declined" : "flat",
      direction: metric.direction,
      format: metric.format,
    });
  }
}
const improved = comparisons.filter((item) => item.status === "improved");
const declined = comparisons.filter((item) => item.status === "declined");
const negativeGrowth = declined.length > 0;
const verdict = !previous ? "first-run" : negativeGrowth ? "declining" : improved.length >= 2 ? "improving" : "stable";
const growthScore = improved.length - declined.length;

const snapshot = {
  recordedAt: new Date().toISOString(),
  date: new Date().toISOString().slice(0, 10),
  metrics: current,
  verdict,
  growthScore,
  negativeGrowth,
  warningCount: warnings.length,
};

if (write) {
  history.entries.push(snapshot);
  history.project = project;
  history.updated = snapshot.recordedAt;
  fs.mkdirSync(path.dirname(historyFile), { recursive: true });
  fs.writeFileSync(historyFile, `${JSON.stringify(history, null, 2)}\n`, "utf8");
}

const curve = history.entries.slice(-8).map((entry) => ({
  date: entry.date,
  firstPassRate: entry.metrics?.firstPassRate ?? null,
  reviewReadyRate: entry.metrics?.reviewReadyRate ?? null,
  teamOpen: entry.metrics?.teamOpen ?? null,
  projectOpen: entry.metrics?.projectOpen ?? null,
  reviewRoundsAvg: entry.metrics?.reviewRoundsAvg ?? null,
  p1Escapes: entry.metrics?.p1Escapes ?? null,
  tasksDone: entry.metrics?.tasksDone ?? null,
}));

const result = {
  ok: true,
  project,
  historyFile,
  entries: history.entries.length,
  previous: previous ? { date: previous.date, metrics: previous.metrics } : null,
  current,
  comparisons,
  improved: improved.map((item) => item.key),
  declined: declined.map((item) => item.key),
  negativeGrowth,
  verdict,
  growthScore,
  curve,
  warnings,
  written: write,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team improvement metrics");
  console.log(`project: ${project}`);
  console.log(`history: ${historyFile} (${history.entries.length} entries)`);
  if (curve.length > 0) {
    console.log("date        first-pass  review-ready  teamOpen  projectOpen  rounds  p1Escapes  tasksDone");
    for (const row of curve) {
      const pct = (value) => (typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "-");
      console.log(`${row.date}  ${pct(row.firstPassRate).padEnd(10)}  ${pct(row.reviewReadyRate).padEnd(12)}  ${String(row.teamOpen ?? "-").padEnd(8)}  ${String(row.projectOpen ?? "-").padEnd(11)}  ${String(row.reviewRoundsAvg ?? "-").padEnd(6)}  ${String(row.p1Escapes ?? "-").padEnd(9)}  ${row.tasksDone ?? "-"}`);
    }
  }
  if (previous) {
    console.log(`growth: ${verdict} (${growthScore >= 0 ? "+" : ""}${growthScore})`);
    for (const item of comparisons) {
      const fmt = (value) => (item.format === "pct" && typeof value === "number" ? `${(value * 100).toFixed(1)}%` : String(value));
      console.log(`  ${item.status.padEnd(8)} ${item.label}: ${fmt(item.before)} -> ${fmt(item.after)}`);
    }
  } else {
    console.log("growth: first-run (history recorded; next run will compare)");
  }
  console.log(`negativeGrowth: ${negativeGrowth}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);
}
process.exit(failOnNegative && negativeGrowth ? 1 : 0);
