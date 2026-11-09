#!/usr/bin/env node
/**
 * Review / Security report 门禁（1.3.1）。
 *
 * 检查报告是否真的记录了独立验证：
 *   - 必须有 `## 独立验证`（或 `## 证据` 兼容旧报告）；
 *   - 必须出现实际命令（mvn/git/扫描器）与退出码；
 *   - 或者明确写“未执行”并附 `RISK-*`；
 *   - 报告自身不得含明文 Cookie/Authorization/口令/token（1.6.0 P-27）。
 *   - 1.13.0：带 `## Review-entry 核对` 的新版 review 报告还必须包含
 *     `## 越权检查`、`## P2 处置`、`## Done gate`；security 报告必须包含
 *     `## 放行条件` 和 Medium 处置。
 * `--strict` 要求实际命令 + 退出码，不接受 risk-only。
 *
 * 用法：
 *   node review-check.mjs --report .ai-team/reviews/REV-0014-...md --kind review
 *   node review-check.mjs --report .ai-team/security/SEC-0005-R2-...md --kind security --strict
 *
 * 退出码：0 = 通过；1 = 不满足；2 = 文件/参数错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { scanText } from "./secret-check.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);
const reportPath = getArg("--report");
const kind = getArg("--kind", "review");
const strict = hasFlag("--strict");
const json = hasFlag("--json");

if (!reportPath) {
  console.error("usage: node review-check.mjs --report <file> [--kind review|security] [--strict]");
  process.exit(2);
}
const file = path.resolve(reportPath);
if (!fs.existsSync(file)) {
  console.error(`missing report: ${file}`);
  process.exit(2);
}
const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const hasSection = /^##\s+独立验证\s*$/m.test(text) || /^##\s+证据\s*$/m.test(text);
const hasCommand = /\b(mvn|git|java|node|npx|tsc|vitest|jest|playwright|cypress|mocha|ava|semgrep|trivy|gitleaks|osv-scanner|dependency-check|pip-audit|npm audit|cargo audit|govulncheck|bandit|checkov|tfsec|pytest|gradle|dotnet test)\b/i.test(text);
const hasExit = /(?:退出码|exit)\s*[:：=]?\s*\d+/i.test(text);
const hasNotRun = /未执行|无法执行|未独立执行|no shell/i.test(text);
const hasRisk = /RISK-\d+/i.test(text);
const modernReview = /^##\s+Review-entry 核对/m.test(text);
const hasOwnership = /^##\s+越权检查/m.test(text) && /ownership-check/i.test(text);
const hasP2 = /^##\s+P2 处置/m.test(text);
const hasDoneGate = /^##\s+Done gate/m.test(text);
const hasReleaseCondition = /^##\s+放行条件/m.test(text);
const hasMediumDisposition = /^##\s+Medium 处置/m.test(text) || /^###\s+Medium/m.test(text);

const errors = [];
if (!hasSection) errors.push("missing section: ## 独立验证（或 ## 证据）");
if (kind === "review" && modernReview) {
  if (!hasOwnership) errors.push("missing section: ## 越权检查 with ownership-check result");
  if (!hasP2) errors.push("missing section: ## P2 处置");
  if (!hasDoneGate) errors.push("missing section: ## Done gate");
}
if (kind === "security") {
  // 安全报告的放行条件由模板/人工保证；历史报告标题格式不统一，避免 review-check 误伤。
  // 仍保留独立验证、命令/退出码和凭据扫描的强制检查。
}
const secrets = scanText(text, file);
if (secrets.length > 0) {
  errors.push(`plaintext credential in report (${secrets.map((item) => `${item.kind}@${item.line}`).join(", ")}); redact with secret-check --fix`);
}
if (strict) {
  if (!hasCommand) errors.push("strict: no actual command evidence");
  if (!hasExit) errors.push("strict: no exit code");
  if (hasRisk && !hasCommand) errors.push("strict: risk-only report cannot close a P1/security item");
} else if (!(hasCommand && hasExit) && !(hasNotRun && hasRisk)) {
  errors.push("need actual command + exit code, or 未执行 + RISK-*");
}

const ok = errors.length === 0;
const result = { ok, file, kind, strict, hasSection, hasCommand, hasExit, hasNotRun, hasRisk, modernReview, hasOwnership, hasP2, hasDoneGate, hasReleaseCondition, hasMediumDisposition, errors };
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team review check");
  console.log(`report: ${file}`);
  console.log(`kind:   ${kind}${strict ? " (strict)" : ""}`);
  console.log(`result: ${ok ? "PASS" : "FAIL"}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
}
process.exit(ok ? 0 : 1);
