#!/usr/bin/env node
/**
 * 生成标准 subagent brief 骨架（1.6.0，P-24）。
 *
 * 目的：不让 Chief 手抄脚本参数、契约字段和必填小节；生成后只填占位符，
 * 再运行 brief-lint。脚本参数统一写“以 --help 实跑为准”，契约只引章节号/字段名。
 *
 * P-32/P-34：engineer 模板增加“事务边界与部分提交”“旧行为反证”“边界四问”，
 * reviewer/QA 模板增加“边界四问”；brief-lint 会校验字段值而非字段名。
 *
 * 用法：
 *   node brief-new.mjs --task TASK-0066 --agent ai-team/engineer
 *   node brief-new.mjs --task TASK-0066 --agent ai-team/qa-engineer --out .ai-team/tasks/TASK-0066-BRIEF.md
 *   node brief-new.mjs --task TASK-0066 --agent ai-team/engineer --out ... --force
 *
 * 退出码：0 = 生成/输出成功；1 = 文件已存在；2 = 参数错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROLES = new Set([
  "ai-team/chief",
  "ai-team/product-manager",
  "ai-team/ux-designer",
  "ai-team/system-architect",
  "ai-team/engineer",
  "ai-team/code-reviewer",
  "ai-team/qa-engineer",
  "ai-team/security-auditor",
  "ai-team/devops-engineer",
  "ai-team/technical-writer",
]);

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);
const task = getArg("--task");
const rawAgent = getArg("--agent");
const agent = rawAgent ? (rawAgent.startsWith("ai-team/") ? rawAgent : `ai-team/${rawAgent}`) : null;
const out = getArg("--out");
const force = hasFlag("--force");

if (!task || !agent || !ROLES.has(agent)) {
  console.error("usage: node brief-new.mjs --task TASK-xxxx --agent ai-team/<role> [--out <file>] [--force]");
  process.exit(2);
}

const isReviewer = agent === "ai-team/code-reviewer" || agent === "ai-team/security-auditor";
const isQa = agent === "ai-team/qa-engineer";

// P-32/P-34：把事务边界与失败模式前置到 brief，减少首轮验收遗漏。
// 普通文档/UI 任务可以保留占位符或写“不适用”，由 brief-lint 按关键词判定。
const boundaryChecklist = agent === "ai-team/engineer"
  ? `事务边界与部分提交：<涉及重试/幂等/事务/并发/回滚/迁移时必填：事务范围、重放位置、部分提交可见性、失败回滚>
旧行为反证：<修复类必填：旧实现如何失败、如何证明已修复；非修复写“不适用”>
边界四问：<组件故障 / 事务回滚或部分提交 / 导出或依赖链不可用 / 拒绝顺序与豁免；逐项给结论>
`
  : isReviewer || isQa
    ? `边界四问：<组件故障 / 事务回滚或部分提交 / 导出或依赖链不可用 / 拒绝顺序与豁免；逐项给结论>
`
    : "";

// P-46/P-49：运行时/容器/外部依赖任务的真实取证必须在 brief 中显式要求，
// 不能把“单测全绿”当成运行时可用。非运行时任务写“不适用（无容器/外部依赖）”。
const runtimeChecklist = agent === "ai-team/engineer" || agent === "ai-team/devops-engineer" || isReviewer || isQa
  ? `运行时取证：<涉及容器/外部依赖/真实服务/E2E 时必填：真实命令、环境、断言、失败证据；无环境写 BLOCKED + 原始错误；单测全绿不能替代；非运行时写“不适用（无容器/外部依赖）”。>
`
  : "";

// P-53：reviewer/security 的 done 门槛；P2 未处置只能保持 review。
const doneGate = isReviewer
  ? `Done gate：P0/P1=0，且每个有实际风险的 P2 已建 TASK-*/RISK-* 并有 owner/关闭条件；否则结论只能是“不通过/保持 review”，checkpoint 不得写 done（P-53）。
`
  : "";

// P-58/P-64/P-62/P-40：review-entry 合同、切片上限、测试白名单、请求参数断言。
const reviewEntryChecklist = agent === "ai-team/engineer"
  ? `Review-entry 自检：<语义源对照表：ADR/契约章节 → 实现位置 → 测试；P1 场景逐项对照；无表不得转 review（P-58/P-65）>
门禁面：<≤2 个；超过 2 个必须拆 TASK 并列出拆分子任务（P-64）>
必然受影响测试/脚本：<白名单；无则写“无（仅生产代码）”；跨角色修改先报告（P-62）>
请求参数断言：<涉及服务端查询/幂等/筛选时必填：断言真实请求参数，禁止 mock 被校验字段；非此类写“不适用（非查询/幂等/筛选）”（P-40）>
`
  : "";

const template = `角色：${agent}
技能：ai-team-workflow${agent === "ai-team/engineer" ? "；AI 功能加 ai-team-ai-native" : ""}
任务 ID：${task}
Track / 阶段：T? / G?
目标：<一句话，可验收>
背景与输入：<文件路径、需求 ID、设计章节、契约、上一任务产物>
所有权：只允许修改 <owned paths>；禁止修改 <forbidden paths>
约束：<技术/合规/兼容/性能/时间/依赖限制；相关 DEC/ADR>
设计预审：<无 / 涉及凭据、迁移、传输、租户边界 → SEC-xxxx 通过后才能开工>
装配清单：<Bean 注册点 / 持久化仓储 / 外部依赖或制品 / 配置键 / 迁移>
契约影响：<必填；只引 API-CONTRACTS/ADR 章节号或字段名，不复制字段定义；有变更时同一提交更新契约 + 契约测试>
回归范围：<原 P1/缺陷 + 相邻路径 + 关键旅程>
${reviewEntryChecklist}${boundaryChecklist}${runtimeChecklist}${doneGate}验收标准：
- [ ] <3-6 条可检查条件>
必须执行：<命令/测试/扫描；参数以对应脚本 --help 实跑为准；环境不允许时写 BLOCKED + 原始错误>
脚本参数：以 \`<script> --help\` 实跑为准；不手抄参数
验证预算：<V0/V1 迭代用定向测试；V2 全量只对冻结候选提交跑 1 条并登记 baseline_id；Reviewer/QA 复用需校验 commit+工作区指纹并独立跑受影响模块；同一任务第 3 条全量需 Chief 批准>
独立验证：<reviewer/QA 必须实际执行的测试/扫描命令；无 shell 时写 RISK-* + 补偿证据>
证据位置：<logs/<date>/... 或 .ai-team/work/<TASK>-logs/；UTF-8；失败日志 .failed.log>
证据门禁：回报前必须运行 \`artifact-check.mjs --strict --max-files 2000\` 且 0 error/0 warning；日志只允许 \`logs/<date>/\` 或 \`.ai-team/work/<TASK>-logs/\`；根 \`logs/*.log\` 与 UTF-16 直接判失败。
测试路径：<${isQa ? "必填；" : "owner=qa-engineer 时必填；"}必须在 QA owned paths + 构建 test source root，如 server/src/test/java/**/e2e/>
构建隔离：<共享工作区串行 / 独立 worktree <path>；并行构建或审查必填>
P2 处置：<${isReviewer ? "必填；" : "修改后通过时必填；"}每个有实际风险的 P2 → TASK-* / RISK-* / 明确接受>
证据要求：命令 + 退出码 + 原始输出摘要 + 文件路径 + 未决问题；敏感值必须脱敏
禁止：不得启动 subagent；不得跨职责；不得改 \`.ai-team/state/**\`；不得伪造证据
回报格式：结论（完成/部分完成/阻塞）/ 改动 / 证据 / 风险 / 下一步 / \`TASKS.md\` 建议更新（状态+证据路径）
`;

if (!out) {
  process.stdout.write(template);
  process.exit(0);
}

const file = path.resolve(out);
if (fs.existsSync(file) && !force) {
  console.error(`ERROR  brief already exists: ${file} (use --force to overwrite)`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, template, "utf8");
console.log(`created ${file}`);
console.log("next: fill placeholders, then run brief-lint before dispatch.");
