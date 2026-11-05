#!/usr/bin/env node
/**
 * 复盘到期检查。
 *
 * 统计 `.ai-team/state/TASKS.md` 中状态以 done 开头的任务数，与
 * `.ai-team/team/GROWTH.md` frontmatter 里的 tasks_at_last_retro 比较，
 * 判断是否该做复盘。
 *
 * 用法：
 *   node retro-check.mjs [--project <dir>] [--json] [--quiet] [--incident]
 *
 * 退出码：
 *   0 = 未到期
 *   1 = 到期
 *   2 = 没有 .ai-team/state/TASKS.md
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

const project = path.resolve(getArg("--project", process.cwd()).replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const json = hasFlag("--json");
const quiet = hasFlag("--quiet");
const incident = hasFlag("--incident");
const reasonArg = getArg("--reason", "");

const stateDir = path.join(project, ".ai-team", "state");
const tasksFile = path.join(stateDir, "TASKS.md");
const statusFile = path.join(stateDir, "STATUS.md");
const projectFile = path.join(stateDir, "PROJECT.md");
const growthFile = path.join(project, ".ai-team", "team", "GROWTH.md");

const CADENCE = 10;
const GATE_RANK = { G0: 0, G1: 1, G2: 2, G3: 3, G4: 4, G5: 5, G6: 6, G7: 7, G8: 8 };
const MAJOR_GATES = ["G5", "G7", "G8"];

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const raw = m[2].trim();
    data[m[1]] = raw.replace(/^["']|["']$/g, "");
  }
  return data;
}

function detectTrackStage() {
  let track = "";
  let stage = "";
  let projectStage = "";

  if (fs.existsSync(projectFile)) {
    const fm = frontmatter(read(projectFile));
    track = fm.track || "";
    projectStage = fm.stage || "";
  }

  // STATUS.md 是会话内最新状态，优先于 PROJECT.md frontmatter。
  if (fs.existsSync(statusFile)) {
    const text = read(statusFile);
    const trackMatch = text.match(/^-\s*Track:\s*(\S+)/m);
    const stageMatch = text.match(/^-\s*Stage:\s*([^\r\n]+)/m);
    if (trackMatch) track = trackMatch[1].trim();
    if (stageMatch) stage = stageMatch[1].trim();
  }

  if (!stage) stage = projectStage;
  const stageMatch = stage.match(/G[0-8]/);
  return {
    track: track || "unknown",
    stage: stageMatch ? stageMatch[0] : (stage || "unknown"),
    projectStage: (projectStage.match(/G[0-8]/) || [projectStage || ""])[0],
  };
}

function countDone(text) {
  let done = 0;
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*TASK-[A-Za-z0-9-]+\s*\|/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    // 标准表头：ID | 标题 | Owner | 依赖 | 状态 | 验收/证据
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

if (!fs.existsSync(tasksFile)) {
  const message = `not an AI Team project: missing ${tasksFile}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(2);
}

let tasksText;
try {
  tasksText = read(tasksFile);
} catch (error) {
  const message = `could not read ${tasksFile}: ${error.message}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(3);
}
const done = countDone(tasksText);

const growthExists = fs.existsSync(growthFile);
const fm = growthExists ? frontmatter(read(growthFile)) : {};
const parsedLast = Number.parseInt(fm.tasks_at_last_retro || "0", 10);
const last = Number.isFinite(parsedLast) ? parsedLast : 0;
const lastRetro = fm.last_retro || "never";
const lastGate = fm.last_gate || "G0";
const { track, stage, projectStage } = detectTrackStage();

const warnings = [];
if (projectStage && stage !== "unknown" && projectStage !== stage) {
  warnings.push(`PROJECT.md stage (${projectStage}) 与 STATUS.md stage (${stage}) 不一致；以 STATUS.md 为准`);
}

const dueReasons = [];
if (!growthExists && done >= CADENCE) {
  dueReasons.push(`first-${CADENCE}`);
} else if (growthExists && done - last >= CADENCE) {
  dueReasons.push(`cadence-${CADENCE}`);
}

const isT3T4 = track === "T3" || track === "T4";
if (isT3T4 && MAJOR_GATES.includes(stage)) {
  const current = GATE_RANK[stage] ?? 0;
  const previous = GATE_RANK[lastGate] ?? 0;
  if (current > previous) dueReasons.push(`gate-${stage}`);
}

if (incident) dueReasons.push(reasonArg ? `incident:${reasonArg}` : "incident");

const due = dueReasons.length > 0;
const nextDue = last + CADENCE;

if (json) {
  console.log(JSON.stringify({
    ok: true,
    due,
    reasons: dueReasons,
    done,
    last,
    nextDue,
    track,
    stage,
    growth: growthExists ? path.relative(project, growthFile).replace(/\\/g, "/") : null,
    lastRetro,
    lastGate,
    warnings,
  }, null, 2));
} else if (!quiet) {
  const dueText = due ? "YES" : "no";
  console.log("AI Team retro check");
  console.log(`project:  ${project}`);
  console.log(`track:    ${track}   stage: ${stage}`);
  console.log(`tasks:    done ${done}, last retro ${last}, next due ${nextDue}`);
  console.log(`growth:   ${growthExists ? path.relative(project, growthFile) : "missing"}`);
  console.log(`due:      ${dueText}${due ? ` (${dueReasons.join(", ")})` : ""}`);
  for (const warning of warnings) console.log(`warning:  ${warning}`);
  if (due) {
    console.log("action:   run /ai-retro before new feature work or gate approval");
  } else {
    console.log(`action:   none; next check at ${nextDue} done tasks${isT3T4 ? ` or major gate` : ""}`);
  }
}

process.exit(due ? 1 : 0);
