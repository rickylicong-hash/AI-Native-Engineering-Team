#!/usr/bin/env node
/**
 * Program / Workstream 检查（1.13.0）。
 *
 * 读取 `PROGRAM.md` 的 Workstreams 表，校验：
 *   - 至少 1 个 workstream；
 *   - ID 唯一、owner 非空、状态合法；
 *   - 依赖引用存在、无自依赖、无循环依赖；
 *   - --strict 时每个 workstream 有 WORKSTREAM-<ID>.md。
 *
 * 用法：
 *   node program-check.mjs --project . [--program .ai-team/state/PROGRAM.md] [--json] [--strict]
 *
 * 退出码：0 通过；1 有错误；2 参数/文件错误。
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
  console.log("Usage: node program-check.mjs [--project DIR] [--program FILE] [--strict] [--json]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const programFile = path.resolve(project, getArg("--program", path.join(".ai-team", "state", "PROGRAM.md")));
const json = hasFlag("--json");
const strict = hasFlag("--strict");

if (!fs.existsSync(programFile)) {
  const message = `missing program file: ${programFile}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(2);
}

export function parseProgram(text) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  let header = null;
  const workstreams = [];
  for (const line of lines) {
    if (/^##\s+(?:\d+\.\s*)?Workstreams\b/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(line)) break;
    if (!inSection || !line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (cells[0] === "ID" || /^ID$/i.test(cells[0] || "")) {
      header = cells;
      continue;
    }
    if (!header) continue;
    const row = {};
    for (let i = 0; i < header.length; i += 1) row[header[i]] = cells[i] || "";
    const id = (row.ID || "").trim();
    if (!id || !/^WS-[A-Za-z0-9_-]+$/i.test(id)) continue;
    workstreams.push({
      id,
      owner: (row.Owner || "").trim(),
      scope: (row["范围"] || row.Scope || "").trim(),
      dependencies: (row["依赖"] || row.Dependencies || "").trim(),
      status: (row["状态"] || row.Status || "").trim().toLowerCase(),
      contract: (row["契约"] || row.Contract || "").trim(),
      baseline: (row["基线"] || row.Baseline || "").trim(),
    });
  }
  return workstreams;
}

export function validateProgram(workstreams, { strict = false, baseDir = null } = {}) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const allowedStatus = new Set(["planning", "doing", "review", "done", "blocked", "pending"]);
  for (const ws of workstreams) {
    if (ids.has(ws.id)) errors.push(`duplicate workstream id: ${ws.id}`);
    ids.add(ws.id);
    if (!ws.owner) errors.push(`${ws.id}: missing owner`);
    if (!allowedStatus.has(ws.status)) errors.push(`${ws.id}: invalid status "${ws.status}"`);
    if (strict && !ws.contract) warnings.push(`${ws.id}: no contract reference`);
    if (strict && !ws.baseline) warnings.push(`${ws.id}: no baseline (pending is allowed)`);
  }
  if (workstreams.length === 0) errors.push("no workstream rows found under ## Workstreams");

  const graph = new Map();
  for (const ws of workstreams) {
    const deps = ws.dependencies && ws.dependencies !== "-" ? ws.dependencies.split(/[,，\s]+/).filter(Boolean) : [];
    graph.set(ws.id, deps);
    for (const dep of deps) {
      if (dep === ws.id) errors.push(`${ws.id}: self dependency`);
      if (!ids.has(dep)) errors.push(`${ws.id}: unknown dependency ${dep}`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const cycle = [];
  function dfs(id, stack = []) {
    if (visiting.has(id)) {
      cycle.push([...stack, id].join(" -> "));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of graph.get(id) || []) {
      if (graph.has(dep)) dfs(dep, [...stack, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) dfs(id);
  for (const item of new Set(cycle)) errors.push(`dependency cycle: ${item}`);

  if (strict && baseDir) {
    for (const ws of workstreams) {
      const candidates = [
        path.join(baseDir, `WORKSTREAM-${ws.id}.md`),
        path.join(baseDir, "workstreams", `WORKSTREAM-${ws.id}.md`),
        path.join(baseDir, `${ws.id}.md`),
      ];
      if (!candidates.some((file) => fs.existsSync(file))) {
        errors.push(`${ws.id}: missing WORKSTREAM-${ws.id}.md under ${baseDir}`);
      }
    }
  }
  return { errors, warnings, workstreams };
}

const workstreams = parseProgram(fs.readFileSync(programFile, "utf8").replace(/^\uFEFF/, ""));
const result = validateProgram(workstreams, { strict, baseDir: path.dirname(programFile) });
const ok = result.errors.length === 0;
if (json) {
  console.log(JSON.stringify({ ok, program: programFile, strict, ...result }, null, 2));
} else {
  console.log("AI Team program check");
  console.log(`program: ${programFile}`);
  console.log(`workstreams: ${result.workstreams.length}`);
  for (const warning of result.warnings) console.log(`  WARN ${warning}`);
  for (const error of result.errors) console.log(`  ERROR ${error}`);
  console.log(`result: ${ok ? "PASS" : "FAIL"}`);
}
process.exit(ok ? 0 : 1);
