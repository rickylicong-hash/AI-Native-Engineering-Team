#!/usr/bin/env node
/**
 * Subagent brief 预检（1.6.0）。
 *
 * 派发 subagent 前先写 brief 文件，再运行本脚本；缺字段直接拒绝派发。
 * 1.6.0 起额外强制：脚本参数以 --help 实跑为准、契约只引章节号/字段名、
 * 证据位置含 UTF-8。
 *
 * 用法：
 *   node brief-lint.mjs --brief .ai-team/tasks/TASK-0035-BRIEF.md --agent ai-team/qa-engineer
 *   node brief-lint.mjs --brief brief.md --agent code-reviewer --json
 *
 * 退出码：0 = 通过；1 = 缺字段；2 = 文件/参数错误。
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
const briefPath = getArg("--brief");
const agent = (getArg("--agent", "") || "").replace(/^ai-team\//, "");
const json = hasFlag("--json");

if (!briefPath) {
  console.error("usage: node brief-lint.mjs --brief <file> --agent <ai-team/role>");
  process.exit(2);
}
const file = path.resolve(briefPath);
if (!fs.existsSync(file)) {
  console.error(`missing brief: ${file}`);
  process.exit(2);
}
const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");

const hasAny = (needles) => needles.some((n) => text.includes(n));
const fields = {
  role: ["角色：", "角色:"],
  skill: ["技能：", "Skill："],
  task: ["任务 ID", "任务 ID：", "任务 ID:"],
  track: ["Track / 阶段", "Track/阶段", "Track:"],
  goal: ["## 目标", "目标："],
  background: ["## 背景", "## 输入", "背景与输入"],
  ownership: ["## 所有权", "所有权：", "## 审查权"],
  constraints: ["## 约束", "约束："],
  acceptance: ["## 验收", "验收标准"],
  must: ["## 必须执行", "必须执行："],
  script_help: ["脚本参数：", "脚本参数:", "以 `--help` 实跑", "以 --help 实跑"],
  contract_ref: ["契约影响：", "契约引用："],
  independent: ["独立验证"],
  evidence_location: ["证据位置"],
  encoding: ["UTF-8", "utf8", "utf-8"],
  evidence_req: ["证据要求"],
  forbidden: ["禁止"],
  report: ["## 回报格式", "回报格式"],
  build_isolation: ["构建隔离"],
};

const required = [
  "role", "skill", "task", "track", "goal", "background", "ownership", "constraints",
  "acceptance", "must", "script_help", "contract_ref", "evidence_location", "encoding",
  "evidence_req", "forbidden", "report", "build_isolation",
];

if (agent === "code-reviewer" || agent === "security-auditor") {
  fields.independent = ["独立验证"];
  fields.p2 = ["P2 处置", "Medium 处置"];
  required.push("independent", "p2");
}
if (agent === "qa-engineer") {
  fields.independent = ["独立验证"];
  fields.test_path = ["测试路径"];
  required.push("independent", "test_path");
}

const missing = [];
const present = {};
for (const [key, needles] of Object.entries(fields)) {
  present[key] = hasAny(needles);
  if (required.includes(key) && !present[key]) missing.push(key);
}

const ok = missing.length === 0;
const result = {
  ok,
  file,
  agent,
  required,
  present,
  missing,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team brief lint");
  console.log(`file:   ${file}`);
  console.log(`agent:  ${agent || "(unspecified)"}`);
  if (ok) {
    console.log("result: PASS");
  } else {
    console.log(`result: FAIL (${missing.length} missing)`);
    for (const key of missing) console.log(`  MISSING ${key}`);
  }
}

process.exit(ok ? 0 : 1);
