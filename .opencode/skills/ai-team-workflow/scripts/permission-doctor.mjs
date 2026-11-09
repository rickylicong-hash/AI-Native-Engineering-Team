#!/usr/bin/env node
/**
 * 权限诊断（1.5.0）。
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

if (!command) {
  console.error('usage: node permission-doctor.mjs --agent <role> --command "<command>"');
  process.exit(2);
}

const rules = readRules(role);
const matches = matchingRules(rules, action, command);
const final = effectiveRule(rules, action, command);
const effect = effectiveEffect(rules, action, command);

function suggest(command) {
  const cmd = command.trim();
  if (/^(git\s+)?(reset\s+--hard|clean|checkout\s+--|checkout\s+-f|restore|switch\s+-f|switch\s+--discard-changes|reset\s+--merge|branch\s+-[dD]|tag\s+(-d|--delete)|stash\s+(clear|drop)|update-ref\s+-d|reflog\s+expire|gc\s+--prune|filter-branch|filter-repo)\b/i.test(cmd)) {
    return "destructive git command is denied by design; do not widen permissions";
  }
  if (/^git\s+worktree\s+remove\b/i.test(cmd) && /(^|\s)(--force|-f)/i.test(cmd)) {
    return "destructive worktree removal is denied by design; run it without --force or ask the user";
  }
  if (/^git\s+push\b/i.test(cmd) && /(--force|-f\b|\+[^ ]+|--mirror|--delete)/i.test(cmd)) {
    return "destructive remote update is denied by design; use a normal push or ask the user";
  }
  if (/^(rm\s+-[rf]|Remove-Item\b.*-Recurse|del\s+\/|rd\s+\/)/i.test(cmd)) {
    return "destructive filesystem command is denied by design; do not widen permissions";
  }
  if (/^(docker\s+(system|volume|image)\s+prune|terraform\s+destroy|kubectl\s+delete)\b/i.test(cmd)) {
    return "destructive infrastructure command is denied by design; ask the owner";
  }
  if (/[;]|&&|\|\||2>&1|\|/.test(cmd)) {
    return "compound shell is allowed by Shell-first; inspect the matching destructive rule above";
  }
  const script = cmd.match(/([^\\/]+\.mjs)/i)?.[1];
  if (script) return `node *${script}*`;
  const git = cmd.match(/^git\s+([a-z-]+)/i)?.[1];
  if (git) return `git ${git} *`;
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
const suggestion = suggest(command);
if (/^(compound|destructive)/.test(suggestion)) {
  console.log(`suggest: ${suggestion}`);
} else {
  console.log(`suggest: allow ${action} resource "${suggestion}" for ${role}`);
}
if (/[;]|&&|\|\||2>&1|\|/.test(command)) {
  console.log("note:    compound shell is allowed by Shell-first; final deny is a destructive rule");
}
process.exit(1);
