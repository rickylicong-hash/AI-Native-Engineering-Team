#!/usr/bin/env node
/**
 * 1.9.1 gate regression fixtures.
 *
 * 覆盖：
 *   - 净零真值：last_retro_new 与最新 RETRO 新增数不一致 → FAIL；
 *   - 陈旧 frontmatter：team_open_at_last_retro 与实际不符 → FAIL；
 *   - 同轮合并：5 条新增全部 superseded → PASS；6 条超限需 exception；
 *   - 既有规则：new > 5、new > closed → FAIL；
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
const stateCheck = path.join(workflowScripts, "state-check.mjs");
const programCheck = path.join(workflowScripts, "program-check.mjs");
const nextTask = path.join(workflowScripts, "next-task.mjs");
const impactScan = path.join(workflowScripts, "impact-scan.mjs");
const integrationCheck = path.join(workflowScripts, "integration-check.mjs");
const gateCheck = path.join(workflowScripts, "gate-check.mjs");
const improveMetrics = path.join(workflowScripts, "improve-metrics.mjs");
const improvePrevious = path.join(workflowScripts, "improve-previous.mjs");
const pageCoverage = path.join(workflowScripts, "page-coverage-check.mjs");
const endpointCoverage = path.join(workflowScripts, "endpoint-coverage-check.mjs");

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

function growthText({ lastRetroNew, lastRetroClosed, teamOpenLast, teamOpenPrev, teamOpenPrev2, rows, tableRows = rows, extraTableRows = [], previousRows = [], archivedRetros = [], legacy = false, exception = "", omitTeamOpen = false, omitClosed = false }) {
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
    ...(extraTableRows.length ? [
      "### 5. 追加提案",
      "",
      "| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |",
      "|---|---|---|---|---|---|---|---|",
      ...extraTableRows.map((row) => `| ${row.id} | ${row.scope || "team"} | ${row.title} | G-01 | x | y | 2026-02-01 | 用户 |`),
      "",
    ] : []),
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

function engineerBrief({ goal = "实现一个门禁脚本", reviewEntry = "语义源：ADR §1 → 实现 → 测试；P1 场景逐项对照已填", gateSurfaces = "≤2：growth-check、brief-lint", testWhitelist = "无（仅生产代码）", requestAssertion = "不适用（非检索类任务）", verificationBudget = "V0/V1 迭代用定向；V2 全量只对冻结候选提交跑 1 条并登记 baseline_id；commit+工作区指纹必须匹配", ownership = "只允许修改 `src/**`、`tests/**`；禁止 `docs/**`", mustExecute = "node scripts/test-gates.mjs；node ownership-check.mjs --brief .ai-team/tasks/TASK-BRIEF-FIXTURE.md --diff .ai-team/work/changed-files.txt", surface = "BE", delivery = "/v1/test", deliveryStatus = "完整", skeletonDeferral = "不适用（完整交付）" } = {}) {
  return `角色：ai-team/engineer
技能：ai-team-workflow
任务 ID：TASK-BRIEF-FIXTURE
Track / 阶段：T2 / G4
目标：${goal}
背景与输入：fixture
所有权：${ownership}
约束：无
契约影响：不适用（无契约变更）
回归范围：fixture
变更面：${surface}
交付面：${delivery}
交付状态：${deliveryStatus}
骨架延期：${skeletonDeferral}
Review-entry 自检：${reviewEntry}
门禁面：${gateSurfaces}
必然受影响测试/脚本：${testWhitelist}
请求参数断言：${requestAssertion}
验收标准：
- [ ] fixture
必须执行：${mustExecute}
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
    const teamRows = (count, overrides = {}) => Array.from({ length: count }, (_, index) => ({
      ...baseRow,
      id: `P-${String(index + 1).padStart(2, "0")}`,
      title: `gate ${index + 1}`,
      ...overrides,
    }));

    const scenarios = [
      {
        name: "compliant",
        expect: 0,
        text: growthText({ lastRetroNew: 1, lastRetroClosed: 1, teamOpenLast: 1, teamOpenPrev: 2, teamOpenPrev2: 2, rows: [baseRow, closedRow], tableRows: [baseRow], previousRows: [closedRow] }),
      },
      {
        name: "pipe-injection",
        expect: 1,
        text: growthText({ lastRetroNew: 1, lastRetroClosed: 1, teamOpenLast: 1, teamOpenPrev: 2, teamOpenPrev2: 2, rows: [{ ...baseRow, title: "bad | injection" }] }),
      },
      {
        name: "multi-table-retro",
        expect: 0,
        text: growthText({
          lastRetroNew: 2,
          lastRetroClosed: 2,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          rows: [
            { id: "P-10", scope: "team", status: "done", title: "alpha done", landing: "1.0", evidence: "e", date: "2026-01-02" },
            { id: "P-11", scope: "team", status: "done", title: "beta done", landing: "1.0", evidence: "e", date: "2026-01-02" },
          ],
          tableRows: [{ id: "P-10", scope: "team", status: "done", title: "alpha done", landing: "1.0", evidence: "e", date: "2026-01-02" }],
          extraTableRows: [{ id: "P-11", scope: "team", status: "done", title: "beta done", landing: "1.0", evidence: "e", date: "2026-01-02" }],
        }),
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
        name: "new-over-five",
        expect: 1,
        text: growthText({
          lastRetroNew: 6,
          lastRetroClosed: 6,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          rows: teamRows(6, { status: "superseded", landing: "并入 P-10", evidence: "fixture" }),
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
        name: "same-round-merged-six-with-exception",
        expect: 0,
        text: growthText({
          lastRetroNew: 6,
          lastRetroClosed: 6,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          exception: "RETRO-0001: 6 new (>5); approved 2026-01-02; merged same round",
          rows: teamRows(6, { status: "superseded", landing: "并入 P-10", evidence: "fixture" }),
        }),
      },
      {
        name: "new-at-five",
        expect: 0,
        text: growthText({
          lastRetroNew: 5,
          lastRetroClosed: 5,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          rows: teamRows(5, { status: "superseded", landing: "并入 P-10", evidence: "fixture" }),
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
          lastRetroNew: 6,
          lastRetroClosed: 6,
          teamOpenLast: 0,
          teamOpenPrev: 0,
          teamOpenPrev2: 0,
          exception: "RETRO-0001",
          rows: teamRows(6, { status: "superseded", landing: "并入 P-10", evidence: "fixture" }),
        }),
      },
      {
        name: "exception-open-six",
        expect: 1,
        text: growthText({
          lastRetroNew: 6,
          lastRetroClosed: 0,
          teamOpenLast: 6,
          teamOpenPrev: 6,
          teamOpenPrev2: 6,
          exception: "RETRO-0001: 6 new (>5); approved 2026-01-02; migration",
          rows: teamRows(6),
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
      "## RETRO-0000 — archived",
      "",
      "- 归档：`team/archive/GROWTH-2025.md`",
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
    check("archive nav keeps old archived retro", /- RETRO-0000 —/.test(archivedText) && /- RETRO-0001 —/.test(archivedText), "nav should list old and newly archived RETROs");

    const invalidArchiveDir = tmp("archive-invalid");
    try {
      const invalidText = growthText({
        lastRetroNew: 1,
        lastRetroClosed: 99,
        teamOpenLast: 1,
        teamOpenPrev: 1,
        teamOpenPrev2: 1,
        rows: [
          { id: "P-01", scope: "team", status: "done", title: "old", landing: "1.0", evidence: "e", date: "2026-01-02" },
        ],
      });
      write(path.join(invalidArchiveDir, ".ai-team", "team", "GROWTH.md"), invalidText);
      const invalidArchiveRun = run(growthCheck, ["--project", invalidArchiveDir, "--archive", "--yes"], invalidArchiveDir);
      check("archive refuses invalid ledger", invalidArchiveRun.status === 1, `${invalidArchiveRun.status}; ${(invalidArchiveRun.stdout || invalidArchiveRun.stderr || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    } finally {
      fs.rmSync(invalidArchiveDir, { recursive: true, force: true });
    }
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
      { name: "brief-missing-ownership-tests", expect: 1, text: engineerBrief({ ownership: "只允许修改 fixture" }) },
      { name: "brief-missing-ownership-check", expect: 1, text: engineerBrief({ mustExecute: "node scripts/test-gates.mjs" }) },
      { name: "brief-missing-surface", expect: 1, text: engineerBrief({ surface: "" }) },
      { name: "brief-fe-without-page", expect: 1, text: engineerBrief({ surface: "FE", delivery: "/v1/test" }) },
      { name: "brief-be-without-endpoint", expect: 1, text: engineerBrief({ surface: "BE", delivery: "P-XXX-01" }) },
      { name: "brief-skeleton-without-deferral", expect: 1, text: engineerBrief({ deliveryStatus: "骨架", skeletonDeferral: "TBD" }) },
      { name: "brief-fe-with-page", expect: 0, text: engineerBrief({ surface: "FE", delivery: "P-XXX-01", deliveryStatus: "完整", skeletonDeferral: "不适用（完整交付）" }) },
      { name: "brief-skeleton-with-deferral", expect: 0, text: engineerBrief({ deliveryStatus: "骨架", skeletonDeferral: "DEC-0124，复查 2026-12-07，端点合并后接线并补 E2E" }) },
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

  const pageDir = tmp("pagecov");
  try {
    const mapFile = path.join(pageDir, ".ai-team", "design", "ux", "PAGE-MAP.json");
    write(path.join(pageDir, "src", "App.vue"), "<template>ok</template>\n");
    const baseMap = (placeholderDeferral = null) => ({
      schema: 1,
      current_milestone: "M1",
      milestones: ["M1", "M2"],
      pages: [
        { id: "P-001", path: "/", priority: "P0", milestone: "M1", status: "real", evidence: "src/App.vue" },
        {
          id: "P-002",
          path: "/todo",
          priority: "P0",
          milestone: "M1",
          status: "placeholder",
          ...(placeholderDeferral ? { deferral: placeholderDeferral } : {}),
        },
      ],
    });
    write(mapFile, JSON.stringify(baseMap(), null, 2));
    const pageFail = run(pageCoverage, ["--project", pageDir, "--json"], pageDir);
    let pageFailData = null;
    try { pageFailData = JSON.parse(pageFail.stdout || ""); } catch { pageFailData = null; }
    check("page coverage rejects P0 placeholder without deferral", pageFail.status === 1 && pageFailData?.summary?.due?.p0_real === 1, `${pageFail.status}; ${(pageFail.stdout || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);

    write(mapFile, JSON.stringify(baseMap({ decision: "DEC-0124", review_at: "2026-12-07", upgrade_trigger: "后端端点合并后接线" }), null, 2));
    const pagePass = run(pageCoverage, ["--project", pageDir, "--json"], pageDir);
    let pagePassData = null;
    try { pagePassData = JSON.parse(pagePass.stdout || ""); } catch { pagePassData = null; }
    check("page coverage accepts documented deferral", pagePass.status === 0 && pagePassData?.ok === true, `${pagePass.status}; ${(pagePass.stdout || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
  } finally {
    fs.rmSync(pageDir, { recursive: true, force: true });
  }

  const endpointDir = tmp("endpointcov");
  try {
    const mapFile = path.join(endpointDir, ".ai-team", "design", "architecture", "ENDPOINT-MAP.json");
    write(path.join(endpointDir, ".ai-team", "design", "architecture", "API-CONTRACTS.md"), [
      "# Contracts",
      "",
      "| Method | Path | Notes |",
      "|---|---|---|",
      "| GET | `/v1/ok` | fixture |",
      "| GET | `/v1/missing` | fixture |",
      "",
    ].join("\n"));
    write(path.join(endpointDir, "server", "OkController.java"), "class OkController {}\n");
    write(mapFile, JSON.stringify({
      schema: 1,
      endpoints: [{ method: "GET", path: "/v1/ok", status: "implemented", evidence: "server/OkController.java" }],
    }, null, 2));
    const endpointFail = run(endpointCoverage, ["--project", endpointDir, "--json"], endpointDir);
    let endpointFailData = null;
    try { endpointFailData = JSON.parse(endpointFail.stdout || ""); } catch { endpointFailData = null; }
    check("endpoint coverage rejects contract endpoint without map", endpointFail.status === 1 && endpointFailData?.summary?.missing === 1, `${endpointFail.status}; ${(endpointFail.stdout || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);

    write(mapFile, JSON.stringify({
      schema: 1,
      endpoints: [
        { method: "GET", path: "/v1/ok", status: "implemented", evidence: "server/OkController.java" },
        { method: "GET", path: "/v1/missing", status: "deferred", deferral: { decision: "DEC-0124", review_at: "2026-12-07" } },
      ],
    }, null, 2));
    const endpointPass = run(endpointCoverage, ["--project", endpointDir, "--json"], endpointDir);
    let endpointPassData = null;
    try { endpointPassData = JSON.parse(endpointPass.stdout || ""); } catch { endpointPassData = null; }
    check("endpoint coverage accepts documented deferral", endpointPass.status === 0 && endpointPassData?.summary?.covered === 2, `${endpointPass.status}; ${(endpointPass.stdout || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
  } finally {
    fs.rmSync(endpointDir, { recursive: true, force: true });
  }

  const qualityDir = tmp("quality");
  try {
    write(path.join(qualityDir, ".ai-team", "state", "TASKS.md"), [
      "# Tasks",
      "",
      "| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |",
      "|---|---|---|---|---|---|---|",
      "| TASK-1001 | 实现登录 | ai-team/engineer | - | done | AC | - |",
      "| TASK-1001-R1 | 复核登录 | ai-team/code-reviewer | - | done | AC | - |",
      "| TASK-1002 | 实现支付 | ai-team/engineer | - | done | AC | - |",
      "| TASK-1003 | 审查登录 | ai-team/code-reviewer | - | done | AC | - |",
      "| TASK-1004 | 实现导出 | ai-team/engineer<b> | - | doing | AC | - |",
      "",
    ].join("\n"));
    write(path.join(qualityDir, ".ai-team", "reviews", "REV-1001.md"), "# REV-1001 — TASK-1001\n\n| 项 | 内容 |\n|---|---|\n| 结论 | **通过** |\n| P0 | 0 |\n| P1 | 0 |\n| P2 | 0 |\n");
    write(path.join(qualityDir, ".ai-team", "reviews", "REV-1002.md"), "# REV-1002 — TASK-1002\n\n- 结论：修改后通过\n- P0=0；P1=1；P2=0\n");
    write(path.join(qualityDir, ".ai-team", "reviews", "REV-1002-R1.md"), "# REV-1002-R1 — TASK-1002-R1\n\n- 结论：通过\n- P0=0；P1=0；P2=0\n");
    write(path.join(qualityDir, ".ai-team", "security", "SEC-1002.md"), "# SEC-1002 — TASK-1002\n\n- 结论：通过\n- P0=0；P1=1；P2=0\n");
    write(path.join(qualityDir, "src", "App.vue"), "<template>ok</template>\n");
    write(path.join(qualityDir, ".ai-team", "design", "ux", "PAGE-MAP.json"), JSON.stringify({
      schema: 1,
      current_milestone: "M1",
      milestones: ["M1"],
      pages: [{ id: "P-001", path: "/", priority: "P0", milestone: "M1", status: "real", evidence: "src/App.vue" }],
    }, null, 2));

    const qualityRun = run(qualityReport, ["--project", qualityDir, "--json"], qualityDir);
    let qualityData = null;
    try {
      qualityData = JSON.parse(qualityRun.stdout || "");
    } catch {
      qualityData = null;
    }
    check("quality report json", qualityRun.status === 0 && qualityData !== null, `${qualityRun.status}; ${(qualityRun.stdout || qualityRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
    check("quality first pass verified", qualityData?.summary?.first_pass_rate === 0.5, JSON.stringify(qualityData?.summary || {}));
    check("quality first pass all reviewed", qualityData?.summary?.first_pass_rate_all === 0.5, String(qualityData?.summary?.first_pass_rate_all));
    check("quality first pass unverified", qualityData?.summary?.first_pass_unverified === 0, String(qualityData?.summary?.first_pass_unverified));
    check("quality review ready", Math.abs((qualityData?.summary?.review_ready_rate ?? -1) - (2 / 3)) < 0.001, String(qualityData?.summary?.review_ready_rate));
    check("quality review ready done", qualityData?.summary?.review_ready_rate_done === 1, String(qualityData?.summary?.review_ready_rate_done));
    check("quality window first pass", qualityData?.summary?.window_first_pass_rate === 0.5, String(qualityData?.summary?.window_first_pass_rate));
    check("quality review rounds", qualityData?.summary?.review_rounds_avg === 1.5, String(qualityData?.summary?.review_rounds_avg));
    check("quality p1 escapes", qualityData?.summary?.p1_escapes === 1, String(qualityData?.summary?.p1_escapes));
    check("quality surface page metrics", qualityData?.summary?.surface_pages_present === true && qualityData?.summary?.surface_p0_real === 1, JSON.stringify({ present: qualityData?.summary?.surface_pages_present, p0: qualityData?.summary?.surface_p0_real }));

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

    write(path.join(e2eDir, ".ai-team", "reviews", "REV-3003.md"), [
      "# REV-3003 — TASK-3001",
      "",
      "## Review-entry 核对",
      "",
      "- 语义源：ADR §1 → src/app.js → test",
      "",
      "## 独立验证",
      "",
      "- `node test.js` exit 0",
      "",
    ].join("\n"));
    const modernMissing = run(reviewCheck, ["--report", path.join(e2eDir, ".ai-team", "reviews", "REV-3003.md"), "--kind", "review", "--strict"], e2eDir);
    check("e2e review-check modern sections required", modernMissing.status === 1, `${modernMissing.status}; ${(modernMissing.stdout || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

    write(path.join(e2eDir, ".ai-team", "reviews", "REV-3003.md"), [
      "# REV-3003 — TASK-3001",
      "",
      "## Review-entry 核对",
      "",
      "- 语义源：ADR §1 → src/app.js → test",
      "",
      "## 越权检查",
      "",
      "- `ownership-check --brief brief.md --diff diff.txt`：PASS",
      "",
      "## P2 处置",
      "",
      "| P2 ID | 问题 | 处置 | Owner | 关闭条件 |",
      "|---|---|---|---|---|",
      "| P2-01 | none | 接受 | reviewer | n/a |",
      "",
      "## Done gate",
      "",
      "- [x] P0/P1=0",
      "",
      "## 独立验证",
      "",
      "- `node test.js` exit 0",
      "",
    ].join("\n"));
    const modernComplete = run(reviewCheck, ["--report", path.join(e2eDir, ".ai-team", "reviews", "REV-3003.md"), "--kind", "review", "--strict"], e2eDir);
    check("e2e review-check modern sections pass", modernComplete.status === 0, `${modernComplete.status}; ${(modernComplete.stdout || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);

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

  const sizeDir = tmp("size");
  try {
    const largeFile = path.join(sizeDir, ".ai-team", "work", "large.md");
    write(largeFile, `${"x".repeat(20)}\nAuthorization: Bearer abcdefgh12345678\n`);
    const sizeRun = run(secretCheck, ["--project", sizeDir, "--max-file-bytes", "5", "--json"], sizeDir);
    let sizeData = null;
    try {
      sizeData = JSON.parse(sizeRun.stdout || "");
    } catch {
      sizeData = null;
    }
    check("secret enforces max-file-bytes", (sizeData?.oversized || 0) >= 1 && sizeData?.result !== "PASS", `${sizeRun.status}; ${JSON.stringify({ oversized: sizeData?.oversized, result: sizeData?.result })}`);

    const { scanSecrets: scanForTimeout } = await import(pathToFileURL(secretCheck).href);
    const timeoutResult = scanForTimeout(sizeDir, { maxDurationMs: -1 });
    check("secret enforces max-duration-ms", timeoutResult.timedOut === true, `timedOut=${timeoutResult.timedOut}`);

    const bigDir = tmp("artifact-oversize");
    try {
      const bigFile = path.join(bigDir, ".ai-team", "work", "big.md");
      fs.mkdirSync(path.dirname(bigFile), { recursive: true });
      fs.writeFileSync(bigFile, `${"x".repeat(6 * 1024 * 1024)}\nAuthorization: Bearer abcdefgh12345678\n`);
      const bigArtifact = run(artifactCheck, ["--project", bigDir, "--strict", "--max-files", "2000"], bigDir);
      check("artifact blocks oversized evidence", bigArtifact.status === 1 && /credential-scan-oversized/.test(bigArtifact.stdout || ""), `${bigArtifact.status}; ${(bigArtifact.stdout || bigArtifact.stderr || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    } finally {
      fs.rmSync(bigDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(sizeDir, { recursive: true, force: true });
  }

  const gbkDir = tmp("gbk");
  try {
    const gbkFile = path.join(gbkDir, ".ai-team", "work", "gbk.md");
    fs.mkdirSync(path.dirname(gbkFile), { recursive: true });
    const gbkBuffer = Buffer.concat([
      Buffer.from([0xD6, 0xD0, 0xCE, 0xC4, 0x0A]),
      Buffer.from("Authorization: Bearer abcdefgh12345678\n", "ascii"),
    ]);
    fs.writeFileSync(gbkFile, gbkBuffer);
    const gbkRun = run(secretCheck, ["--project", gbkDir, "--fix", "--json"], gbkDir);
    let gbkData = null;
    try {
      gbkData = JSON.parse(gbkRun.stdout || "");
    } catch {
      gbkData = null;
    }
    const after = fs.readFileSync(gbkFile);
    check("secret fix refuses non-utf8", (gbkData?.fixUnsupported || []).length > 0 && gbkBuffer.equals(after), `${gbkRun.status}; unsupported=${(gbkData?.fixUnsupported || []).length}; unchanged=${gbkBuffer.equals(after)}`);
  } finally {
    fs.rmSync(gbkDir, { recursive: true, force: true });
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

  const stateCoreDir = tmp("state-core");
  try {
    write(path.join(stateCoreDir, ".ai-team", "state", "TASKS.md"), [
      "# Tasks",
      "",
      "| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |",
      "|---|---|---|---|---|---|---|",
      "| TASK-9001 | fixture | ai-team/engineer | - | todo | AC | - |",
      "",
    ].join("\n"));
    const missing = run(stateCheck, ["--project", stateCoreDir], stateCoreDir);
    check("state-check missing core files fails", missing.status === 1, `${missing.status}; ${(missing.stdout || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    const boot = run(stateCheck, ["--project", stateCoreDir, "--bootstrap"], stateCoreDir);
    check("state-check bootstrap allows initialization", boot.status === 0, `${boot.status}; ${(boot.stdout || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    write(path.join(stateCoreDir, ".ai-team", "state", "PROJECT.md"), "---\ntrack: T2\nstage: G0\n---\n# Project\n");
    write(path.join(stateCoreDir, ".ai-team", "state", "STATUS.md"), "# Status\n\n- Track: T2\n- Stage: G0 Intake\n- Retro: not due\n- Checkpoint: none\n");
    const complete = run(stateCheck, ["--project", stateCoreDir], stateCoreDir);
    check("state-check complete state passes", complete.status === 0, `${complete.status}; ${(complete.stdout || "").trim().split(/\r?\n/).slice(-4).join(" | ")}`);
    const artifactsOk = run(stateCheck, ["--project", stateCoreDir, "--artifacts-ok", "--json"], stateCoreDir);
    let artifactsData = null;
    try { artifactsData = JSON.parse(artifactsOk.stdout || ""); } catch { artifactsData = null; }
    check("state-check artifacts-ok skips duplicate scan", artifactsOk.status === 0 && artifactsData?.artifacts?.skipped === true, `${artifactsOk.status}; ${JSON.stringify(artifactsData?.artifacts || {})}`);
  } finally {
    fs.rmSync(stateCoreDir, { recursive: true, force: true });
  }

  const gateDir = tmp("gate");
  try {
    write(path.join(gateDir, ".ai-team", "state", "PROJECT.md"), "---\ntrack: T2\nstage: G0\n---\n# Project\n");
    write(path.join(gateDir, ".ai-team", "state", "STATUS.md"), "# Status\n\n- Track: T2\n- Stage: G0 Intake\n- Retro: not due\n- Checkpoint: none\n");
    write(path.join(gateDir, ".ai-team", "state", "TASKS.md"), "# Tasks\n\n| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |\n|---|---|---|---|---|---|---|\n| TASK-9201 | fixture | ai-team/engineer | - | todo | AC | - |\n");
    fs.mkdirSync(path.join(gateDir, ".ai-team", "team"), { recursive: true });
    fs.copyFileSync(path.join(process.cwd(), ".ai-team", "team", "GROWTH.md"), path.join(gateDir, ".ai-team", "team", "GROWTH.md"));
    write(path.join(gateDir, "src", "App.vue"), "<template>ok</template>\n");
    write(path.join(gateDir, ".ai-team", "design", "ux", "PAGE-MAP.json"), JSON.stringify({
      schema: 1,
      current_milestone: "M1",
      milestones: ["M1"],
      pages: [{ id: "P-001", path: "/", priority: "P0", milestone: "M1", status: "real", evidence: "src/App.vue" }],
    }, null, 2));
    spawnSync("git", ["init", "-q"], { cwd: gateDir, encoding: "utf8" });
    spawnSync("git", ["config", "user.email", "fixture@example.com"], { cwd: gateDir, encoding: "utf8" });
    spawnSync("git", ["config", "user.name", "fixture"], { cwd: gateDir, encoding: "utf8" });
    spawnSync("git", ["add", "."], { cwd: gateDir, encoding: "utf8" });
    spawnSync("git", ["commit", "-q", "-m", "fixture"], { cwd: gateDir, encoding: "utf8" });
    const gateRun = run(gateCheck, ["--project", gateDir, "--mode", "start", "--offline", "--json"], gateDir);
    let gateData = null;
    try { gateData = JSON.parse(gateRun.stdout || ""); } catch { gateData = null; }
    check("gate-check unified preflight", gateRun.status === 0 && gateData?.artifacts?.ok === true && gateData?.state?.parsed?.artifacts?.skipped === true, `${gateRun.status}; ${JSON.stringify({ artifacts: gateData?.artifacts?.ok, stateSkipped: gateData?.state?.parsed?.artifacts?.skipped, failures: gateData?.failures })}`);
    check("gate-check runs page coverage", gateData?.surface?.pages?.ok === true && gateData?.surface?.pages?.parsed?.summary?.real === 1, `${JSON.stringify(gateData?.surface?.pages || {})}`);
  } finally {
    fs.rmSync(gateDir, { recursive: true, force: true });
  }

  const programDir = tmp("program");
  try {
    const program = (deps) => [
      "# Program",
      "",
      "## 2. Workstreams",
      "",
      "| ID | Owner | 范围 | 依赖 | 状态 | 契约 | 基线 |",
      "|---|---|---|---|---|---|---|",
      `| WS-01 | ai-team/engineer | src | ${deps} | doing | API-CONTRACTS §1 | pending |`,
      `| WS-02 | ai-team/engineer | web | ${deps === "-" ? "WS-01" : "-"} | planning | API-CONTRACTS §2 | pending |`,
      "",
    ].join("\n");
    write(path.join(programDir, ".ai-team", "state", "PROGRAM.md"), program("-"));
    const okProgram = run(programCheck, ["--project", programDir, "--json"], programDir);
    check("program-check valid graph", okProgram.status === 0, `${okProgram.status}; ${(okProgram.stdout || okProgram.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
    const cycleText = program("-").replace(
      "| WS-01 | ai-team/engineer | src | - | doing |",
      "| WS-01 | ai-team/engineer | src | WS-02 | doing |",
    );
    write(path.join(programDir, ".ai-team", "state", "PROGRAM.md"), cycleText);
    const cycleProgram = run(programCheck, ["--project", programDir, "--json"], programDir);
    check("program-check rejects cycle", cycleProgram.status === 1, `${cycleProgram.status}; ${(cycleProgram.stdout || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
  } finally {
    fs.rmSync(programDir, { recursive: true, force: true });
  }

  const queueDir = tmp("queue");
  try {
    write(path.join(queueDir, ".ai-team", "state", "QUEUE.json"), JSON.stringify({
      schema: 1,
      tasks: [
        { id: "TASK-9101", title: "ready", owner: "ai-team/engineer", priority: 2, status: "ready", dependsOn: [] },
        { id: "TASK-9102", title: "blocked", owner: "ai-team/engineer", priority: 1, status: "ready", dependsOn: ["TASK-9101"] },
      ],
    }, null, 2));
    const queueRun = run(nextTask, ["--project", queueDir, "--json"], queueDir);
    let queueData = null;
    try { queueData = JSON.parse(queueRun.stdout || ""); } catch { queueData = null; }
    check("next-task picks dependency-ready task", queueRun.status === 0 && queueData?.next?.id === "TASK-9101", `${queueRun.status}; ${JSON.stringify(queueData?.next || {})}`);
  } finally {
    fs.rmSync(queueDir, { recursive: true, force: true });
  }

  const impactDir = tmp("impact");
  try {
    write(path.join(impactDir, "package.json"), "{\"name\":\"fixture\"}\n");
    write(path.join(impactDir, "src", "a.js"), "export const a = 1;\n");
    write(path.join(impactDir, "src", "a.test.js"), "import './a.js';\n");
    write(path.join(impactDir, "diff.txt"), "src/a.js\n");
    const impactRun = run(impactScan, ["--project", impactDir, "--diff", "diff.txt", "--json"], impactDir);
    let impactData = null;
    try { impactData = JSON.parse(impactRun.stdout || ""); } catch { impactData = null; }
    check("impact-scan finds affected test", impactRun.status === 0 && impactData?.affectedTests?.includes("src/a.test.js"), `${impactRun.status}; ${JSON.stringify(impactData?.affectedTests || [])}`);
  } finally {
    fs.rmSync(impactDir, { recursive: true, force: true });
  }

  const integrationDir = tmp("integration");
  try {
    write(path.join(integrationDir, ".ai-team", "state", "INTEGRATION.md"), [
      "# Integration",
      "",
      "- 集成候选 commit：`abc1234`",
      "- `baseline_id`：`INTEGRATION-abc1234-1`",
      "- 全量命令：`npm test`",
      "- 退出码：0",
      "- 冒烟命令：`npm run smoke`",
      "- 回滚命令：`npm run rollback`",
      "- 结论：通过",
      "",
      "## 2. 合并顺序",
      "",
      "| 顺序 | Workstream | Commit | 依赖 | 状态 |",
      "|---:|---|---|---|---|",
      "| 1 | WS-01 | `abc1234` | - | merged |",
      "",
    ].join("\n"));
    const integrationRun = run(integrationCheck, ["--project", integrationDir, "--strict", "--json"], integrationDir);
    check("integration-check validates record", integrationRun.status === 0, `${integrationRun.status}; ${(integrationRun.stdout || integrationRun.stderr || "").trim().split(/\r?\n/).slice(-3).join(" | ")}`);
  } finally {
    fs.rmSync(integrationDir, { recursive: true, force: true });
  }

  const metricsDir = tmp("metrics");
  try {
    write(path.join(metricsDir, ".ai-team", "state", "TASKS.md"), "# Tasks\n\n| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |\n|---|---|---|---|---|---|---|\n| TASK-9301 | fixture | ai-team/engineer | - | todo | AC | - |\n");
    fs.mkdirSync(path.join(metricsDir, ".ai-team", "team"), { recursive: true });
    fs.copyFileSync(path.join(process.cwd(), ".ai-team", "team", "GROWTH.md"), path.join(metricsDir, ".ai-team", "team", "GROWTH.md"));
    const first = run(improveMetrics, ["--project", metricsDir, "--write", "--no-sessions", "--json"], metricsDir);
    let firstData = null;
    try { firstData = JSON.parse(first.stdout || ""); } catch { firstData = null; }
    check("improve-metrics first run records history", first.status === 0 && firstData?.verdict === "first-run" && firstData?.entries === 1, `${first.status}; ${JSON.stringify({ verdict: firstData?.verdict, entries: firstData?.entries })}`);
    const second = run(improveMetrics, ["--project", metricsDir, "--write", "--no-sessions", "--json"], metricsDir);
    let secondData = null;
    try { secondData = JSON.parse(second.stdout || ""); } catch { secondData = null; }
    check("improve-metrics second run compares history", second.status === 0 && secondData?.entries === 2 && secondData?.previous !== null && secondData?.negativeGrowth === false, `${second.status}; ${JSON.stringify({ entries: secondData?.entries, verdict: secondData?.verdict, negativeGrowth: secondData?.negativeGrowth })}`);
  } finally {
    fs.rmSync(metricsDir, { recursive: true, force: true });
  }

  const previousDir = tmp("previous");
  try {
    write(path.join(previousDir, ".ai-team", "state", "TASKS.md"), "# Tasks\n\n| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |\n|---|---|---|---|---|---|---|\n| TASK-9401 | done fixture | ai-team/engineer | - | done | AC | - |\n| TASK-9402 | missed fixture | ai-team/engineer | - | todo | AC | - |\n");
    write(path.join(previousDir, ".ai-team", "team", "TEAM-IMPROVEMENT-2026-11-09.md"), [
      "# TEAM-IMPROVEMENT — fixture",
      "",
      "## 5. 本轮任务",
      "",
      "| ID | 标题 | Owner | 验收 | 证据 |",
      "|---|---|---|---|---|",
      "| TASK-9401 | done fixture | ai-team/engineer | AC | - |",
      "| TASK-9402 | missed fixture closes P-66 (title must not be parsed as task) | ai-team/engineer | AC | - |",
      "| P-99 | proposed fixture | ai-team/chief | AC | - |",
      "",
    ].join("\n"));
    const prevRun = run(improvePrevious, ["--project", previousDir, "--json"], previousDir);
    let prevData = null;
    try { prevData = JSON.parse(prevRun.stdout || ""); } catch { prevData = null; }
    check("improve-previous checks last round", prevRun.status === 0 && prevData?.done === 1 && prevData?.missed === 1 && prevData?.unverified === 1 && prevData?.items?.length === 3, `${prevRun.status}; ${JSON.stringify({ done: prevData?.done, missed: prevData?.missed, unverified: prevData?.unverified, items: prevData?.items?.length })}`);
  } finally {
    fs.rmSync(previousDir, { recursive: true, force: true });
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
