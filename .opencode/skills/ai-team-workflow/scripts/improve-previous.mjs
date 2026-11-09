#!/usr/bin/env node
/**
 * 检查上一轮 `/ai-improve` 任务达成情况（1.14.0）。
 *
 * 读取最新 `.ai-team/team/TEAM-IMPROVEMENT-*.md` 的“本轮任务”表，
 * 提取 TASK-* / P-* / T-* ID，对照 `TASKS.md` 和 `GROWTH.md` 索引：
 *   done / rejected / superseded -> done
 *   deferred / partial -> partial
 *   todo / doing / review / qa / blocked / proposed / accepted / in_progress -> missed
 *   找不到 -> unverified
 *
 * 用法：
 *   node improve-previous.mjs --project . --json
 *   node improve-previous.mjs --project . --report .ai-team/team/TEAM-IMPROVEMENT-2026-11-09.md --strict
 *
 * 退出码：0 检查完成；1 --strict 且有 missed/partial/unverified；2 参数/读取错误。
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

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node improve-previous.mjs [--project DIR] [--report FILE] [--strict] [--json]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const json = hasFlag("--json");
const strict = hasFlag("--strict");

if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  console.error(`ERROR  project not found: ${project}`);
  process.exit(2);
}

const teamDir = path.join(project, ".ai-team", "team");
const reportArg = getArg("--report", null);
let reportFile = reportArg ? path.resolve(project, reportArg) : null;
if (!reportFile) {
  if (fs.existsSync(teamDir)) {
    const reports = fs.readdirSync(teamDir)
      .filter((name) => /^TEAM-IMPROVEMENT-.*\.md$/i.test(name))
      .sort()
      .reverse();
    if (reports.length > 0) reportFile = path.join(teamDir, reports[0]);
  }
}

if (!reportFile || !fs.existsSync(reportFile)) {
  const result = { ok: true, report: null, reason: "no previous TEAM-IMPROVEMENT-*.md", items: [], done: 0, partial: 0, missed: 0, unverified: 0 };
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log("AI Team previous improvement check\nno previous report; nothing to check");
  process.exit(0);
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function sectionByHeading(text, headingRegex) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => headingRegex.test(line));
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join("\n");
}

function statusMap(file, isTask) {
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  let text = readText(file);
  if (!isTask) text = sectionByHeading(text, /^##\s+提案处置索引/);
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const id = cells[1] || "";
    if (!/^((TASK|P|T)-[A-Za-z0-9-]+)$/.test(id)) continue;
    if (isTask && !id.startsWith("TASK-")) continue;
    if (!isTask && !/^[PT]-/.test(id)) continue;
    map.set(id, String((isTask ? cells[5] : cells[4]) || "").toLowerCase());
  }
  return map;
}

const tasks = statusMap(path.join(project, ".ai-team", "state", "TASKS.md"), true);
const growth = statusMap(path.join(project, ".ai-team", "team", "GROWTH.md"), false);
const text = readText(reportFile);

// 优先取“本轮任务”小节里的 ID；找不到再退回全文 ID。
const section = sectionByHeading(text, /^##\s+(?:\d+\.\s*)?本轮任务/);
const ids = new Set();
for (const match of (section || text).matchAll(/\b(TASK-[A-Za-z0-9-]+|[PT]-\d+)\b/g)) ids.add(match[1]);

const classify = (status) => {
  if (!status) return "unverified";
  if (/^(done|rejected|superseded)\b/.test(status)) return "done";
  if (/^(deferred|partial)\b/.test(status)) return "partial";
  return "missed";
};

const items = [...ids].map((id) => {
  const taskStatus = tasks.get(id);
  const growthStatus = growth.get(id);
  const status = taskStatus ?? growthStatus ?? "";
  return { id, status, result: classify(status), source: taskStatus ? "TASKS" : growthStatus ? "GROWTH" : "missing" };
});
const counts = {
  done: items.filter((item) => item.result === "done").length,
  partial: items.filter((item) => item.result === "partial").length,
  missed: items.filter((item) => item.result === "missed").length,
  unverified: items.filter((item) => item.result === "unverified").length,
};
const result = {
  ok: true,
  report: reportFile,
  items,
  ...counts,
  strict,
  pass: counts.missed === 0 && counts.partial === 0 && counts.unverified === 0,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team previous improvement check");
  console.log(`report: ${reportFile}`);
  for (const item of items) console.log(`  ${item.result.padEnd(10)} ${item.id} (${item.status || "missing"})`);
  console.log(`done=${counts.done} partial=${counts.partial} missed=${counts.missed} unverified=${counts.unverified}`);
  console.log(`result: ${result.pass ? "PASS" : "CHECK"}`);
}
process.exit(strict && !result.pass ? 1 : 0);
