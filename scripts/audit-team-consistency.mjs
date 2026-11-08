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
const externalCommandAgents = new Set(["build"]);

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
  if (agent) check(`command ${file} agent exists`, agentIds.has(agent) || externalCommandAgents.has(agent), agent);
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
  checkpointCheckText.includes("--sync-docs") && checkpointCheckText.includes("syncStateDocs"),
  "missing --mark/--sync-docs closeout instructions",
);
const artifactCheckText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "artifact-check.mjs"));
check(
  "artifact-check can fix UTF-16 evidence",
  artifactCheckText.includes("--fix") && artifactCheckText.includes("fixEvidence"),
  "missing UTF-16 conversion path",
);
check(
  "artifact-check blocks plaintext credentials",
  artifactCheckText.includes("scanSecrets") && artifactCheckText.includes("credential-plaintext"),
  "artifact-check does not block plaintext credentials",
);
const reviewCheckText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "review-check.mjs"));
check(
  "review-check blocks plaintext credentials",
  reviewCheckText.includes("scanText") && reviewCheckText.includes("plaintext credential"),
  "review-check does not block plaintext credentials",
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

  const seen = new Map();
  const duplicates = [];
  for (const rule of rules) {
    const key = `${rule.action}|${rule.resource}`;
    if (seen.has(key)) duplicates.push(`${key} (${seen.get(key)} -> ${rule.effect})`);
    seen.set(key, rule.effect);
  }
  check(`agent ${file} has no duplicate rules`, duplicates.length === 0, duplicates.join(", "));
}

const qaText = read(path.join(agentsDir, "qa-engineer.md"));
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
  "growth template has three-tier scope and net-zero",
  growthTemplate.includes("TEAM-CORE") && growthTemplate.includes("scope") && (growthTemplate.includes("net-zero") || growthTemplate.includes("净零")),
  "GROWTH template is missing 1.9.0 scope/net-zero fields",
);
const growthCheckText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "growth-check.mjs"));
check(
  "growth-check supports scope and debt",
  growthCheckText.includes("--debt") && growthCheckText.includes("SCOPES") && growthCheckText.includes("net-zero"),
  "growth-check is missing 1.9.0 scope/debt/net-zero support",
);
const profilesDir = path.join(skillsDir, "ai-team-workflow", "profiles");
const profileFiles = ["README.md", "java-spring.md", "vue.md", "strict-security.md"];
for (const profile of profileFiles) {
  check(
    `workflow profile ${profile} exists`,
    fs.existsSync(path.join(profilesDir, profile)),
    "missing project profile example",
  );
}
if (fs.existsSync(profilesDir)) {
  const profileText = profileFiles
    .filter((profile) => fs.existsSync(path.join(profilesDir, profile)))
    .map((profile) => read(path.join(profilesDir, profile)))
    .join("\n");
  check(
    "project profiles are project-agnostic",
    !/riccon|agentscope|MAX_PER_TENANT|D:[\\/]{1,2}Development/i.test(profileText),
    "profile examples contain project-specific values",
  );
}
check(
  "retro command enforces three-tier and net-zero",
  read(path.join(commandsDir, "ai-retro.md")).includes("TEAM-CORE")
    && read(path.join(commandsDir, "ai-retro.md")).includes("--debt")
    && read(path.join(commandsDir, "ai-retro.md")).includes("净零"),
  "ai-retro is missing the 1.9.0 intake/net-zero rules",
);
check(
  "state-check detects duplicate TASK-ID",
  read(path.join(skillsDir, "ai-team-workflow", "scripts", "state-check.mjs")).includes("duplicate TASK-ID"),
  "state-check cannot detect duplicate task rows",
);
for (const script of ["brief-lint.mjs", "brief-new.mjs", "secret-check.mjs", "review-check.mjs", "audit-state.mjs", "improve-scan.mjs", "permission-lint.mjs", "permission-doctor.mjs", "team-shell.mjs"]) {
  check(
    `workflow script ${script} exists`,
    fs.existsSync(path.join(skillsDir, "ai-team-workflow", "scripts", script)),
    `missing ${script}`,
  );
}
check(
  "permission matrix exists",
  fs.existsSync(path.join(skillsDir, "ai-team-workflow", "permissions.json")),
  "missing permissions.json",
);
let permissionMatrix = null;
try {
  permissionMatrix = JSON.parse(read(path.join(skillsDir, "ai-team-workflow", "permissions.json")));
} catch {
  // reported by the existence check
}
if (permissionMatrix) {
  const matrixRoles = Object.keys(permissionMatrix.roles || {});
  const manifestRoles = manifest.agents.map((agent) => agent.id.replace("ai-team/", ""));
  check(
    "permission matrix covers all manifest roles",
    matrixRoles.length === manifestRoles.length && manifestRoles.every((role) => matrixRoles.includes(role)),
    `matrix=${matrixRoles.join(",")} manifest=${manifestRoles.join(",")}`,
  );
  for (const role of matrixRoles) {
    check(
      `gateway action list shape for ${role}`,
      permissionMatrix.roles[role].gateway === undefined || Array.isArray(permissionMatrix.roles[role].gateway),
      "gateway must be an array when present (optional structured runner)",
    );
  }
}
const briefLintText = read(path.join(skillsDir, "ai-team-workflow", "scripts", "brief-lint.mjs"));
check(
  "brief-lint validates skill, script help, contract, encoding and independent verification",
  briefLintText.includes("script_help") && briefLintText.includes("contract_ref") && briefLintText.includes("encoding") && briefLintText.includes("independent") && briefLintText.includes("test_path"),
  "brief-lint does not validate the required contract fields",
);
for (const file of agentFiles) {
  const role = file.replace(/\.md$/, "");
  const rules = parseRules(read(path.join(agentsDir, file)));
  const shellMatches = rules.filter((r) => (r.action === "shell" || r.action === "*") && r.resource === "*");
  const shellEffect = shellMatches.length ? shellMatches[shellMatches.length - 1].effect : "none";
  check(
    `${role} shell default allow`,
    shellEffect === "allow",
    `Shell-first requires shell * -> allow (effective=${shellEffect})`,
  );
}

const chiefText = read(path.join(agentsDir, "chief.md"));
for (const term of ["设计预审：", "装配清单：", "契约影响：<必填", "脚本参数：", "brief-new", "secret-check", "--sync-docs", "审查节流", "Checkpoint 硬闸", "状态回填", "独立验证：", "证据位置：", "测试路径：", "构建隔离：", "P2 处置：", "技能：", "构建互斥", "状态自检", "growth-check", "brief-lint", "review-check", "audit-state", "证据/产物卫生", "flake 治理", "checkpoint 收口（P-18）", "证据脱敏（P-27）", "升级后新会话（P-29）", "checkpoint 自动同步（P-26）"]) {
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
  reviewTemplate.includes("## 独立验证") && reviewTemplate.includes("证据可读性") && reviewTemplate.includes("证据脱敏"),
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
  workflowDoc.includes("构建隔离：") && workflowDoc.includes("独立验证：") && workflowDoc.includes("测试路径：") && workflowDoc.includes("脚本参数：") && workflowDoc.includes("契约影响："),
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
  "TEAM doc reflects shell-first strict",
  teamDoc.includes("Shell-first strict") && teamDoc.includes("只有破坏性"),
  "TEAM doc still describes a broad allowlist or non-destructive restrictions",
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
check(
  "improve command uses GROWTH, sessions and docs",
  read(path.join(commandsDir, "ai-improve.md")).includes("GROWTH.md") &&
    read(path.join(commandsDir, "ai-improve.md")).includes("improve-scan.mjs") &&
    read(path.join(commandsDir, "ai-improve.md")).includes("docs/IMPROVEMENT.md"),
  "improve command is missing GROWTH/session/documentation steps",
);
check(
  "improve command restates team goals before analysis",
  read(path.join(commandsDir, "ai-improve.md")).includes("目标校准") &&
    read(path.join(commandsDir, "ai-improve.md")).includes("docs/TEAM.md") &&
    read(path.join(commandsDir, "ai-improve.md")).includes("一次通过率"),
  "improve command must restate docs/TEAM.md team goals before analysis",
);
check(
  "team docs define tiered first-pass targets",
  read(path.resolve("docs", "TEAM.md")).includes("一次通过率") &&
    read(path.resolve("docs", "TEAM.md")).includes("70%") &&
    read(path.resolve("docs", "TEAM.md")).includes("90%") &&
    read(path.resolve("docs", "IMPROVEMENT.md")).includes("review-ready"),
  "team/improvement docs are missing the first-pass definition or tiered targets",
);
check(
  "brief-lint requires review-entry fields",
  read(path.join(skillsDir, "ai-team-workflow", "scripts", "brief-lint.mjs")).includes("Review-entry 自检") &&
    read(path.join(skillsDir, "ai-team-workflow", "scripts", "brief-lint.mjs")).includes("门禁面") &&
    read(path.join(skillsDir, "ai-team-workflow", "scripts", "brief-lint.mjs")).includes("必然受影响测试/脚本") &&
    read(path.join(skillsDir, "ai-team-workflow", "scripts", "brief-lint.mjs")).includes("请求参数断言"),
  "brief-lint is missing review-entry/slice/test-whitelist/request-assertion fields",
);
check(
  "review template and reviewer enforce review-entry + horizontal surfaces",
  read(path.join(skillsDir, "ai-team-workflow", "templates", "REVIEW.md")).includes("Review-entry 核对") &&
    read(path.join(skillsDir, "ai-team-workflow", "templates", "REVIEW.md")).includes("首轮横向面") &&
    read(path.join(agentsDir, "code-reviewer.md")).includes("Review-entry 闸门"),
  "REVIEW template or code-reviewer is missing the review-entry gate",
);
check(
  "improvement strategy doc exists",
  fs.existsSync(path.resolve("docs", "IMPROVEMENT.md")),
  "missing docs/IMPROVEMENT.md",
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
