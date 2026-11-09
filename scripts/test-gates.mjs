#!/usr/bin/env node
/**
 * 1.9.1 gate regression fixtures.
 *
 * 覆盖：
 *   - 净零真值：latest RETRO 新增 3 条 open + last_retro_new: 0 → FAIL；
 *   - 陈旧 frontmatter：team_open_at_last_retro 与实际不符 → FAIL；
 *   - 同轮合并：3 条新增全部 superseded，last_retro_new: 0 / closed: 3 → PASS；
 *   - 既有规则：new > 2、new > closed → FAIL；
 *   - 旧台账（无 scope_model/net_zero）→ PASS；
 *   - 证据扫描：默认 2000 起点自动升限；到硬上限仍截断 → PARTIAL/error。
 *
 * 用法：node scripts/test-gates.mjs [--skills <dir>]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const skillsRoot = path.resolve(getArg("--skills", path.join(process.cwd(), ".opencode", "skills")));
const workflowScripts = path.join(skillsRoot, "ai-team-workflow", "scripts");
const growthCheck = path.join(workflowScripts, "growth-check.mjs");
const secretCheck = path.join(workflowScripts, "secret-check.mjs");
const artifactCheck = path.join(workflowScripts, "artifact-check.mjs");
const qualityReport = path.join(workflowScripts, "quality-report.mjs");
const ownershipCheck = path.join(workflowScripts, "ownership-check.mjs");
const reviewCheck = path.join(workflowScripts, "review-check.mjs");

const failures = [];
const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

function tmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `ai-team-${prefix}-`));
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function run(script, runArgs, cwd) {
  return spawnSync(process.execPath, [script, ...runArgs], {
    cwd,
    encoding: "utf8",
    timeout: 120000,
  });
}

function growthText({ lastRetroNew, lastRetroClosed, teamOpenLast, teamOpenPrev, teamOpenPrev2, rows, tableRows = rows, previousRows = [], archivedRetros = [], legacy = false, exception = "", omitTeamOpen = false, omitClosed = false }) {
  const open = rows.filter((row) => !["done", "rejected", "superseded"].includes(row.status)).length;
  const frontmatter = [
    "---",
    "schema: 3",
    "project: fixture",
    "last_retro: 2026-01-02",
    "last_gate: G4",
    "tasks_at_last_retro: 1",
    "next_due_at: 11",
    "last_trigger: fixture",
    `open_proposals: ${open}`,
    "last_disposition: 2026-01-02",
    ...(legacy ? [] : [
      "scope_model: three-tier",
      "net_zero: enforced",
      `last_retro_new: ${lastRetroNew}`,
      ...(omitClosed ? [] : [`last_retro_closed: ${lastRetroClosed}`]),
      ...(omitTeamOpen ? [] : [`team_open_at_last_retro: ${teamOpenLast}`]),
      `team_open_at_prev_retro: ${teamOpenPrev}`,
      `team_open_at_prev2_retro: ${teamOpenPrev2}`,
      ...(exception ? [`net_zero_exception: ${JSON.stringify(exception)}`] : []),
    ]),
    "---",
    "",
    "# GROWTH — fixture",
    "",
    "## 提案处置索引",
    "",
    "| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 | scope | 复查日期 |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows.map((row) => `| ${row.id} | ${row.retro || "RETRO-0001"} | ${row.title} | ${row.status} | ${row.landing || "-"} | ${row.evidence || "-"} | ${row.date || "2026-01-02"} | ${row.scope || "team"} | 2026-02-01 |`),
    "",
    "## RETRO-0001 — 2026-01-02 — fixture",
    "",
    "### 4. 改进提案",
    "",
    "| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |",
    "|---|---|---|---|---|---|---|---|",
    ...tableRows.map((row) => `| ${row.id} | ${row.scope || "team"} | ${row.title} | G-01 | x | y | 2026-02-01 | 用户 |`),
    "",
    "## RETRO-0000 — 2025-12-31 — previous",
    "",
    "### 4. 改进提案",
    "",
    "| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |",
    "|---|---|---|---|---|---|---|---|",
    ...previousRows.map((row) => `| ${row.id} | ${row.scope || "team"} | ${row.title} | G-01 | x | y | 2026-02-01 | 用户 |`),
    "",
    "## 已归档复盘",
    "",
    ...archivedRetros.map((retro) => `- ${retro} — \`team/archive/GROWTH-2026.md\``),
    "",
  ].join("\n");
  return frontmatter;
}

function engineerBrief({ goal = "实现一个门禁脚本", reviewEntry = "语义源：ADR §1 → 实现 → 测试；P1 场景逐项对照已填", gateSurfaces = "≤2：growth-check、brief-lint", testWhitelist = "无（仅生产代码）", requestAssertion = "不适用（非检索类任务）", verificationBudget = "V0/V1 迭代用定向；V2 全量只对冻结候选提交跑 1 条并登记 baseline_id；commit+工作区指纹必须匹配" } = {}) {
  return `角色：ai-team/engineer
技能：ai-team-workflow
任务 ID：TASK-BRIEF-FIXTURE
Track / 阶段：T2 / G4
目标：${goal}
背景与输入：fixture
所有权：只允许修改 fixture
约束：无
契约影响：不适用（无契约变更）
回归范围：fixture
Review-entry 自检：${reviewEntry}
门禁面：${gateSurfaces}
必然受影响测试/脚本：${testWhitelist}
请求参数断言：${requestAssertion}
验收标准：
- [ ] fixture
必须执行：node scripts/test-gates.mjs
脚本参数：以 \`<script> --help\` 实跑为准
验证预算：${verificationBudget}
独立验证：node scripts/test-gates.mjs
证据位置：.ai-team/work/TASK-BRIEF-FIXTURE-logs/；UTF-8
证据门禁：回报前必须运行 \`artifact-check.mjs --strict --max-files 2000\` 且 0 error/0 warning；日志只允许 \`logs/<date>/\` 或 \`.ai-team/work/<TASK>-logs/\`
运行时取证：node scripts/test-gates.mjs 退出码 0
测试路径：owner=qa-engineer 时必填
构建隔离：共享工作区串行
P2 处置：修改后通过时必填
证据要求：命令 + 退出码
禁止：不得伪造证据
回报格式：结论 / 改动 / 证据
`;
}

async function main() {
  const dir = tmp("growth");
  try {
    const baseRow = { id: "P-01", scope: "team", status: "proposed", title: "alpha gate", landing: "-", evidence: "-", date: "2026-01-02" };
    const closedRow = { id: "P-02", retro: "RETRO-0000", scope: "team", status: "superseded", title: "beta duplicate", landing: "并入 P-01", evidence: "fixture", date: "2026-01-02" };

    const scenarios = [
      {
        name: "compliant",
        expect: 0,
        text: growthText({ lastRetroNew: 1, lastRetroClosed: 1, teamOpenLast: 1, teamOpenPrev: 2, teamOpenPrev2: 2, rows: [baseRow, closedRow], tableRows: [baseRow], previousRows: [closedRow] }),
      },
      {
        name: "stale-new",
        expect: 1,
        text: growthText({ lastRetroNew: 0, lastRetroClosed: 1, teamOpenLast: 1, teamOpenPrev: 2, teamOpenPrev2: 2, rows: [baseRow, closedRow], tableRows: [baseRow], previousRows: [closedRow] }),
      },
      {
        name: "stale-open",
        expect: 1,
        text: growthText({ lastRetroNew: 1, lastRetroClosed: 1, teamOpenLast: 0, teamOpenPrev: 2, teamOpenPrev2: 2, rows: [baseRow, closedRow], tableRows: [baseRow], previousRows: [closedRow] }),
      },
      {
        name: "new-over-two",
        expect: 1,
        text: growthText({
          lastRetroNew: 3,
          lastRetroClosed: 3,
          teamOpenLast: 3,
          teamOpenPrev: 3,
          teamOpenPrev2: 3,
          rows: [
            baseRow,
            { ...baseRow, id: "P-03", title: "gamma gate" },
            { ...baseRow, id: "P-04", title: "delta gate" },
          ],
        }),
      },
      {
        name: "new-over-closed",
        expect: 1,
        text: growthText({
          lastRetroNew: 2,
          lastRetroClosed: 1,
          teamOpenLast: 2,
          teamOpenPrev: 2,
          teamOpenPrev2: 2,
          rows: [baseRow, { ...baseRow, id: "P-03", title: "gamma gate" }],
        }),
      },
      {
        name: "same-round-merged",
        expect: 0,
        text: growthText({
          lastRetroNew: 3,
          lastRetroClosed: 3,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          exception: "RETRO-0001: 3 new (>2); approved 2026-01-02; merged same round",
          rows: [
            { ...baseRow, status: "superseded", landing: "并入 P-10", evidence: "fixture", title: "merged alpha" },
            { ...baseRow, id: "P-03", status: "superseded", landing: "并入 P-11", evidence: "fixture", title: "merged beta" },
            { ...baseRow, id: "P-04", status: "superseded", landing: "并入 P-12", evidence: "fixture", title: "merged gamma" },
          ],
        }),
      },
      {
        name: "same-round-merged-no-exception",
        expect: 1,
        text: growthText({
          lastRetroNew: 3,
          lastRetroClosed: 3,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          rows: [
            { ...baseRow, status: "superseded", landing: "并入 P-10", evidence: "fixture", title: "merged alpha" },
            { ...baseRow, id: "P-03", status: "superseded", landing: "并入 P-11", evidence: "fixture", title: "merged beta" },
            { ...baseRow, id: "P-04", status: "superseded", landing: "并入 P-12", evidence: "fixture", title: "merged gamma" },
          ],
        }),
      },
      {
        name: "missing-team-open",
        expect: 1,
        text: growthText({ lastRetroNew: 1, lastRetroClosed: 1, teamOpenLast: 1, teamOpenPrev: 2, teamOpenPrev2: 2, omitTeamOpen: true, rows: [baseRow, closedRow], tableRows: [baseRow], previousRows: [closedRow] }),
      },
      {
        name: "closed-self-report",
        expect: 1,
        text: growthText({ lastRetroNew: 1, lastRetroClosed: 99, teamOpenLast: 1, teamOpenPrev: 2, teamOpenPrev2: 2, rows: [baseRow, closedRow], tableRows: [baseRow], previousRows: [closedRow] }),
      },
      {
        name: "missing-closed",
        expect: 1,
        text: growthText({ lastRetroNew: 1, lastRetroClosed: 1, teamOpenLast: 1, teamOpenPrev: 2, teamOpenPrev2: 2, omitClosed: true, rows: [baseRow, closedRow], tableRows: [baseRow], previousRows: [closedRow] }),
      },
      {
        name: "exception-malformed",
        expect: 1,
        text: growthText({
          lastRetroNew: 3,
          lastRetroClosed: 3,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          exception: "RETRO-0001",
          rows: [
            { ...baseRow, status: "superseded", landing: "并入 P-10", evidence: "fixture", title: "merged alpha" },
            { ...baseRow, id: "P-03", status: "superseded", landing: "并入 P-11", evidence: "fixture", title: "merged beta" },
            { ...baseRow, id: "P-04", status: "superseded", landing: "并入 P-12", evidence: "fixture", title: "merged gamma" },
          ],
        }),
      },
      {
        name: "exception-open",
        expect: 1,
        text: growthText({
          lastRetroNew: 3,
          lastRetroClosed: 3,
          teamOpenLast: 3,
          teamOpenPrev: 3,
          teamOpenPrev2: 3,
          exception: "RETRO-0001: 3 new (>2); approved 2026-01-02; migration",
          rows: [
            baseRow,
            { ...baseRow, id: "P-03", title: "gamma gate" },
            { ...baseRow, id: "P-04", title: "delta gate" },
          ],
        }),
      },
      {
        name: "carried-over",
        expect: 1,
        text: growthText({
          lastRetroNew: 1,
          lastRetroClosed: 1,
          teamOpenLast: 2,
          teamOpenPrev: 2,
          teamOpenPrev2: 2,
          rows: [
            baseRow,
            closedRow,
            { ...baseRow, id: "P-99", retro: "RETRO-0000", status: "proposed", landing: "-", evidence: "-", date: "2025-12-31", title: "carried open" },
          ],
          tableRows: [
            baseRow,
            { ...baseRow, id: "P-99", retro: "RETRO-0000", status: "proposed", landing: "-", evidence: "-", date: "2025-12-31", title: "carried open" },
          ],
          archivedRetros: ["RETRO-0000"],
        }),
      },
      {
        name: "project-scope",
        expect: 0,
        text: growthText({
          lastRetroNew: 1,
          lastRetroClosed: 1,
          teamOpenLast: 1,
          teamOpenPrev: 2,
          teamOpenPrev2: 2,
          rows: [
            baseRow,
            closedRow,
            { ...baseRow, id: "P-03", scope: "project", title: "project policy", date: "2026-01-02" },
          ],
          tableRows: [baseRow, { ...baseRow, id: "P-03", scope: "project", title: "project policy", date: "2026-01-02" }],
          previousRows: [closedRow],
        }),
      },
      {
        name: "t-proposal",
        expect: 0,
        text: growthText({
          lastRetroNew: 1,
          lastRetroClosed: 1,
          teamOpenLast: 1,
          teamOpenPrev: 2,
          teamOpenPrev2: 2,
          rows: [baseRow, closedRow].map((row) => (row.id === "P-01" ? { ...row, id: "T-01" } : row)),
          tableRows: [baseRow].map((row) => ({ ...row, id: "T-01" })),
          previousRows: [closedRow],
        }),
      },
      {
        name: "legacy-ledger",
        expect: 0,
        text: growthText({ legacy: true, rows: [baseRow] }),
      },
    ];

    for (const scenario of scenarios) {
      const scenarioDir = path.join(dir, scenario.name);
      write(path.join(scenarioDir, ".ai-team", "team", "GROWTH.md"), scenario.text);
      const result = run(growthCheck, ["--project", scenarioDir, "--debt"], scenarioDir);
      check(`growth ${scenario.name}`, result.status === scenario.expect, `expected exit ${scenario.expect}, got ${result.status}; ${(result.stdout || result.stderr || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const archiveDir = tmp("archive");
  try {
    const archiveText = [
      "---",
      "schema: 3",
      "project: fixture",
      "last_retro: 2026-01-02",
      "last_gate: G4",
      "tasks_at_last_retro: 2",
      "next_due_at: 12",
      "last_trigger: fixture",
      "open_proposals: 2",
      "last_disposition: 2026-01-02",
      "scope_model: three-tier",
      "net_zero: enforced",
      "last_retro_new: 1",
      "last_retro_closed: 1",
      "team_open_at_last_retro: 1",
      "team_open_at_prev_retro: 1",
      "team_open_at_prev2_retro: 1",
      "---",
      "",
      "# GROWTH — archive fixture",
      "",
      "## 提案处置索引",
      "",
      "| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 | scope | 复查日期 |",
      "|---|---|---|---|---|---|---|---|---|",
      "| P-01 | RETRO-0001 | old | done | 1.0 | e | 2026-01-01 | team | - |",
      "| P-04 | RETRO-0001 | closed this round | superseded | 并入 P-02 | e | 2026-01-02 | team | - |",
      "| P-02 | RETRO-0002 | open team | proposed | - | - | 2026-01-02 | team | 2026-02-01 |",
      "| P-03 | RETRO-0002 | open project | proposed | - | - | 2026-01-02 | project | 2026-02-01 |",
      "",
      "## RETRO-0001 — 2026-01-01 — old",
      "",
      "### 4. 改进提案",
      "",
      "| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |",
      "|---|---|---|---|---|---|---|---|",
      "| P-01 | team | old | G-01 | x | y | 2026-02-01 | 用户 |",
      "| P-04 | team | closed this round | G-01 | x | y | 2026-02-01 | 用户 |",
      "",
      "## RETRO-0002 — 2026-01-02 — latest",
      "",
      "### 4. 改进提案",
      "",
      "| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |",
      "|---|---|---|---|---|---|---|---|",
      "| P-02 | team | open team | G-01 | x | y | 2026-02-01 | 用户 |",
      "| P-03 | project | open project | G-01 | x | y | 2026-02-01 | 用户 |",
      "",
    ].join("\n");
    write(path.join(archiveDir, ".ai-team", "team", "GROWTH.md"), archiveText);
    const archiveRun = run(growthCheck, ["--project", archiveDir, "--archive", "--yes"], archiveDir);
    check("archive moves old retro", archiveRun.status === 0, `${archiveRun.status}; ${(archiveRun.stdout || archiveRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
    const archiveDebt = run(growthCheck, ["--project", archiveDir, "--debt"], archiveDir);
    check("archive keeps ledger valid", archiveDebt.status === 0, `${archiveDebt.status}; ${(archiveDebt.stdout || archiveDebt.stderr || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    const archivedText = fs.readFileSync(path.join(archiveDir, ".ai-team", "team", "GROWTH.md"), "utf8");
    check("archive keeps total open count", /^open_proposals:\s*2\s*$/m.test(archivedText), "open_proposals should be 2 (team + project)");
  } finally {
    fs.rmSync(archiveDir, { recursive: true, force: true });
  }

  const briefLint = path.join(workflowScripts, "brief-lint.mjs");
  const briefDir = tmp("brief");
  try {
    const briefScenarios = [
      { name: "brief-compliant", expect: 0, text: engineerBrief() },
      { name: "brief-missing-review-entry", expect: 1, text: engineerBrief({ reviewEntry: "已填" }) },
      { name: "brief-missing-test-whitelist", expect: 1, text: engineerBrief({ testWhitelist: "TBD" }) },
      { name: "brief-query-without-assertion", expect: 1, text: engineerBrief({ goal: "实现服务端查询与筛选", requestAssertion: "不适用（非查询/幂等/筛选）" }) },
      { name: "brief-missing-verification-budget", expect: 1, text: engineerBrief({ verificationBudget: "再跑两遍全量" }) },
      { name: "brief-placeholder-verification-budget", expect: 1, text: engineerBrief({ verificationBudget: "TODO 定向 全量 提交 复用" }) },
      { name: "brief-chinese-placeholder-verification-budget", expect: 1, text: engineerBrief({ verificationBudget: "待补充：定向 全量 提交 复用" }) },
      { name: "brief-mid-placeholder-verification-budget", expect: 1, text: engineerBrief({ verificationBudget: "定向 全量 提交 复用，待确认" }) },
    ];
    for (const scenario of briefScenarios) {
      const briefFile = path.join(briefDir, `${scenario.name}.md`);
      write(briefFile, scenario.text);
      const result = run(briefLint, ["--brief", briefFile, "--agent", "ai-team/engineer"], briefDir);
      check(`brief ${scenario.name}`, result.status === scenario.expect, `expected exit ${scenario.expect}, got ${result.status}; ${(result.stdout || result.stderr || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    }
  } finally {
    fs.rmSync(briefDir, { recursive: true, force: true });
  }

  const qualityDir = tmp("quality");
  try {
    write(path.join(qualityDir, ".ai-team", "state", "TASKS.md"), [
      "# Tasks",
      "",
      "| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |",
      "|---|---|---|---|---|---|---|",
      "| TASK-1001 | 实现登录 | ai-team/engineer | - | done | AC | - |",
      "| TASK-1002 | 实现支付 | ai-team/engineer | - | done | AC | - |",
      "| TASK-1003 | 审查登录 | ai-team/code-reviewer | - | done | AC | - |",
      "| TASK-1004 | 实现导出 | ai-team/engineer<b> | - | doing | AC | - |",
      "",
    ].join("\n"));
    write(path.join(qualityDir, ".ai-team", "reviews", "REV-1001.md"), "# REV-1001 — TASK-1001\n\n- 结论：通过\n- P0=0；P1=0；P2=0\n");
    write(path.join(qualityDir, ".ai-team", "reviews", "REV-1002.md"), "# REV-1002 — TASK-1002\n\n- 结论：修改后通过\n- P0=0；P1=1；P2=0\n");
    write(path.join(qualityDir, ".ai-team", "reviews", "REV-1002-R1.md"), "# REV-1002-R1 — TASK-1002-R1\n\n- 结论：通过\n- P0=0；P1=0；P2=0\n");
    write(path.join(qualityDir, ".ai-team", "security", "SEC-1002.md"), "# SEC-1002 — TASK-1002\n\n- 结论：通过\n- P0=0；P1=1；P2=0\n");

    const qualityRun = run(qualityReport, ["--project", qualityDir, "--json"], qualityDir);
    let qualityData = null;
    try {
      qualityData = JSON.parse(qualityRun.stdout || "");
    } catch {
      qualityData = null;
    }
    check("quality report json", qualityRun.status === 0 && qualityData !== null, `${qualityRun.status}; ${(qualityRun.stdout || qualityRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
    check("quality first pass", qualityData?.summary?.first_pass_rate === 0.5, JSON.stringify(qualityData?.summary || {}));
    check("quality review ready", Math.abs((qualityData?.summary?.review_ready_rate ?? -1) - (2 / 3)) < 0.001, String(qualityData?.summary?.review_ready_rate));
    check("quality review rounds", qualityData?.summary?.review_rounds_avg === 1.5, String(qualityData?.summary?.review_rounds_avg));
    check("quality p1 escapes", qualityData?.summary?.p1_escapes === 1, String(qualityData?.summary?.p1_escapes));

    const qualityMarkdown = run(qualityReport, ["--project", qualityDir], qualityDir);
    check("quality markdown escapes cells", qualityMarkdown.status === 0 && qualityMarkdown.stdout.includes("&lt;b&gt;") && !qualityMarkdown.stdout.includes("<b>"), `${qualityMarkdown.status}; ${(qualityMarkdown.stdout || qualityMarkdown.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const qualityLimited = run(qualityReport, ["--project", qualityDir, "--json", "--max-files", "1"], qualityDir);
    let limitedData = null;
    try {
      limitedData = JSON.parse(qualityLimited.stdout || "");
    } catch {
      limitedData = null;
    }
    check("quality max-files warns", qualityLimited.status === 0 && (limitedData?.data_quality?.warnings || []).some((item) => item.id === "scan-truncated"), `${qualityLimited.status}; ${JSON.stringify(limitedData?.data_quality?.warnings || [])}`);

    const badOut = run(qualityReport, ["--project", qualityDir, "--out", path.join(path.parse(qualityDir).root, "quality-evil.md")], qualityDir);
    check("quality rejects out-of-tree out", badOut.status === 2, `${badOut.status}; ${(badOut.stdout || badOut.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const noReviewDir = tmp("quality-no-review");
    try {
      write(path.join(noReviewDir, ".ai-team", "state", "TASKS.md"), [
        "# Tasks",
        "",
        "| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |",
        "|---|---|---|---|---|---|---|",
        "| TASK-2001 | 实现未审查 | ai-team/engineer | - | doing | AC | - |",
        "",
      ].join("\n"));
      const noReviewRun = run(qualityReport, ["--project", noReviewDir, "--strict"], noReviewDir);
      check("quality strict no-review fails", noReviewRun.status === 1, `${noReviewRun.status}; ${(noReviewRun.stdout || noReviewRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
    } finally {
      fs.rmSync(noReviewDir, { recursive: true, force: true });
    }

    const emptyQualityDir = tmp("quality-empty");
    try {
      const strictRun = run(qualityReport, ["--project", emptyQualityDir, "--strict"], emptyQualityDir);
      check("quality strict empty fails", strictRun.status === 1, `${strictRun.status}; ${(strictRun.stdout || strictRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
    } finally {
      fs.rmSync(emptyQualityDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(qualityDir, { recursive: true, force: true });
  }

  const ownershipDir = tmp("ownership");
  try {
    write(path.join(ownershipDir, "brief.md"), "# TASK-3001\n\n所有权：只允许修改 `src/**`, `tests/**`；禁止 `docs/**`, `infra/**`\n");
    write(path.join(ownershipDir, "allowed.txt"), "src/app.js\ntests/app.test.js\n");
    write(path.join(ownershipDir, "forbidden.txt"), "src/app.js\ndocs/readme.md\n");
    write(path.join(ownershipDir, "not-allowed.txt"), "src/app.js\nother/file.txt\n");
    write(path.join(ownershipDir, "root.md"), "README.md\n");
    write(path.join(ownershipDir, "no-paths.md"), "# TASK-3002\n\n所有权：只允许修改 fixture\n");
    write(path.join(ownershipDir, "bad-forbidden.md"), "# TASK-3003\n\n所有权：只允许修改 `src/**`；禁止修改配置文件\n");
    write(path.join(ownershipDir, "glob-md.md"), "# TASK-3004\n\n所有权：只允许修改 `**/*.md`；禁止 `infra/**`\n");
    write(path.join(ownershipDir, "traversal.md"), "# TASK-3005\n\n所有权：只允许修改 `docs/**`；禁止 `src/**`\n");
    write(path.join(ownershipDir, "traversal.txt"), "docs/../src/secret.js\n");
    write(path.join(ownershipDir, "empty.txt"), "");

    const allowedOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "brief.md"), "--diff", path.join(ownershipDir, "allowed.txt")], ownershipDir);
    check("ownership allowed", allowedOwnership.status === 0, `${allowedOwnership.status}; ${(allowedOwnership.stdout || allowedOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const forbiddenOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "brief.md"), "--diff", path.join(ownershipDir, "forbidden.txt")], ownershipDir);
    check("ownership forbidden", forbiddenOwnership.status === 1 && /docs\/readme\.md/.test(forbiddenOwnership.stdout || ""), `${forbiddenOwnership.status}; ${(forbiddenOwnership.stdout || forbiddenOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const notAllowedOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "brief.md"), "--diff", path.join(ownershipDir, "not-allowed.txt")], ownershipDir);
    check("ownership not-allowed", notAllowedOwnership.status === 1 && /other\/file\.txt/.test(notAllowedOwnership.stdout || "") && /not-allowed/.test(notAllowedOwnership.stdout || ""), `${notAllowedOwnership.status}; ${(notAllowedOwnership.stdout || notAllowedOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const unparseableOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "no-paths.md"), "--diff", path.join(ownershipDir, "allowed.txt"), "--strict"], ownershipDir);
    check("ownership strict unparseable", unparseableOwnership.status === 1, `${unparseableOwnership.status}; ${(unparseableOwnership.stdout || unparseableOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const badForbiddenOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "bad-forbidden.md"), "--diff", path.join(ownershipDir, "allowed.txt"), "--strict"], ownershipDir);
    check("ownership strict unparseable forbidden", badForbiddenOwnership.status === 1, `${badForbiddenOwnership.status}; ${(badForbiddenOwnership.stdout || badForbiddenOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const globOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "glob-md.md"), "--diff", path.join(ownershipDir, "root.md")], ownershipDir);
    check("ownership ** root match", globOwnership.status === 0, `${globOwnership.status}; ${(globOwnership.stdout || globOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const traversalOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "traversal.md"), "--diff", path.join(ownershipDir, "traversal.txt")], ownershipDir);
    check("ownership normalizes ..", traversalOwnership.status === 1 && /src\/secret\.js/.test(traversalOwnership.stdout || ""), `${traversalOwnership.status}; ${(traversalOwnership.stdout || traversalOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const emptyDiffOwnership = run(ownershipCheck, ["--brief", path.join(ownershipDir, "brief.md"), "--diff", path.join(ownershipDir, "empty.txt"), "--strict"], ownershipDir);
    check("ownership strict empty diff", emptyDiffOwnership.status === 1, `${emptyDiffOwnership.status}; ${(emptyDiffOwnership.stdout || emptyDiffOwnership.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
  } finally {
    fs.rmSync(ownershipDir, { recursive: true, force: true });
  }

  const e2eDir = tmp("e2e");
  try {
    write(path.join(e2eDir, ".ai-team", "state", "TASKS.md"), [
      "# Tasks",
      "",
      "| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |",
      "|---|---|---|---|---|---|---|",
      "| TASK-3001 | 实现离线校验 | ai-team/engineer | - | done | AC | - |",
      "",
    ].join("\n"));
    const e2eBrief = engineerBrief({ goal: "实现离线 E2E 冒烟" })
      .replace("所有权：只允许修改 fixture", "所有权：只允许修改 `src/**`；禁止 `docs/**`");
    write(path.join(e2eDir, ".ai-team", "tasks", "TASK-3001-BRIEF.md"), e2eBrief);
    write(path.join(e2eDir, ".ai-team", "reviews", "REV-3001.md"), [
      "# REV-3001 — TASK-3001",
      "",
      "- 结论：通过",
      "- P0=0；P1=0；P2=0",
      "",
      "## 越权检查",
      "",
      "- 是否修改非 owned 路径：否",
      "",
      "## 独立验证",
      "",
      "- `node test.js` exit 0",
      "",
    ].join("\n"));
    write(path.join(e2eDir, "diff.txt"), "src/app.js\n");

    const e2eBriefRun = run(briefLint, ["--brief", path.join(e2eDir, ".ai-team", "tasks", "TASK-3001-BRIEF.md"), "--agent", "ai-team/engineer"], e2eDir);
    check("e2e brief-lint", e2eBriefRun.status === 0, `${e2eBriefRun.status}; ${(e2eBriefRun.stdout || e2eBriefRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const e2eReviewRun = run(reviewCheck, ["--report", path.join(e2eDir, ".ai-team", "reviews", "REV-3001.md"), "--kind", "review", "--strict"], e2eDir);
    check("e2e review-check", e2eReviewRun.status === 0, `${e2eReviewRun.status}; ${(e2eReviewRun.stdout || e2eReviewRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    write(path.join(e2eDir, ".ai-team", "reviews", "REV-3002.md"), [
      "# REV-3002 — TASK-3002",
      "",
      "- 结论：通过",
      "",
      "## 独立验证",
      "",
      "- node 未安装，退出码未知，未执行任何命令",
      "",
    ].join("\n"));
    const zeroEvidenceReview = run(reviewCheck, ["--report", path.join(e2eDir, ".ai-team", "reviews", "REV-3002.md"), "--kind", "review", "--strict"], e2eDir);
    check("e2e review-check zero evidence", zeroEvidenceReview.status === 1, `${zeroEvidenceReview.status}; ${(zeroEvidenceReview.stdout || zeroEvidenceReview.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const e2eQualityRun = run(qualityReport, ["--project", e2eDir, "--strict", "--json"], e2eDir);
    let e2eQuality = null;
    try {
      e2eQuality = JSON.parse(e2eQualityRun.stdout || "");
    } catch {
      e2eQuality = null;
    }
    check("e2e quality strict", e2eQualityRun.status === 0 && e2eQuality?.summary?.first_pass_rate === 1, `${e2eQualityRun.status}; ${JSON.stringify(e2eQuality?.summary || {})}`);

    const e2eOwnershipRun = run(ownershipCheck, ["--brief", path.join(e2eDir, ".ai-team", "tasks", "TASK-3001-BRIEF.md"), "--diff", path.join(e2eDir, "diff.txt")], e2eDir);
    check("e2e ownership", e2eOwnershipRun.status === 0 && /changed:\s+1/.test(e2eOwnershipRun.stdout || "") && /result:\s+PASS/.test(e2eOwnershipRun.stdout || ""), `${e2eOwnershipRun.status}; ${(e2eOwnershipRun.stdout || e2eOwnershipRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const e2eArtifactRun = run(artifactCheck, ["--project", e2eDir, "--strict", "--max-files", "2000"], e2eDir);
    check("e2e artifact-check", e2eArtifactRun.status === 0, `${e2eArtifactRun.status}; ${(e2eArtifactRun.stdout || e2eArtifactRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
  } finally {
    fs.rmSync(e2eDir, { recursive: true, force: true });
  }

  const scanDir = tmp("scan");
  try {
    for (let i = 0; i < 5; i += 1) {
      write(path.join(scanDir, ".ai-team", "work", `note-${i}.md`), `hello ${i}\n`);
    }
    const escalated = run(secretCheck, ["--project", scanDir, "--max-files", "3"], scanDir);
    check("secret auto-escalates", escalated.status === 0 && /scanned:\s+5 file\(s\)/.test(escalated.stdout || ""), `${escalated.status}; ${(escalated.stdout || escalated.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const { scanSecrets } = await import(pathToFileURL(secretCheck).href);
    const capped = scanSecrets(scanDir, { maxFiles: 3, maxFilesCeiling: 3 });
    check("secret respects ceiling", capped.truncated === true && capped.limit === 3, `truncated=${capped.truncated} limit=${capped.limit}`);
    const clamped = scanSecrets(scanDir, { maxFiles: 30000 });
    check("secret clamps explicit limit", clamped.limit === 20000 && clamped.ceiling === 20000, `limit=${clamped.limit} ceiling=${clamped.ceiling}`);

    const artifact = run(artifactCheck, ["--project", scanDir, "--strict", "--max-files", "3"], scanDir);
    check("artifact auto-escalates", artifact.status === 0 && /secrets:\s+5 file\(s\)/.test(artifact.stdout || ""), `${artifact.status}; ${(artifact.stdout || artifact.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    const { checkArtifacts } = await import(pathToFileURL(artifactCheck).href);
    const artifactCapped = checkArtifacts(scanDir, { maxEvidenceFiles: 3, maxEvidenceCeiling: 3 });
    check("artifact respects ceiling", artifactCapped.errors.some((item) => item.code === "secret-scan-truncated"), JSON.stringify(artifactCapped.errors.map((item) => item.code)));
  } finally {
    fs.rmSync(scanDir, { recursive: true, force: true });
  }

  const encodingDir = tmp("encoding");
  try {
    const utf16Text = "Authorization: Bearer abcdefgh12345678\n";
    fs.mkdirSync(path.join(encodingDir, ".ai-team", "work"), { recursive: true });
    fs.writeFileSync(
      path.join(encodingDir, ".ai-team", "work", "utf16.md"),
      Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(utf16Text, "utf16le")]),
    );
    fs.writeFileSync(path.join(encodingDir, ".ai-team", "work", "binary.md"), Buffer.from([0x00, 0x01, 0x02, 0x00]));

    const { scanSecrets } = await import(pathToFileURL(secretCheck).href);
    const utf16Result = scanSecrets(encodingDir);
    check("secret scans utf16", utf16Result.findings.some((item) => item.kind === "authorization"), JSON.stringify(utf16Result.findings.map((item) => item.kind)));

    const binaryResult = scanSecrets(encodingDir);
    check("secret reports binary skip", binaryResult.skipped >= 1, `skipped=${binaryResult.skipped}`);

    const { checkArtifacts } = await import(pathToFileURL(artifactCheck).href);
    const encodingArtifact = checkArtifacts(encodingDir, { maxEvidenceFiles: 2000 });
    check("artifact blocks skipped scan", encodingArtifact.errors.some((item) => item.code === "credential-scan-skipped"), JSON.stringify(encodingArtifact.errors.map((item) => item.code)));
  } finally {
    fs.rmSync(encodingDir, { recursive: true, force: true });
  }

  const fixDir = tmp("fix");
  try {
    for (let i = 0; i < 5; i += 1) {
      write(path.join(fixDir, ".ai-team", "work", `secret-${i}.md`), "Authorization: Bearer abcdefgh12345678\n");
    }
    const { fixSecrets } = await import(pathToFileURL(secretCheck).href);
    const fixed = fixSecrets(fixDir, { maxFiles: 3 });
    check("fix reports all fixed files", fixed.fixed.length === 5, `fixed=${fixed.fixed.length}`);
  } finally {
    fs.rmSync(fixDir, { recursive: true, force: true });
  }

  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}${item.ok ? "" : ` — ${item.detail}`}`);
  }
  console.log(`checks: ${checks.length}, failed: ${failures.length}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
