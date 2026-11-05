#!/usr/bin/env node
/**
 * 权限诊断（1.4.2）。
 *
 * 给定角色和命令，列出所有匹配规则、最终效果，并给出最小修复建议。
 *
 * 用法：
 *   node permission-doctor.mjs --agent chief --command "node .../growth-check.mjs --project ."
 *   node permission-doctor.mjs --agent code-reviewer --command "mvn -B test"
 *
 * 退出码：0 = 最终 allow；1 = deny/none；2 = 参数错误。
 */

import process from "node:process";
import {
  effectiveEffect,
  effectiveRule,
  matchingRules,
  readRules,
  roleFromAgent,
} from "./permission-lib.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const role = roleFromAgent(getArg("--agent", getArg("--role", "chief")));
const action = getArg("--action", "shell");
const dash = args.indexOf("--");
const command = getArg("--command", dash >= 0 ? args.slice(dash + 1).join(" ") : "");

const READ_ONLY_ROLES = new Set([
  "chief",
  "code-reviewer",
  "product-manager",
  "ux-designer",
  "system-architect",
  "security-auditor",
]);

if (!command) {
  console.error('usage: node permission-doctor.mjs --agent <role> --command "<command>"');
  process.exit(2);
}

const rules = readRules(role);
const matches = matchingRules(rules, action, command);
const final = effectiveRule(rules, action, command);
const effect = effectiveEffect(rules, action, command);

function suggest(command, role) {
  const cmd = command.trim();
  if (/^git\s+(add|commit|push|tag)\b/i.test(cmd) && READ_ONLY_ROLES.has(role)) {
    return "read-only role: staging/commit/push is denied by design; route it to DevOps";
  }
  if (/^git\s+(reset\s+--hard|clean|push\s+--force|push\s+-f|filter-branch|filter-repo)\b/i.test(cmd)) {
    return "destructive history command is denied by design; do not widen permissions";
  }
  if (/^(Get-Content|cat|type)\b.*\.env/i.test(cmd)) {
    return "secret read is denied by design; use the read tool only for non-secret files";
  }
  if (/[;]|&&|\|\||2>&1|\|/.test(cmd)) {
    return "compound shell is allowed by Shell-first; inspect the matching safety/read-only rule above";
  }
  const script = cmd.match(/([^\\/]+\.mjs)/i)?.[1];
  if (script) return `node *${script}*`;
  const git = cmd.match(/^git\s+([a-z-]+)/i)?.[1];
  if (git) return `git ${git} *`;
  if (/^Get-Content\b/i.test(cmd) && /\.ai-team[\\/](state|tasks|team)/i.test(cmd)) {
    return "Get-Content */.ai-team/state/*（按目录替换 state/tasks/team）";
  }
  const first = cmd.split(/\s+/)[0];
  return `${first} *`;
}

console.log("AI Team permission doctor");
console.log(`agent:   ${role}`);
console.log(`action:  ${action}`);
console.log(`command: ${command}`);
console.log("matching rules:");
if (matches.length === 0) {
  console.log("  (none)");
} else {
  for (const rule of matches) {
    console.log(`  [${rule.index}] ${rule.action} ${rule.resource} -> ${rule.effect}`);
  }
}
console.log(`final:   ${effect}${final ? ` (rule ${final.index})` : ""}`);

if (effect === "allow" || effect === "ask") {
  console.log(`result:  PASS${effect === "ask" ? " (ask)" : ""}`);
  process.exit(0);
}

console.log("result:  FAIL");
const suggestion = suggest(command, role);
if (/^(compound|read-only|destructive|secret)/.test(suggestion)) {
  console.log(`suggest: ${suggestion}`);
} else {
  console.log(`suggest: allow ${action} resource "${suggestion}" for ${role}`);
}
if (/[;]|&&|\|\||2>&1|\|/.test(command)) {
  console.log("note:    compound shell is allowed by Shell-first; final deny is usually a safety/read-only/secret rule");
}
process.exit(1);
