#!/usr/bin/env node
/**
 * 权限矩阵校验（1.4.2）。
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

// Shell-first 只放开普通命令；这些破坏性/历史改写命令必须保持非 allow。
const SHELL_SAFETY_DENIES = [
  "git reset --hard *",
  "git clean *",
  "git push --force*",
  "git push -f*",
  "git push --mirror *",
  "git update-ref -d *",
  "git reflog expire *",
  "git gc --prune*",
  "git branch -D *",
  "git stash clear *",
  "rm -rf *",
  "Remove-Item * -Recurse *",
  "docker system prune *",
  "terraform destroy *",
  "kubectl delete *",
];
// 这些角色通过 shell 也不得 staging/commit/push/tag，写操作只走授权角色。
const READ_ONLY_ROLES = new Set([
  "chief",
  "code-reviewer",
  "product-manager",
  "ux-designer",
  "system-architect",
  "security-auditor",
]);

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
    agentText.includes("Shell 使用纪律（Shell-first）"),
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
  check(
    `${role} blocks bulk git add`,
    effectiveEffect(rules, "shell", "git add -A") !== "allow",
    `effective=${effectiveEffect(rules, "shell", "git add -A")}`,
  );
  if (READ_ONLY_ROLES.has(role)) {
    for (const resource of [
      "git add",
      "git add *",
      "git commit",
      "git commit *",
      "git push",
      "git push *",
      "git tag",
      "git tag *",
    ]) {
      const effect = effectiveEffect(rules, "shell", resource);
      check(`${role} read-only ${resource}`, effect !== "allow", `effective=${effect}`);
    }
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
