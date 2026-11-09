#!/usr/bin/env node
/**
 * 角色所有权冲突检查（1.13.0）。
 *
 * 单一事实源：team-manifest.json 的 owns / excludes / ownershipPolicy。
 * 检查已知冲突与未声明的完全重叠，避免 QA 改 Engineer 单测、Chief 改 README、
 * Writer 改 ADR 等角色边界回退。
 *
 * 用法：node scripts/ownership-lint.mjs [--json]
 * 退出码：0 = 通过；1 = 有冲突；2 = 文件/解析错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const json = process.argv.includes("--json");
const root = process.cwd();
const manifestPath = path.join(root, "team-manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error(`missing ${manifestPath}`);
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
} catch (error) {
  console.error(`cannot parse team-manifest.json: ${error.message}`);
  process.exit(2);
}

const agents = Array.isArray(manifest.agents) ? manifest.agents : [];
const byId = new Map(agents.map((agent) => [agent.id, agent]));
const failures = [];
const warnings = [];
const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

function ownsOf(id, pattern) {
  const agent = byId.get(id);
  return Array.isArray(agent?.owns) && agent.owns.includes(pattern);
}

function excludesOf(id, pattern) {
  const agent = byId.get(id);
  return Array.isArray(agent?.excludes) && agent.excludes.includes(pattern);
}

check("manifest has agents", agents.length > 0, `${agents.length}`);
check("manifest has ownershipPolicy", Boolean(manifest.ownershipPolicy && manifest.ownershipPolicy.unitTests), "missing ownershipPolicy.unitTests");

for (const pattern of ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"]) {
  check(`Engineer owns unit test pattern ${pattern}`, ownsOf("ai-team/engineer", pattern), "Engineer must own co-located unit tests");
  check(`QA does not own unit test pattern ${pattern}`, !ownsOf("ai-team/qa-engineer", pattern), "QA must not own Engineer unit tests");
  check(`QA excludes unit test pattern ${pattern}`, excludesOf("ai-team/qa-engineer", pattern), "QA excludes must document unit-test boundary");
}

check("QA owns independent tests", ownsOf("ai-team/qa-engineer", "tests/**") && ownsOf("ai-team/qa-engineer", "**/src/test/java/**/e2e/**"), "QA must own independent/e2e tests");
check("Chief does not own root README", !ownsOf("ai-team/chief", "README.md"), "root README belongs to Writer");
check("Chief owns only .ai-team README", ownsOf("ai-team/chief", ".ai-team/README.md"), "Chief should write .ai-team/README.md only");
check("Writer owns root README", ownsOf("ai-team/technical-writer", "README.md"), "Writer must own root README");
check("Writer excludes docs/adr", excludesOf("ai-team/technical-writer", "docs/adr/**"), "ADR belongs to Architect");
check("Architect owns docs/adr", ownsOf("ai-team/system-architect", "docs/adr/**"), "Architect must own ADR");
check("DevOps owns TASK-GIT evidence", ownsOf("ai-team/devops-engineer", ".ai-team/work/TASK-GIT-*EVIDENCE.md"), "DevOps must own checkpoint evidence");
check("Engineer excludes TASK-GIT evidence", excludesOf("ai-team/engineer", ".ai-team/work/TASK-GIT-*EVIDENCE.md"), "DevOps checkpoint evidence takes precedence");

// 完全相同的 owns 字符串通常是复制粘贴导致的未声明重叠；允许 ownershipPolicy.exceptions 中说明。
const seen = new Map();
for (const agent of agents) {
  for (const pattern of agent.owns || []) {
    if (!seen.has(pattern)) {
      seen.set(pattern, []);
    }
    seen.get(pattern).push(agent.id);
  }
}
for (const [pattern, roles] of seen.entries()) {
  if (roles.length > 1) {
    const exceptionText = (manifest.ownershipPolicy?.exceptions || []).join("\n");
    const documented = exceptionText.includes(pattern) || roles.every((role) => exceptionText.includes(role));
    if (documented) warnings.push(`shared owns ${pattern}: ${roles.join(", ")} (documented exception)`);
    else failures.push(`shared owns ${pattern}: ${roles.join(", ")} (add precedence/exception or remove)`);
  }
}

const result = { ok: failures.length === 0, checks, failures, warnings };
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team ownership lint");
  console.log(`agents: ${agents.length}`);
  console.log(`checks: ${checks.length}`);
  for (const warning of warnings) console.log(`  WARN ${warning}`);
  for (const failure of failures) console.log(`  FAIL ${failure}`);
  console.log(`result: ${result.ok ? "PASS" : "FAIL"}`);
}
process.exit(result.ok ? 0 : 1);
