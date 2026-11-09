#!/usr/bin/env node
/**
 * 权限块同步/校验（1.13.0）。
 *
 * `permissions.json` 是权限单一事实源；本脚本从矩阵生成每个 agent 的
 * frontmatter permissions 块，避免 10 份手写权限漂移。
 *
 * 用法：
 *   node scripts/sync-agent-permissions.mjs --check   # 默认，只校验
 *   node scripts/sync-agent-permissions.mjs --write   # 重写 agent 权限块
 *
 * 退出码：0 一致/写入成功；1 不一致/写入失败；2 文件/解析错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const agentsDir = path.join(root, ".opencode", "agents", "ai-team");
const matrixPath = path.join(root, ".opencode", "skills", "ai-team-workflow", "permissions.json");
const write = process.argv.includes("--write");
const json = process.argv.includes("--json");

if (!fs.existsSync(matrixPath)) {
  console.error(`missing ${matrixPath}`);
  process.exit(2);
}

let matrix;
try {
  matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8").replace(/^\uFEFF/, ""));
} catch (error) {
  console.error(`cannot parse permissions.json: ${error.message}`);
  process.exit(2);
}

const deny = matrix.shellDestructiveDeny || [];
const readAllow = ["*.env", "*.env.*"];

function generatedBlock() {
  const lines = [
    "permissions:",
    "  - action: shell",
    '    resource: "*"',
    "    effect: allow",
  ];
  for (const resource of deny) {
    lines.push("  - action: shell");
    lines.push(`    resource: "${resource}"`);
    lines.push("    effect: deny");
  }
  for (const resource of readAllow) {
    lines.push("  - action: read");
    lines.push(`    resource: "${resource}"`);
    lines.push("    effect: allow");
  }
  return lines.join("\n");
}

function normalizeBlock(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .join("\n");
}

function extractBlock(text) {
  const start = text.indexOf("permissions:");
  if (start < 0) return "";
  const end = text.indexOf("\n---", start);
  if (end < 0) return "";
  return text.slice(start, end);
}

const expected = normalizeBlock(generatedBlock());
const files = fs.readdirSync(agentsDir).filter((file) => file.endsWith(".md")).sort();
const failures = [];
const checks = [];

for (const file of files) {
  const full = path.join(agentsDir, file);
  let text = fs.readFileSync(full, "utf8");
  const block = extractBlock(text);
  const actual = normalizeBlock(block);
  const ok = actual === expected;
  checks.push({ file, ok });
  if (!ok) {
    failures.push(file);
    if (write && block) {
      text = text.replace(block, generatedBlock());
      fs.writeFileSync(full, text, "utf8");
      checks[checks.length - 1].written = true;
    }
  }
}

const result = { ok: failures.length === 0, write, files: checks.length, mismatched: failures, checks };
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team permission block sync");
  console.log(`agents: ${checks.length}`);
  for (const item of checks) console.log(`${item.ok ? "PASS" : item.written ? "WROTE" : "FAIL"}  ${item.file}`);
  console.log(`result: ${result.ok ? "PASS" : write ? "WROTE" : "FAIL"}`);
}
process.exit(result.ok || write ? 0 : 1);
