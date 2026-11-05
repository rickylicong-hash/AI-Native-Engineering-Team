#!/usr/bin/env node
/**
 * Audit git shell permissions for every ai-team agent.
 *
 * Usage:
 *   node scripts/audit-git-permissions.mjs
 *   node scripts/audit-git-permissions.mjs --json
 *
 * Exit code 0 = all expected rules present; 1 = gaps found.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const json = args.includes("--json");
const agentsDir = path.resolve(".opencode", "agents", "ai-team");

const readOnlyRoles = new Set([
  "chief.md",
  "product-manager.md",
  "ux-designer.md",
  "system-architect.md",
  "code-reviewer.md",
  "security-auditor.md",
]);

const writeRoles = new Set([
  "engineer.md",
  "qa-engineer.md",
  "devops-engineer.md",
  "technical-writer.md",
]);

// QA writes tests and reports but does not commit; DevOps commits its output.
const nonCommittingWriteRoles = new Set(["qa-engineer.md"]);

const nonCommitRules = [
  ["git commit *", "deny"],
  ["git push *", "deny"],
  ["git tag *", "deny"],
];

const commonWriteRules = [
  ["git commit *", "ask"],
  ["git push *", "ask"],
  ["git tag *", "ask"],
  ["git push --force*", "deny"],
  ["git push -f*", "deny"],
  ["git reset --hard *", "deny"],
  ["git clean *", "deny"],
  ["git branch -D *", "deny"],
  ["git branch -d *", "deny"],
  ["git remote add *", "ask"],
  ["git remote remove *", "ask"],
  ["git remote set-url *", "ask"],
  ["git checkout -- *", "ask"],
  ["git restore *", "ask"],
  ["git stash clear *", "deny"],
  ["git stash drop *", "ask"],
  ["git update-ref -d *", "deny"],
  ["git reflog expire *", "deny"],
  ["git gc --prune*", "deny"],
  ["git config --global *", "ask"],
  ["git checkout -f *", "ask"],
  ["git switch -f *", "ask"],
  ["git switch --discard-changes *", "ask"],
  ["git reset --merge *", "ask"],
  ["git worktree remove *", "ask"],
  ["git push --mirror *", "deny"],
  ["git push --delete *", "ask"],
  ["git push * --delete *", "ask"],
  ["git push * +*", "deny"],
];

const roleExtraRules = {
  "engineer.md": [["git init *", "ask"]],
  "qa-engineer.md": [
    ["git init *", "deny"],
    ["git add *", "deny"],
    ["git rm *", "deny"],
    ["git mv *", "deny"],
    ["git stage *", "deny"],
    ["git apply *", "deny"],
    ["git am *", "deny"],
  ],
  "devops-engineer.md": [],
  "technical-writer.md": [["git init *", "ask"], ["git apply *", "deny"], ["git am *", "deny"]],
};

const readOnlyForbidden = [
  "git commit *",
  "git push *",
  "git tag *",
  "git branch -D *",
  "git reset --hard *",
];

function parseShellRules(file) {
  const text = fs.readFileSync(file, "utf8");
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return [...fm.matchAll(/- action: shell\s+resource: "([^"]+)"\s+effect: (allow|ask|deny)/g)]
    .map((m) => ({ resource: m[1], effect: m[2] }));
}

function lastEffect(rules, resource) {
  const matches = rules.filter((r) => r.resource === resource);
  return matches.length ? matches[matches.length - 1].effect : null;
}

function hasRule(rules, resource, effect) {
  return lastEffect(rules, resource) === effect;
}

const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).sort();
const results = [];
let failures = 0;

for (const file of files) {
  const allRules = parseShellRules(path.join(agentsDir, file));
  const rules = allRules.filter((r) => r.resource.includes("git"));
  const shellDeny = hasRule(allRules, "*", "deny");
  const missing = [];

  if (readOnlyRoles.has(file)) {
    if (!shellDeny) missing.push("missing shell * deny");
    for (const forbidden of readOnlyForbidden) {
      const effect = lastEffect(rules, forbidden);
      if (effect && effect !== "deny") {
        missing.push(`read-only role has ${forbidden} -> ${effect}`);
      }
    }
  } else if (writeRoles.has(file)) {
    const expected = nonCommittingWriteRoles.has(file)
      ? [
          ...commonWriteRules.filter(([resource]) => !["git commit *", "git push *", "git tag *"].includes(resource)),
          ...nonCommitRules,
          ...(roleExtraRules[file] ?? []),
        ]
      : [...commonWriteRules, ...(roleExtraRules[file] ?? [])];
    for (const [resource, effect] of expected) {
      if (!hasRule(rules, resource, effect)) {
        missing.push(`missing ${resource} -> ${effect} (last match: ${lastEffect(rules, resource) ?? "none"})`);
      }
    }
  } else {
    missing.push("unknown role: not in read-only or write role list");
  }

  const status = missing.length ? "FAIL" : "PASS";
  if (missing.length) failures++;
  results.push({ file, status, missing });
  if (!json) {
    console.log(`${status}  ${file}${missing.length ? `\n      - ${missing.join("\n      - ")}` : ""}`);
  }
}

if (json) {
  console.log(JSON.stringify({ results, failures }, null, 2));
} else {
  console.log(`\n${files.length} agents checked, ${failures} failed.`);
}

process.exit(failures ? 1 : 0);
