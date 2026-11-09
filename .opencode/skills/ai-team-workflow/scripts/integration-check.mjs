#!/usr/bin/env node
/**
 * 集成列车记录检查（1.13.0）。
 *
 * 校验 INTEGRATION.md：
 *   - 集成候选 commit / baseline_id / 全量命令 / 退出码 / 结论；
 *   - 候选与当前 HEAD 一致（非 git 目录跳过）；
 *   - 最终集成工作区 clean（--allow-dirty 可跳过）；
 *   - --strict 还要求 merge order 表、冒烟、回滚。
 *
 * 这是记录门禁，不执行构建；全量命令由 DevOps/CI 执行并写入记录。
 *
 * 用法：
 *   node integration-check.mjs --project .
 *   node integration-check.mjs --project . --file .ai-team/state/INTEGRATION.md --json --strict
 *
 * 退出码：0 通过；1 记录不满足；2 参数/文件错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node integration-check.mjs [--project DIR] [--file FILE] [--candidate REV] [--strict] [--allow-dirty] [--json]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const file = path.resolve(project, getArg("--file", path.join(".ai-team", "state", "INTEGRATION.md")));
const candidateArg = getArg("--candidate", null);
const strict = hasFlag("--strict");
const allowDirty = hasFlag("--allow-dirty");
const json = hasFlag("--json");

if (!fs.existsSync(file)) {
  const message = `missing integration file: ${file}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(2);
}

export function parseIntegration(text) {
  const data = {
    candidate: (text.match(/集成候选 commit[：:]\s*`?([0-9a-f]{7,40})`?/i) || [])[1] || "",
    baselineId: (text.match(/`?baseline_id`?[：:]\s*`?([^`\r\n]+)`?/i) || [])[1]?.trim() || "",
    command: (text.match(/全量命令[：:]\s*(.+)/i) || [])[1]?.trim() || "",
    exitCode: (text.match(/退出码[：:]\s*(\d+)/i) || [])[1] || "",
    conclusion: (text.match(/结论[：:]\s*\**\s*(通过|修改后通过|不通过)/) || [])[1] || "",
    rollback: (text.match(/回滚命令[：:]\s*(.+)/i) || [])[1]?.trim() || "",
    smoke: (text.match(/冒烟命令[：:]\s*(.+)/i) || [])[1]?.trim() || "",
    hasMergeTable: /##\s+2\.\s*合并顺序/m.test(text) && /\|\s*顺序\s*\|/.test(text),
  };
  return data;
}

const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const data = parseIntegration(text);
const errors = [];
const warnings = [];

if (!data.candidate) errors.push("missing candidate commit");
if (!data.baselineId) errors.push("missing baseline_id");
if (!data.command) errors.push("missing full-test command");
if (data.exitCode === "") errors.push("missing exit code");
else if (data.exitCode !== "0") errors.push(`full test exit code is ${data.exitCode}, not 0`);
if (!data.conclusion) errors.push("missing conclusion (通过/修改后通过/不通过)");
else if (data.conclusion !== "通过") warnings.push(`conclusion is ${data.conclusion}; release should use 通过`);

if (candidateArg && data.candidate && !data.candidate.startsWith(candidateArg) && !candidateArg.startsWith(data.candidate)) {
  errors.push(`candidate in file (${data.candidate}) does not match --candidate (${candidateArg})`);
}

const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: project, encoding: "utf8" });
if (inside.status === 0 && inside.stdout.trim() === "true") {
  const head = spawnSync("git", ["rev-parse", "--short=7", "HEAD"], { cwd: project, encoding: "utf8" });
  const headSha = head.status === 0 ? head.stdout.trim() : "";
  if (data.candidate && headSha && !headSha.startsWith(data.candidate) && !data.candidate.startsWith(headSha)) {
    errors.push(`candidate ${data.candidate} does not match HEAD ${headSha}`);
  }
  if (!allowDirty) {
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" });
    if (status.status === 0 && status.stdout.trim()) errors.push("working tree is not clean; freeze and commit the integration candidate first");
  }
}

if (strict) {
  if (!data.hasMergeTable) errors.push("strict: missing '## 2. 合并顺序' table");
  if (!data.rollback) errors.push("strict: missing rollback command");
  if (!data.smoke) errors.push("strict: missing smoke command");
}

const ok = errors.length === 0;
const result = { ok, file, strict, ...data, errors, warnings };
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team integration check");
  console.log(`file: ${file}`);
  console.log(`candidate: ${data.candidate || "(missing)"}`);
  console.log(`baseline:  ${data.baselineId || "(missing)"}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  console.log(`result: ${ok ? "PASS" : "FAIL"}`);
}
process.exit(ok ? 0 : 1);
