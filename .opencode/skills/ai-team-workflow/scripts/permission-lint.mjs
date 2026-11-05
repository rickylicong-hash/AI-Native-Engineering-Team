#!/usr/bin/env node
/**
 * 权限矩阵校验（1.5.0）。
 *
 * 读取 `skills/ai-team-workflow/permissions.json`，检查每个角色：
 *   - required 动作是否最终为 allow；
 *   - forbidden 动作是否最终不是 allow；
 *   - 矩阵角色是否有对应 agent 文件。
 *
 * 用法：
 *   node permission-lint.mjs
 *   node permission-lint.mjs --role chief
 *   node permission-lint.mjs --json
 *
 * 退出码：0 = 通过；1 = 有缺口；2 = 文件/解析错误。
 */

import fs from "node:fs";
import process from "node:process";
import {
  agentFile,
  effectiveEffect,
  loadMatrix,
  matrixRoles,
  readRules,
  roleFromAgent,
} from "./permission-lib.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const json = args.includes("--json");
const onlyRole = roleFromAgent(getArg("--role", ""));

let matrix;
try {
  matrix = loadMatrix();
} catch (error) {
  console.error(`could not read permissions.json: ${error.message}`);
  process.exit(2);
}

const roles = matrixRoles().filter((role) => !onlyRole || role === onlyRole);
if (onlyRole && roles.length === 0) {
  console.error(`unknown role: ${onlyRole}`);
  process.exit(2);
}

const failures = [];
const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

// Shell-first strict：只允许这些破坏性/历史改写命令 deny。
const SHELL_SAFETY_DENIES = [
  "git reset --hard*",
  "git clean*",
  "git checkout --*",
  "git checkout -f*",
  "git restore*",
  "git switch -f*",
  "git switch --discard-changes*",
  "git reset --merge*",
  "git branch -D*",
  "git branch -d*",
  "git tag -d*",
  "git tag --delete*",
  "git stash clear*",
  "git stash drop*",
  "git update-ref -d*",
  "git reflog expire*",
  "git gc --prune*",
  "git filter-branch*",
  "git filter-repo*",
  "git push --force*",
  "git push * --force*",
  "git push -f*",
  "git push * -f*",
  "git push --mirror*",
  "git push * +*",
  "git push --delete*",
  "git push * --delete*",
  "git worktree remove*",
  "rm -rf*",
  "rm -r*",
  "del /s*",
  "del /q /s*",
  "rd /s*",
  "rd /q /s*",
  "Remove-Item * -Recurse*",
  "Remove-Item -Recurse*",
  "docker system prune*",
  "docker volume prune*",
  "docker image prune*",
  "terraform destroy*",
  "kubectl delete*",
];
// 这些操作不是破坏性命令，必须保持 allow；用于防止安全边界再次膨胀。
const SHELL_MUST_ALLOW = [
  "git add",
  "git add -A",
  "git commit",
  "git commit *",
  "git push",
  "git push *",
  "git tag",
  "npm publish*",
  "kubectl apply*",
  "terraform apply*",
  "Get-Content .env",
];

for (const role of roles) {
  const file = agentFile(role);
  check(`agent ${role} exists`, fs.existsSync(file), file);
  if (!fs.existsSync(file)) continue;
  const rules = readRules(role);
  const agentText = fs.readFileSync(file, "utf8");
  const spec = matrix.roles[role] || {};
  check(
    `${role} has gateway actions`,
    Array.isArray(spec.gateway) && spec.gateway.length > 0,
    "permissions.json role has no gateway actions",
  );
  check(
    `${role} has shell-first guidance`,
    agentText.includes("Shell 使用纪律（Shell-first strict）"),
    "missing shell-first recovery guidance",
  );
  check(
    `${role} shell defaults to allow`,
    effectiveEffect(rules, "shell", "*") === "allow",
    `effective=${effectiveEffect(rules, "shell", "*")}`,
  );
  for (const resource of SHELL_SAFETY_DENIES) {
    const effect = effectiveEffect(rules, "shell", resource);
    check(`${role} safety ${resource}`, effect !== "allow", `effective=${effect}`);
  }
  const extraShellRestrictions = rules
    .filter((rule) => rule.action === "shell" && rule.effect !== "allow" && !SHELL_SAFETY_DENIES.includes(rule.resource))
    .map((rule) => `${rule.effect}:${rule.resource}`);
  check(
    `${role} only destructive shell restrictions`,
    extraShellRestrictions.length === 0,
    extraShellRestrictions.join(", "),
  );
  for (const resource of SHELL_MUST_ALLOW) {
    const effect = effectiveEffect(rules, "shell", resource);
    check(`${role} non-destructive allow ${resource}`, effect === "allow", `effective=${effect}`);
  }
  for (const [action, resources] of Object.entries(spec.required || {})) {
    for (const resource of resources) {
      const effect = effectiveEffect(rules, action, resource);
      check(
        `${role} required ${action} ${resource}`,
        effect === "allow" || effect === "ask",
        `effective=${effect}`,
      );
    }
  }
  for (const [action, resources] of Object.entries(spec.forbidden || {})) {
    for (const resource of resources) {
      const effect = effectiveEffect(rules, action, resource);
      check(
        `${role} forbidden ${action} ${resource}`,
        effect !== "allow",
        `effective=${effect}`,
      );
    }
  }
}

if (json) {
  console.log(JSON.stringify({ ok: failures.length === 0, roles, failures, checks }, null, 2));
} else {
  console.log("AI Team permission lint");
  console.log(`roles:  ${roles.join(", ")}`);
  console.log(`checks: ${checks.length}`);
  if (failures.length === 0) {
    console.log("result: PASS");
  } else {
    console.log(`result: FAIL (${failures.length})`);
    for (const failure of failures) console.log(`  FAIL ${failure}`);
    console.log("action: run permission-doctor.mjs --agent <role> --command <command>");
  }
}
process.exit(failures.length === 0 ? 0 : 1);
