#!/usr/bin/env node
/**
 * 从 QUEUE.json 选择下一个 ready 任务（1.13.0）。
 *
 * 规则：
 *   - status = ready/todo 且所有 dependsOn 都 done；
 *   - 优先级数字越小越先（1 最高）；
 *   - 依赖缺失/重复 ID/循环依赖视为错误；
 *   - --claim 把选中任务写为 doing，并记录 claimedAt。
 *
 * 用法：
 *   node next-task.mjs --project . [--queue .ai-team/state/QUEUE.json] [--json] [--claim]
 *
 * 退出码：0 有可执行任务；1 无 ready 任务/队列错误；2 文件/参数错误。
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
  console.log("Usage: node next-task.mjs [--project DIR] [--queue FILE] [--json] [--claim]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const queueFile = path.resolve(project, getArg("--queue", path.join(".ai-team", "state", "QUEUE.json")));
const json = hasFlag("--json");
const claim = hasFlag("--claim");

if (!fs.existsSync(queueFile)) {
  const message = `missing queue file: ${queueFile}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(2);
}

let queue;
try {
  queue = JSON.parse(fs.readFileSync(queueFile, "utf8").replace(/^\uFEFF/, ""));
} catch (error) {
  const message = `cannot parse queue: ${error.message}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(2);
}

const tasks = Array.isArray(queue.tasks) ? queue.tasks : [];
const errors = [];
const byId = new Map();
for (const task of tasks) {
  if (!task.id) { errors.push("task missing id"); continue; }
  if (byId.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
  byId.set(task.id, task);
  if (task.status === undefined) task.status = "todo";
}
for (const task of tasks) {
  for (const dep of task.dependsOn || []) {
    if (!byId.has(dep)) errors.push(`${task.id}: unknown dependency ${dep}`);
    if (dep === task.id) errors.push(`${task.id}: self dependency`);
  }
}

const visiting = new Set();
const visited = new Set();
const cycle = [];
function dfs(id, stack = []) {
  if (visiting.has(id)) { cycle.push([...stack, id].join(" -> ")); return; }
  if (visited.has(id)) return;
  visiting.add(id);
  for (const dep of byId.get(id)?.dependsOn || []) if (byId.has(dep)) dfs(dep, [...stack, id]);
  visiting.delete(id);
  visited.add(id);
}
for (const id of byId.keys()) dfs(id);
for (const item of new Set(cycle)) errors.push(`dependency cycle: ${item}`);

const done = new Set(tasks.filter((task) => ["done", "superseded", "cancelled"].includes(String(task.status).toLowerCase())).map((task) => task.id));
const ready = tasks
  .filter((task) => ["ready", "todo"].includes(String(task.status).toLowerCase()))
  .filter((task) => (task.dependsOn || []).every((dep) => done.has(dep)))
  .sort((a, b) => (Number(a.priority ?? 100) - Number(b.priority ?? 100)) || String(a.id).localeCompare(String(b.id)));

if (errors.length > 0) {
  if (json) console.log(JSON.stringify({ ok: false, errors, ready: ready.map((task) => task.id) }, null, 2));
  else console.log(`ERROR\n${errors.map((error) => `  - ${error}`).join("\n")}`);
  process.exit(1);
}

const next = ready[0] || null;
if (next && claim) {
  next.status = "doing";
  next.claimedAt = new Date().toISOString();
  queue.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(queueFile, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}

if (json) {
  console.log(JSON.stringify({ ok: Boolean(next), next, ready: ready.map((task) => task.id), claimed: Boolean(next && claim) }, null, 2));
} else if (next) {
  console.log("AI Team next task");
  console.log(`id:       ${next.id}`);
  console.log(`title:    ${next.title || ""}`);
  console.log(`owner:    ${next.owner || ""}`);
  console.log(`priority: ${next.priority ?? "?"}`);
  console.log(`status:   ${next.status}${claim ? " (claimed)" : ""}`);
  console.log(`ready:    ${ready.map((task) => task.id).join(", ")}`);
} else {
  console.log("AI Team next task");
  console.log("no ready task (all blocked or done)");
}
process.exit(next ? 0 : 1);
