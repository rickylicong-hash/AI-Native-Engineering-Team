#!/usr/bin/env node
/**
 * 检查团队“设计了但没有接线”的一致性问题。
 *
 * 覆盖：
 *   - manifest / agents / commands / skills 计数与引用；
 *   - command 的 agent 是否存在；
 *   - skill 里引用的 references/、templates/ 是否存在；
 *   - agent 提到 retro-check / checkpoint-check 时是否有对应 shell 权限；
 *   - agent 说“不执行 git commit”时是否真的 deny；
 *   - 所有 agent 是否有 external_directory 规则。
 *
 * 用法：
 *   node scripts/audit-team-consistency.mjs
 *   node scripts/audit-team-consistency.mjs --json
 *
 * 退出码：0 = 全部通过；1 = 有缺口。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(".opencode");
const agentsDir = path.join(root, "agents", "ai-team");
const commandsDir = path.join(root, "commands");
const skillsDir = path.join(root, "skills");
const manifestPath = path.resolve("team-manifest.json");
const json = process.argv.includes("--json");

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function frontmatter(text) {
  return text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

function parseRules(text) {
  const fm = frontmatter(text);
  return [...fm.matchAll(/- action: "?([A-Za-z0-9_*]+)"?\s+resource: "([^"]+)"\s+effect: (allow|ask|deny)/g)]
    .map((m) => ({ action: m[1], resource: m[2], effect: m[3] }));
}

function hasEffective(rules, action, resource, effect) {
  const matches = rules.filter((r) => r.action === action && r.resource === resource);
  return matches.length > 0 && matches[matches.length - 1].effect === effect;
}

const failures = [];
const warnings = [];
const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

const manifest = JSON.parse(read(manifestPath).replace(/^\uFEFF/, ""));
const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).sort();
const agentIds = new Set(agentFiles.map((f) => `ai-team/${path.basename(f, ".md")}`));

check("manifest agent count", manifest.agents.length === agentFiles.length, `manifest ${manifest.agents.length}, files ${agentFiles.length}`);
for (const agent of manifest.agents) {
  check(`manifest agent ${agent.id}`, agentIds.has(agent.id), "missing agent file");
  const file = path.join(agentsDir, `${agent.id.split("/").pop()}.md`);
  check(`agent file ${agent.id}`, fs.existsSync(file));
}

const commandFiles = fs.readdirSync(commandsDir).filter((f) => /^ai.*\.md$/.test(f)).sort();
check("manifest command count", manifest.commands.length === commandFiles.length, `manifest ${manifest.commands.length}, files ${commandFiles.length}`);
for (const file of commandFiles) {
  const text = read(path.join(commandsDir, file));
  const agent = text.match(/^agent:\s*(\S+)/m)?.[1];
  check(`command ${file} has agent`, Boolean(agent));
  if (agent) check(`command ${file} agent exists`, agentIds.has(agent), agent);
}

const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith("ai-team-"))
  .map((e) => e.name)
  .sort();
check("manifest skill count", manifest.skills.length === skillDirs.length, `manifest ${manifest.skills.length}, dirs ${skillDirs.length}`);
for (const dir of skillDirs) {
  const skillFile = path.join(skillsDir, dir, "SKILL.md");
  check(`skill ${dir} has SKILL.md`, fs.existsSync(skillFile));
  if (!fs.existsSync(skillFile)) continue;
  const text = read(skillFile);
  for (const ref of [...text.matchAll(/`((?:references|templates)\/[^`]+)`/g)].map((m) => m[1])) {
    check(`skill ${dir} reference ${ref}`, fs.existsSync(path.join(skillsDir, dir, ref)));
  }
}

check("GROWTH template", fs.existsSync(path.join(skillsDir, "ai-team-workflow", "templates", "GROWTH.md")));
check("retro-check script", fs.existsSync(path.join(skillsDir, "ai-team-workflow", "scripts", "retro-check.mjs")));
check("checkpoint-check script", fs.existsSync(path.join(skillsDir, "ai-team-workflow", "scripts", "checkpoint-check.mjs")));
check("state-check script", fs.existsSync(path.join(skillsDir, "ai-team-workflow", "scripts", "state-check.mjs")));
check("artifact-check script", fs.existsSync(path.join(skillsDir, "ai-team-workflow", "scripts", "artifact-check.mjs")));
const stateCheckText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "state-check.mjs"));
check("state-check integrates artifact-check", stateCheckText.includes('from "./artifact-check.mjs"'), "missing artifact-check import");
check(
  "state-check validates HANDOFF against CHECKPOINT.json",
  stateCheckText.includes("CHECKPOINT.json") && stateCheckText.includes("is behind"),
  "missing checkpoint closeout validation",
);
const checkpointCheckText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "checkpoint-check.mjs"));
check("checkpoint-check integrates artifact-check", checkpointCheckText.includes('from "./artifact-check.mjs"'), "missing artifact-check import");
check(
  "checkpoint-check emits closeout next steps",
  checkpointCheckText.includes("NEXT:") && checkpointCheckText.includes("HANDOFF Git/Baseline"),
  "missing --mark closeout instructions",
);

for (const file of agentFiles) {
  const text = read(path.join(agentsDir, file));
  const rules = parseRules(text);
  const shellRules = rules.filter((r) => r.action === "shell");

  for (const script of ["retro-check", "checkpoint-check", "state-check", "artifact-check"]) {
    if (text.includes(script)) {
      const shellMatches = rules.filter((r) => (r.action === "shell" || r.action === "*") && r.resource === "*");
      const shellEnabled = shellMatches.length > 0 && shellMatches[shellMatches.length - 1].effect === "allow";
      const allowed = shellEnabled
        || shellRules.some((r) => r.effect === "allow" && r.resource.includes(script));
      check(`agent ${file} can run ${script}`, allowed, `no allow rule containing ${script}`);
    }
  }

  if (/不执行\s*`?git commit/.test(text)) {
    const denied = hasEffective(rules, "shell", "*", "deny") || hasEffective(rules, "shell", "git commit *", "deny");
    check(`agent ${file} says no git commit`, denied, "prompt says no commit but permission allows it");
  }

  check(`agent ${file} has external_directory`, rules.some((r) => r.action === "external_directory"), "missing external_directory rule");

  const seen = new Map();
  const duplicates = [];
  for (const rule of rules) {
    const key = `${rule.action}|${rule.resource}`;
    if (seen.has(key)) duplicates.push(`${key} (${seen.get(key)} -> ${rule.effect})`);
    seen.set(key, rule.effect);
  }
  check(`agent ${file} has no duplicate rules`, duplicates.length === 0, duplicates.join(", "));
}

// `ai-resume` 在 Chief 下必须可用的只读命令；防止再次出现大量 permission denied。
const chiefRules = parseRules(read(path.join(agentsDir, "chief.md")));
for (const resource of [
  "mvn -v *",
  "git -C * status *",
  "Get-Content .ai-team/state/*",
  "echo *",
]) {
  check(`chief resume allow ${resource}`, hasEffective(chiefRules, "shell", resource, "allow"), "missing allow rule");
}

const devopsRules = parseRules(read(path.join(agentsDir, "devops-engineer.md")));
check(
  "devops can write work evidence",
  hasEffective(devopsRules, "edit", ".ai-team/work/*EVIDENCE.md", "allow"),
  "DevOps must be able to write work/TASK-*-EVIDENCE.md without shell bypass",
);

const reviewerRules = parseRules(read(path.join(agentsDir, "code-reviewer.md")));
check(
  "code-reviewer can run maven tests",
  hasEffective(reviewerRules, "shell", "mvn *test*", "allow"),
  "reviewer cannot independently reproduce Maven tests",
);
check(
  "code-reviewer can use git -C",
  hasEffective(reviewerRules, "shell", "git -C * diff *", "allow"),
  "reviewer cannot diff an explicit project path",
);
for (const resource of ["java -version *", "mvn -v *", "mvn *compile*", "Get-ChildItem *", "Select-String *"]) {
  check(
    `code-reviewer can run ${resource}`,
    hasEffective(reviewerRules, "shell", resource, "allow"),
    "missing read-only verification rule",
  );
}

const securityRules = parseRules(read(path.join(agentsDir, "security-auditor.md")));
check(
  "security-auditor can run maven tests",
  hasEffective(securityRules, "shell", "mvn *test*", "allow"),
  "security cannot independently reproduce Maven tests",
);
check(
  "security-auditor can run dependency-check",
  hasEffective(securityRules, "shell", "mvn *dependency-check*", "allow"),
  "security cannot run Maven OWASP dependency-check",
);

const engineerRules = parseRules(read(path.join(agentsDir, "engineer.md")));
for (const resource of ["docs/*", "deploy/*", "qa/*", ".ai-team/tasks/*", "AGENTS.md"]) {
  check(
    `engineer denied edit ${resource}`,
    hasEffective(engineerRules, "edit", resource, "deny"),
    "Engineer can edit another role's owned path via the base allow rule",
  );
}

const writerRules = parseRules(read(path.join(agentsDir, "technical-writer.md")));
check(
  "writer denied edit docs/adr",
  hasEffective(writerRules, "edit", "docs/adr/*", "deny"),
  "Writer should not change architecture decisions",
);

const releaseResources = [
  "npm publish *",
  "pnpm publish *",
  "yarn publish *",
  "cargo publish *",
  "twine upload *",
  "docker push *",
  "kubectl apply *",
  "helm upgrade *",
  "terraform apply *",
];
for (const role of ["engineer.md", "qa-engineer.md", "technical-writer.md"]) {
  const rules = parseRules(read(path.join(agentsDir, role)));
  const missing = releaseResources.filter((resource) => !hasEffective(rules, "shell", resource, "deny"));
  check(
    `${role} release commands denied`,
    missing.length === 0,
    missing.join(", "),
  );
}

const chiefRulesAll = parseRules(read(path.join(agentsDir, "chief.md")));
check(
  "chief task deny all",
  hasEffective(chiefRulesAll, "task", "*", "deny"),
  "V1 task permission can bypass subagent restrictions",
);
check(
  "chief task allow ai-team",
  hasEffective(chiefRulesAll, "task", "ai-team/*", "allow"),
  "Chief cannot dispatch team via V1 task action",
);

const chiefText = read(path.join(agentsDir, "chief.md"));
for (const term of ["设计预审：", "装配清单：", "契约影响：<必填", "审查节流", "Checkpoint 硬闸", "状态回填", "独立验证：", "证据位置：", "证据/产物卫生", "flake 治理", "checkpoint 收口（P-18）"]) {
  check(`chief brief/process contains ${term}`, chiefText.includes(term), "missing workflow guard");
}
const reviewTemplate = read(path.join(skillsDir, "ai-team-workflow", "templates", "REVIEW.md"));
check(
  "review template checks contract same commit",
  reviewTemplate.includes("契约更新是否与实现同一提交"),
  "missing contract/implementation same-commit check",
);
check(
  "review template checks independent verification",
  reviewTemplate.includes("## 独立验证") && reviewTemplate.includes("证据可读性"),
  "missing reviewer independent verification/evidence readability section",
);
const testReportTemplate = read(path.join(skillsDir, "ai-team-workflow", "templates", "TEST-REPORT.md"));
check(
  "test report tracks flaky/skipped",
  testReportTemplate.includes("Flaky/skipped"),
  "missing flake tracking in test report",
);

// 命令里引用但团队不存在的脚本路径。
for (const file of commandFiles) {
  const text = read(path.join(commandsDir, file));
  for (const ref of [...text.matchAll(/`(scripts\/[^`]+\.(?:mjs|ps1|sh))`/g)].map((m) => m[1])) {
    check(`command ${file} script ${ref}`, fs.existsSync(path.resolve(ref)), "missing script");
  }
}

if (json) {
  console.log(JSON.stringify({ checks, failures, warnings }, null, 2));
} else {
  for (const c of checks) {
    if (!c.ok) console.log(`FAIL  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  for (const w of warnings) console.log(`WARN  ${w}`);
  console.log(`\n${checks.length} checks, ${failures.length} failed, ${warnings.length} warnings.`);
}

process.exit(failures.length ? 1 : 0);
