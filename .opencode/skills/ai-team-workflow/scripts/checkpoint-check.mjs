#!/usr/bin/env node
/**
 * 检查是否需要 AI Team checkpoint 提交。
 *
 * 只读检查：不会执行 git add/commit。到期时应由 Chief 调度
 * ai-team/devops-engineer 做精选提交，Chief 自己不得提交。
 *
 * 同时扫描根目录临时产物与证据编码；artifact error 会使 checkpoint 到期，
 * 并让 --mark 拒绝。--strict 还会把 artifact warning 视为到期。
 *
 * 用法：
 *   node checkpoint-check.mjs [--project <dir>] [--json] [--quiet] [--strict]
 *   node checkpoint-check.mjs --handoff          # 交接前强制检查
 *   node checkpoint-check.mjs --mark             # 提交成功后记录基线
 *   node checkpoint-check.mjs --max-files 20     # 自定义文件阈值
 *
 * 退出码：
 *   0 = 未到期
 *   1 = 到期
 *   2 = 不是 git 仓库
 *   3 = 参数/读取/标记失败
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { checkArtifacts } from "./artifact-check.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

const project = path.resolve(getArg("--project", process.cwd()).replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const json = hasFlag("--json");
const quiet = hasFlag("--quiet");
const handoff = hasFlag("--handoff");
const mark = hasFlag("--mark");
const force = hasFlag("--force");
const strict = hasFlag("--strict");
const maxFiles = Number.parseInt(getArg("--max-files", "20"), 10) || 20;

const stateDir = path.join(project, ".ai-team", "state");
const tasksFile = path.join(stateDir, "TASKS.md");
const statusFile = path.join(stateDir, "STATUS.md");
const checkpointFile = path.join(stateDir, "CHECKPOINT.json");

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function git(gitArgs) {
  return spawnSync("git", gitArgs, { cwd: project, encoding: "utf8" });
}

function countDone(text) {
  let done = 0;
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*TASK-[A-Za-z0-9-]+\s*\|/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 7) continue;
    const id = cells[1];
    const status = cells[5] || "";
    if (!/^done\b/i.test(status)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    done++;
  }
  return done;
}

function detectStage() {
  if (!fs.existsSync(statusFile)) return "unknown";
  const match = read(statusFile).match(/^-\s*Stage:\s*([^\r\n]+)/m);
  if (!match) return "unknown";
  const stage = match[1].match(/G[0-8]/);
  return stage ? stage[0] : "unknown";
}

function auditHead() {
  const show = git(["show", "--pretty=format:", "--name-only", "HEAD"]);
  if (show.status !== 0) return [];
  const files = show.stdout.split(/\r?\n/).filter(Boolean);
  const violations = [];
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    const rawEvidence = /^\.ai-team\/work\/.*\.(txt|log)$/.test(normalized)
      || /^\.ai-team\/work\/.*-logs\//.test(normalized)
      || /^\.ai-team\/(?:.*\/)?(?:tmp|screenshots)\//.test(normalized);
    const secret = /(^|\/)\.env($|\.)/.test(normalized) && !/\.env\.(example|sample|template)$/.test(normalized)
      || /\.(pem|key|p12|jks)$/.test(normalized);
    const build = /(^|\/)(node_modules|target|dist)\//.test(normalized);
    if (rawEvidence || secret || build) violations.push(normalized);
  }
  return [...new Set(violations)];
}

if (!fs.existsSync(tasksFile)) {
  const message = `not an AI Team project: missing ${tasksFile}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(3);
}

const inside = git(["rev-parse", "--is-inside-work-tree"]);
if (inside.status !== 0 || inside.stdout.trim() !== "true") {
  const message = `not a git repository: ${project}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(2);
}

const status = git(["status", "--porcelain"]);
if (status.status !== 0) {
  const message = `git status failed: ${status.stderr.trim()}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(3);
}

const lines = status.stdout.split(/\r?\n/).filter(Boolean);
const changed = lines.length;
const untracked = lines.filter((line) => line.startsWith("??")).length;
const modified = changed - untracked;
const done = countDone(read(tasksFile));
const stage = detectStage();

let checkpoint = {};
let warning = "";
if (fs.existsSync(checkpointFile)) {
  try {
    checkpoint = JSON.parse(read(checkpointFile));
  } catch {
    warning = "CHECKPOINT.json 无法解析，按从未 checkpoint 处理";
  }
}
const parsedLast = Number.parseInt(checkpoint.tasks_at_last_checkpoint ?? "0", 10);
const last = Number.isFinite(parsedLast) ? parsedLast : 0;
const lastAt = checkpoint.last_checkpoint_at || "never";
const lastCommit = checkpoint.last_checkpoint_commit || "";

const head = git(["rev-parse", "--short", "HEAD"]);
const headCommit = head.status === 0 ? head.stdout.trim() : "(no commits)";
const branchResult = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const branch = branchResult.status === 0 ? branchResult.stdout.trim() : "unknown";
const headViolations = head.status === 0 ? auditHead() : [];

// P-15/P-17：被 .gitignore 忽略的日志不会被 git status 看到，必须单独扫描根目录。
let artifactResult = { errors: [], warnings: [], scanned: 0, truncated: false };
let artifactReadError = "";
try {
  artifactResult = checkArtifacts(project);
} catch (error) {
  artifactReadError = `artifact check failed: ${error.message}`;
}
const artifactErrors = artifactResult.errors;
const artifactWarnings = artifactResult.warnings;

const reasons = [];
if (changed > 0) {
  if (handoff) reasons.push("handoff");
  if (["G5", "G7", "G8"].includes(stage)) reasons.push(`gate-${stage}`);
  if (changed >= maxFiles) reasons.push(`files-${changed}`);
  // 任务计数只在项目已有 checkpoint 基线后启用，避免老项目因缺少
  // CHECKPOINT.json 被误判为“从未提交”。
  if (fs.existsSync(checkpointFile) && done - last >= 10) reasons.push(`tasks-${done}-last-${last}`);
}
if (headViolations.length > 0) reasons.push("head-noncompliant");
if (artifactErrors.length > 0) reasons.push(`artifacts-${artifactErrors.length}`);
if (strict && artifactWarnings.length > 0) reasons.push(`artifact-warnings-${artifactWarnings.length}`);
if (force) reasons.push("forced");

if (mark) {
  if (changed > 0) {
    const message = `working tree is not clean (${changed} files); commit first, then run --mark`;
    if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  if (headViolations.length > 0) {
    const message = `HEAD ${headCommit} contains ${headViolations.length} forbidden path(s); do not mark it as a clean baseline:\n- ${headViolations.join("\n- ")}`;
    if (json) console.log(JSON.stringify({ ok: false, error: message, violations: headViolations }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  if (artifactErrors.length > 0) {
    const message = `working tree has ${artifactErrors.length} artifact hygiene error(s); clean them before marking a checkpoint:\n- ${artifactErrors.slice(0, 10).map((issue) => `${issue.code}: ${issue.path}`).join("\n- ")}`;
    if (json) console.log(JSON.stringify({ ok: false, error: message, artifacts: artifactResult }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  if (strict && artifactWarnings.length > 0) {
    const message = `working tree has ${artifactWarnings.length} artifact warning(s) under --strict; fix or omit --strict only with a documented risk`;
    if (json) console.log(JSON.stringify({ ok: false, error: message, artifacts: artifactResult }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  const payload = {
    last_checkpoint_at: new Date().toISOString(),
    last_checkpoint_commit: headCommit,
    tasks_at_last_checkpoint: done,
    updated: new Date().toISOString().slice(0, 10),
  };
  const next = [
    `HANDOFF Git/Baseline = ${headCommit}`,
    `STATUS Checkpoint = ${headCommit} (done ${done})`,
    "commit the doc-only sync, then run state-check",
  ];
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(checkpointFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  if (json) console.log(JSON.stringify({ ok: true, marked: payload, next }, null, 2));
  else if (!quiet) {
    console.log(`MARKED  ${path.relative(project, checkpointFile)} (${headCommit}, done ${done})`);
    console.log("NEXT:");
    for (const step of next) console.log(`  - ${step}`);
  }
  process.exit(0);
}

const due = reasons.length > 0;
if (json) {
  console.log(JSON.stringify({
    ok: true,
    due,
    reasons,
    changed,
    modified,
    untracked,
    maxFiles,
    done,
    last,
    lastAt,
    lastCommit,
    head: headCommit,
    branch,
    stage,
    checkpoint: fs.existsSync(checkpointFile) ? path.relative(project, checkpointFile).replace(/\\/g, "/") : null,
    headViolations,
    strict,
    artifacts: {
      errors: artifactErrors,
      warnings: artifactWarnings,
      scanned: artifactResult.scanned,
      truncated: artifactResult.truncated,
      readError: artifactReadError,
    },
    warnings: warning ? [warning] : [],
  }, null, 2));
} else if (!quiet) {
  console.log("AI Team checkpoint check");
  console.log(`project:  ${project}`);
  console.log(`branch:   ${branch} @ ${headCommit}`);
  console.log(`stage:    ${stage}`);
  console.log(`tasks:    done ${done}, last checkpoint ${last} (${lastAt}${lastCommit ? ` @ ${lastCommit}` : ""})`);
  console.log(`changed:  ${changed} files (modified ${modified}, untracked ${untracked})`);
  console.log(`artifacts: ${artifactErrors.length} error(s), ${artifactWarnings.length} warning(s), ${artifactResult.scanned} evidence file(s) scanned`);
  if (artifactReadError) console.log(`warning:  ${artifactReadError}`);
  for (const issue of artifactErrors.slice(0, 5)) {
    console.log(`  ERROR [${issue.code}] ${issue.path}: ${issue.message}; ${issue.suggestion}`);
  }
  if (artifactErrors.length > 5) console.log(`  ... and ${artifactErrors.length - 5} more artifact error(s)`);
  for (const issue of artifactWarnings.slice(0, 3)) {
    console.log(`  WARN  [${issue.code}] ${issue.path}: ${issue.message}`);
  }
  if (artifactWarnings.length > 3) console.log(`  ... and ${artifactWarnings.length - 3} more artifact warning(s)`);
  console.log(`due:      ${due ? "YES" : "no"}${due ? ` (${reasons.join(", ")})` : ""}`);
  if (warning) console.log(`warning:  ${warning}`);
  if (headViolations.length > 0) {
    console.log(`warning:  HEAD ${headCommit} contains ${headViolations.length} forbidden path(s) (raw logs, secrets, build output); --mark will refuse it:`);
    for (const file of headViolations.slice(0, 10)) console.log(`          - ${file}`);
    if (headViolations.length > 10) console.log(`          ... and ${headViolations.length - 10} more`);
  }
  if (due) {
    console.log("action:   dispatch ai-team/devops-engineer for a curated checkpoint;");
    console.log("          Chief must NOT run git add/commit. Push still needs user approval.");
  } else {
    console.log(`action:   none; next file threshold ${maxFiles}, next task threshold ${fs.existsSync(checkpointFile) ? last + 10 : "after first checkpoint"}`);
  }
}

process.exit(due ? 1 : 0);
