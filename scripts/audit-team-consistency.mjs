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
const artifactCheckText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "artifact-check.mjs"));
check(
  "artifact-check can fix UTF-16 evidence",
  artifactCheckText.includes("--fix") && artifactCheckText.includes("fixEvidence"),
  "missing UTF-16 conversion path",
);
const reviewerText = read(path.join(agentsDir, "code-reviewer.md"));
check(
  "code-reviewer handles binary evidence",
  reviewerText.includes("Cannot read binary file"),
  "missing reviewer rule for unreadable evidence",
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
  "devops can write TASK-GIT evidence",
  hasEffective(devopsRules, "edit", ".ai-team/work/TASK-GIT-*EVIDENCE.md", "allow"),
  "DevOps must be able to write TASK-GIT-*EVIDENCE.md without shell bypass",
);
check(
  "devops can run growth-check",
  hasEffective(devopsRules, "shell", "node *growth-check.mjs*", "allow"),
  "DevOps cannot validate GROWTH dispositions before checkpoint",
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
for (const [role, rules] of [["code-reviewer", reviewerRules], ["security-auditor", securityRules]]) {
  check(
    `${role} can run review-check`,
    hasEffective(rules, "shell", "node *review-check.mjs*", "allow"),
    `${role} cannot validate its own report`,
  );
}

const qaText = read(path.join(agentsDir, "qa-engineer.md"));
const qaRules = parseRules(qaText);
check(
  "qa can edit Java/Maven e2e tests",
  qaRules.some((rule) => rule.action === "edit" && rule.resource === "**/src/test/java/**/e2e/**" && rule.effect === "allow"),
  "QA cannot write server/src/test/java/**/e2e tests",
);
check(
  "qa manifest owns Java/Maven e2e tests",
  (manifest.agents.find((agent) => agent.id === "ai-team/qa-engineer")?.owns ?? []).includes("**/src/test/java/**/e2e/**"),
  "manifest QA owns does not include src/test/java e2e",
);
check(
  "qa prompt requires build-integrated E2E",
  qaText.includes("src/test/java/**/e2e") && qaText.includes("禁止用手工 `javac`"),
  "QA prompt does not enforce build-integrated E2E tests",
);
check(
  "qa owns defect closure",
  qaText.includes("只有 QA 能在独立回归通过后置") && qaText.includes("owner 只能把缺陷置为 `fixed`"),
  "QA prompt does not enforce QA-only defect closure",
);

for (const resource of [
  "**/src/test/java/**/e2e/**",
  "**/src/test/java/**/qa/**",
  "**/src/test/resources/**/e2e/**",
  "**/src/test/resources/**/qa/**",
]) {
  check(
    `engineer denied QA Java test ${resource}`,
    hasEffective(parseRules(read(path.join(agentsDir, "engineer.md"))), "edit", resource, "deny"),
    "Engineer can edit QA-owned build-integrated tests",
  );
}
check(
  "devops can write TASK-GIT evidence",
  hasEffective(parseRules(read(path.join(agentsDir, "devops-engineer.md"))), "edit", ".ai-team/work/TASK-GIT-*EVIDENCE.md", "allow"),
  "DevOps cannot write checkpoint evidence",
);
check(
  "DEFECTS template exists",
  fs.existsSync(path.join(skillsDir, "ai-team-workflow", "templates", "DEFECTS.md")),
  "missing QA defect lifecycle template",
);
check(
  "growth-check script exists",
  fs.existsSync(path.join(skillsDir, "ai-team-workflow", "scripts", "growth-check.mjs")),
  "missing GROWTH disposition checker",
);
const growthTemplate = read(path.join(skillsDir, "ai-team-workflow", "templates", "GROWTH.md"));
check(
  "growth template has disposition index",
  growthTemplate.includes("提案处置索引") && growthTemplate.includes("proposed") && growthTemplate.includes("superseded"),
  "GROWTH template does not track per-proposal disposition",
);
check(
  "state-check detects duplicate TASK-ID",
  read(path.join(skillsDir, "ai-team-workflow", "scripts", "state-check.mjs")).includes("duplicate TASK-ID"),
  "state-check cannot detect duplicate task rows",
);
for (const script of ["brief-lint.mjs", "review-check.mjs", "audit-state.mjs"]) {
  check(
    `workflow script ${script} exists`,
    fs.existsSync(path.join(skillsDir, "ai-team-workflow", "scripts", script)),
    `missing ${script}`,
  );
}
const briefLintText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "brief-lint.mjs"));
check(
  "brief-lint validates skill and independent verification",
  briefLintText.includes("skill") && briefLintText.includes("independent") && briefLintText.includes("test_path"),
  "brief-lint does not validate the required contract fields",
);
for (const role of ["engineer.md", "qa-engineer.md", "devops-engineer.md", "code-reviewer.md", "security-auditor.md", "technical-writer.md"]) {
  const rules = parseRules(read(path.join(agentsDir, role)));
  for (const resource of ["*;*", "*&&*", "*||*", "*2>&1*"]) {
    check(
      `${role} denies compound shell ${resource}`,
      hasEffective(rules, "shell", resource, "deny"),
      "compound shell can bypass one-command rule",
    );
  }
  for (const resource of ["git add -A", "git add -A *", "git add --all *", "git add .", "git add . *"]) {
    check(
      `${role} denies ${resource}`,
      hasEffective(rules, "shell", resource, "deny"),
      "git add -A/. is not permission-blocked",
    );
  }
}

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
for (const script of ["growth-check", "brief-lint", "review-check", "audit-state"]) {
  check(
    `chief can run ${script}`,
    hasEffective(chiefRules, "shell", `node *${script}.mjs*`, "allow"),
    `Chief cannot run ${script} during resume/handoff`,
  );
}
for (const term of ["设计预审：", "装配清单：", "契约影响：<必填", "审查节流", "Checkpoint 硬闸", "状态回填", "独立验证：", "证据位置：", "测试路径：", "构建隔离：", "P2 处置：", "技能：", "构建互斥", "状态自检", "growth-check", "brief-lint", "review-check", "audit-state", "证据/产物卫生", "flake 治理", "checkpoint 收口（P-18）"]) {
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
check(
  "review template tracks P2 disposition",
  reviewTemplate.includes("## P2 处置") && reviewTemplate.includes("TASK-____ / RISK-____"),
  "missing P2 debt disposition",
);
check(
  "review template handles third review round",
  reviewTemplate.includes("第 3 轮"),
  "missing third-round escalation rule",
);
const workflowDoc = read(path.resolve("docs", "WORKFLOW.md"));
check(
  "workflow doc has current brief fields",
  workflowDoc.includes("构建隔离：") && workflowDoc.includes("独立验证：") && workflowDoc.includes("测试路径："),
  "WORKFLOW brief template is missing new fields",
);
check(
  "workflow doc has build mutex",
  workflowDoc.includes("T-20 构建互斥") && workflowDoc.includes("同一工作区同一时间只有一个"),
  "WORKFLOW parallel rules do not serialize builds",
);
check(
  "workflow doc has growth disposition",
  workflowDoc.includes("提案处置索引") && workflowDoc.includes("growth-check"),
  "WORKFLOW does not track GROWTH dispositions",
);
const teamDoc = read(path.resolve("docs", "TEAM.md"));
check(
  "TEAM doc reflects reviewer verification shell",
  teamDoc.includes("Reviewer：只读 git + 项目已有测试/构建/扫描"),
  "TEAM doc still says reviewer is git-only",
);
check(
  "TEAM doc has QA Java E2E ownership",
  teamDoc.includes("**/src/test/java/**/e2e/**"),
  "TEAM doc QA write table is stale",
);
check(
  "handoff command runs growth-check",
  read(path.join(commandsDir, "ai-handoff.md")).includes("growth-check"),
  "handoff does not check GROWTH dispositions",
);
check(
  "retro command runs growth-check",
  read(path.join(commandsDir, "ai-retro.md")).includes("growth-check"),
  "retro does not check GROWTH dispositions",
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
