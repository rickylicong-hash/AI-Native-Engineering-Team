#!/usr/bin/env node
/**
 * Subagent brief 预检（1.6.0）。
 *
 * 派发 subagent 前先写 brief 文件，再运行本脚本；缺字段直接拒绝派发。
 * 1.6.0 起额外强制：脚本参数以 --help 实跑为准、契约只引章节号/字段名、
 * 证据位置含 UTF-8。
 *
 * P-32/P-34：含“重试/幂等/事务/并发/回滚/迁移”的 engineer brief 强制
 * “事务边界与部分提交”“旧行为反证”；reviewer/QA brief 强制“边界四问”。
 * 校验的是字段值：非空、不是 `<...>` 占位符、不是纯 `-`，只看字段名会误判。
 * 关键词任务不接受“不适用/N/A/无”；边界四问至少覆盖 2 个维度才算回答。
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 取字段“冒号之后”的值；字段不存在返回 null。 */
function fieldValue(labels) {
  const names = labels.map((label) => escapeRegExp(label.replace(/[：:]\s*$/, ""))).join("|");
  const matched = text.match(new RegExp(`^[ \\t>*\\-]*(?:${names})[ \\t]*[：:][ \\t]*(.*)$`, "m"));
  return matched ? matched[1].trim() : null;
}

/**
 * 字段值是否真的填写：非空、不是纯 `-`、不能只有 `<...>` 占位符。
 * 例如 `<组件故障 / ...>`、`<...> / <...>` 都算未填。
 */
function isFilled(value) {
  if (value === null || value === undefined) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^[-—–_]+$/.test(trimmed)) return false;
  const remainder = trimmed.replace(/<[^<>]*>/g, "").replace(/[\s/、,，;；|]+/g, "");
  return remainder.length > 0;
}

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
  evidence_gate: ["证据门禁"],
  encoding: ["UTF-8", "utf8", "utf-8"],
  evidence_req: ["证据要求"],
  forbidden: ["禁止"],
  report: ["## 回报格式", "回报格式"],
  build_isolation: ["构建隔离"],
  review_entry: ["Review-entry 自检"],
  gate_surfaces: ["门禁面"],
  test_whitelist: ["必然受影响测试/脚本"],
  request_assertion: ["请求参数断言"],
};

const required = [
  "role", "skill", "task", "track", "goal", "background", "ownership", "constraints",
  "acceptance", "must", "script_help", "contract_ref", "evidence_location", "evidence_gate", "encoding",
  "evidence_req", "forbidden", "report", "build_isolation",
];

const reviewerAgent = agent === "code-reviewer" || agent === "security-auditor";
const runtimeAgent = agent === "engineer" || agent === "devops-engineer" || reviewerAgent || agent === "qa-engineer";
if (runtimeAgent) {
  fields.runtime_evidence = ["运行时取证"];
  required.push("runtime_evidence");
}
if (reviewerAgent) {
  fields.done_gate = ["Done gate", "完成门"];
  required.push("done_gate");
}

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
if (agent === "engineer") {
  required.push("review_entry", "gate_surfaces", "test_whitelist");
}

const missing = [];
const present = {};
for (const [key, needles] of Object.entries(fields)) {
  present[key] = hasAny(needles);
  if (required.includes(key) && !present[key]) missing.push(key);
}

// P-32/P-34：新增字段必须看值。先剔除字段名（“事务边界与部分提交”自带
// “事务”）和 `<...>` 占位符，避免模板自身触发关键词、或把占位符当成已填。
// 同时剔除否定语境（“不涉及迁移”）和流程术语“事务门禁”，避免实现/评审本
// 门禁的 brief 被自己的说明文字误伤。
// 注意：不再整段删除“重试/幂等/事务/并发/回滚/迁移”枚举串——那会让
// “本任务涉及重试/…”这类正文绕过 needs_transaction 判定。
const keywordText = text
  .replace(/^[ \t>*\-]*运行时取证[：:].*$/gm, "")
  .replace(/<[^<>]*>/g, "")
  .replace(/事务边界与部分提交/g, "")
  .replace(/旧行为反证/g, "")
  .replace(/边界四问/g, "")
  .replace(/运行时取证/g, "")
  .replace(/Done gate/g, "")
  .replace(/不适用（无容器\/外部依赖）/g, "")
  .replace(/无容器\/外部依赖/g, "")
  .replace(/非运行时(?:任务|场景)?/g, "")
  .replace(/不涉及[^；。，,\n]*/g, (clause) => clause.replace(/重试|幂等|事务|并发|回滚|迁移/g, ""))
  .replace(/事务门禁/g, "");
const needsTransaction = /重试|幂等|事务|并发|回滚|迁移/.test(keywordText);
const runtimeText = keywordText.replace(/不涉及[^；。，,\n]*/g, "");
const needsRuntime = /容器|docker|seccomp|attach|外部依赖|真实服务|E2E|redis|postgres(?:ql)?|mysql|kafka|rabbitmq?|数据库|缓存|消息队列|第三方\s*api/i.test(runtimeText);
const requestText = keywordText.replace(/^[ \t>*\-]*事务边界与部分提交[：:].*$/gm, "");
const needsRequestAssertion = /查询|筛选|分页|query|filter|idempot|幂等/i.test(requestText);

/**
 * “不适用/N/A/无”不是有效回答：关键词任务必须写具体边界或证明。
 * 只匹配整个值（允许尾随标点），避免把“无降级路径，整单回滚”误判为未填。
 */
function isNotApplicable(value) {
  return /^(?:不适用|不涉及|无|n\/?a|none|not applicable|not needed)[\s。.！!，,；;]*$/i.test(value.trim());
}

// “边界四问”的四个维度；整篇按关键词命中计数，至少命中 2 个才算回答。
const BOUNDARY_DIMENSIONS = [
  { name: "组件故障", pattern: /组件故障|组件失效|组件不可用|依赖不可用|降级/ },
  { name: "部分提交/事务回滚", pattern: /部分提交|事务回滚|回滚/ },
  { name: "导出/依赖链", pattern: /导出|依赖链/ },
  { name: "拒绝顺序/豁免", pattern: /拒绝顺序|鉴权顺序|豁免/ },
];

function boundaryDimensionHits(value) {
  return BOUNDARY_DIMENSIONS.filter((dimension) => dimension.pattern.test(value)).length;
}

const valueChecks = [];
if (agent === "engineer" && needsTransaction) {
  valueChecks.push(
    { key: "retry_boundary", labels: ["事务边界与部分提交：", "事务边界与部分提交:"], rejectNotApplicable: true },
    { key: "old_behavior", labels: ["旧行为反证：", "旧行为反证:"], rejectNotApplicable: true },
  );
}
if (agent === "engineer") {
  valueChecks.push(
    { key: "review_entry", labels: ["Review-entry 自检：", "Review-entry 自检:"], validate: (value) => /语义源|ADR|契约/.test(value) && /P1/.test(value) && /测试/.test(value) },
    { key: "gate_surfaces", labels: ["门禁面：", "门禁面:"], validate: (value) => /(≤|<=)\s*2|两个|2\s*个|拆分/.test(value) },
    { key: "test_whitelist", labels: ["必然受影响测试/脚本：", "必然受影响测试/脚本:"], validate: (value) => /(无|TASK-|测试|脚本)/.test(value) },
  );
  if (needsRequestAssertion) {
    valueChecks.push({ key: "request_assertion", labels: ["请求参数断言：", "请求参数断言:"], validate: (value) => /断言/.test(value) && /请求参数/.test(value) && /(禁止\s*mock|不\s*mock|真实请求)/i.test(value) });
  }
}
if (agent === "code-reviewer" || agent === "security-auditor" || agent === "qa-engineer") {
  valueChecks.push({ key: "boundary_four", labels: ["边界四问：", "边界四问:"], minBoundaryDimensions: 2 });
}

const valueMissing = new Set();
const valueReasons = new Map();
for (const item of valueChecks) {
  const value = fieldValue(item.labels);
  fields[item.key] = item.labels;
  let filled = isFilled(value);
  let reason = filled ? "" : "value empty or placeholder";
  if (filled && item.rejectNotApplicable && isNotApplicable(value)) {
    filled = false;
    reason = "value is 'not applicable' but the brief needs a transaction boundary";
  }
  if (filled && item.minBoundaryDimensions) {
    const hits = boundaryDimensionHits(value);
    if (isNotApplicable(value) || hits < item.minBoundaryDimensions) {
      filled = false;
      reason = `boundary four must cover at least ${item.minBoundaryDimensions} dimensions (got ${hits})`;
    }
  }
  if (filled && item.validate && !item.validate(value)) {
    filled = false;
    reason = "value does not satisfy the required review-entry format";
  }
  present[item.key] = filled;
  required.push(item.key);
  if (!filled) {
    missing.push(item.key);
    valueMissing.add(item.key);
    valueReasons.set(item.key, reason);
  }
}

// P-46：证据门禁必须是可执行的 artifact-check --strict --max-files 2000，而不是“注意编码”。
const evidenceGateValue = fieldValue(["证据门禁：", "证据门禁:"]);
const evidenceGateOk = isFilled(evidenceGateValue)
  && /artifact-check/.test(evidenceGateValue)
  && /--strict/.test(evidenceGateValue)
  && /--max-files\s*=?\s*2000/.test(evidenceGateValue)
  && /0\s*error/i.test(evidenceGateValue)
  && /(logs\/|\.ai-team\/work)/.test(evidenceGateValue);
present.evidence_gate = evidenceGateOk;
if (!evidenceGateOk && !missing.includes("evidence_gate")) {
  missing.push("evidence_gate");
  valueReasons.set("evidence_gate", "must require artifact-check --strict --max-files 2000, 0 errors and allowed log paths");
}

// P2-05：证据位置不能是项目外绝对路径或根 logs/*.log；只接受 logs/<date>/ 或 .ai-team/{work,reviews}/。
const evidenceLocationValue = fieldValue(["证据位置：", "证据位置:"]);
const evidenceLocationOk = isFilled(evidenceLocationValue)
  && !/^[A-Za-z]:[\\/]/.test(evidenceLocationValue.trim())
  && !/(^|\s)`?logs\/[^/\s]+\.log/i.test(evidenceLocationValue)
  && /(logs\/\d{4}-\d{2}-\d{2}\/|\.ai-team\/(?:work|reviews)\/)/i.test(evidenceLocationValue);
present.evidence_location = evidenceLocationOk;
if (!evidenceLocationOk && !missing.includes("evidence_location")) {
  missing.push("evidence_location");
  valueReasons.set("evidence_location", "must be project-relative logs/<date>/ or .ai-team/work|reviews/; no absolute path or root logs/*.log");
}

// P-49：运行时任务必须有真实取证；非运行时允许“不适用（无容器/外部依赖）”。
if (runtimeAgent) {
  const runtimeValue = fieldValue(["运行时取证：", "运行时取证:"]);
  const runtimeTrimmed = (runtimeValue || "").trim();
  const runtimePlaceholder = /^(TODO|TBD|待补|待定|待办|待确认|占位|\.{3}|…)\b/i.test(runtimeTrimmed);
  let runtimeOk = isFilled(runtimeValue) && !runtimePlaceholder;
  if (runtimeOk && needsRuntime) {
    if (/^(不适用|不涉及|无|n\/?a|none|not applicable)/i.test(runtimeTrimmed)) {
      runtimeOk = false;
    } else {
      const hasCommand = /\b(mvn|docker|curl|psql|redis-cli|npm|node|java|kubectl|podman|pytest|playwright|go test|cargo test)\b/i.test(runtimeValue);
      const hasResult = /(退出码|exit\s*[:=]?\s*\d+|断言|通过|失败|BLOCKED|pass|fail|结果)/i.test(runtimeValue);
      const blocked = /BLOCKED/i.test(runtimeValue) && /(原始错误|error|错误|异常)/i.test(runtimeValue);
      if (!hasCommand || !hasResult) runtimeOk = blocked;
    }
  }
  present.runtime_evidence = runtimeOk;
  if (!runtimeOk && !missing.includes("runtime_evidence")) {
    missing.push("runtime_evidence");
    valueReasons.set("runtime_evidence", runtimePlaceholder ? "placeholder is not runtime evidence" : needsRuntime ? "runtime task requires command + exit/result, or BLOCKED + raw error" : "value empty or placeholder");
  }
}

// P-53：reviewer/security 的 Done gate 必须写清 P0/P1、P2 处置、owner 与关闭条件。
if (reviewerAgent) {
  const doneValue = fieldValue(["Done gate：", "Done gate:", "完成门："]);
  const doneOk = isFilled(doneValue)
    && /P0|P1|P2/i.test(doneValue)
    && /(TASK-|RISK-)/.test(doneValue)
    && /(owner|负责人)/i.test(doneValue)
    && /(关闭条件|close)/i.test(doneValue)
    && /done|review/i.test(doneValue);
  present.done_gate = doneOk;
  if (!doneOk && !missing.includes("done_gate")) {
    missing.push("done_gate");
    valueReasons.set("done_gate", "must state P0/P1=0, P2 TASK/RISK with owner and close condition, and done/review gate");
  }
}

const ok = missing.length === 0;
const result = {
  ok,
  file,
  agent,
  required,
  present,
  missing,
  value_issues: Object.fromEntries(valueReasons),
  needs_transaction: needsTransaction,
  needs_runtime: needsRuntime,
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
    for (const key of missing) {
      const reason = valueReasons.get(key);
      console.log(`  MISSING ${key}${reason ? ` (${reason})` : valueMissing.has(key) ? " (value empty or placeholder)" : ""}`);
    }
  }
}

process.exit(ok ? 0 : 1);
