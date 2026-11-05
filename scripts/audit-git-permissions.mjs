#!/usr/bin/env node
/**
 * Audit shell permissions for every ai-team agent.
 *
 * Policy (1.5.0 Shell-first strict):
 *   - shell default is allow;
 *   - only destructive commands are denied;
 *   - no read-only role, publish, secret, bulk-add, or ask rules remain.
 *
 * Usage:
 *   node scripts/audit-git-permissions.mjs
 *   node scripts/audit-git-permissions.mjs --json
 *
 * Exit code 0 = policy matches; 1 = gaps found.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const json = args.includes("--json");
const agentsDir = path.resolve(".opencode", "agents", "ai-team");

const matrix = JSON.parse(
  fs.readFileSync(path.resolve(".opencode", "skills", "ai-team-workflow", "permissions.json"), "utf8"),
);
const destructive = matrix.shellDestructiveDeny ?? [];
if (destructive.length === 0) {
  console.error("permissions.json must define shellDestructiveDeny");
  process.exit(2);
}

function parseShellRules(file) {
  const text = fs.readFileSync(file, "utf8");
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return [...fm.matchAll(/- action: shell\s+resource: "([^"]+)"\s+effect: (allow|ask|deny)/g)]
    .map((m) => ({ resource: m[1], effect: m[2] }));
}

const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).sort();
const results = [];
let failures = 0;

for (const file of files) {
  const rules = parseShellRules(path.join(agentsDir, file));
  const missing = [];
  const defaultRule = rules.find((r) => r.resource === "*");
  if (!defaultRule || defaultRule.effect !== "allow") {
    missing.push("missing shell * -> allow");
  }
  for (const resource of destructive) {
    if (!rules.some((r) => r.resource === resource && r.effect === "deny")) {
      missing.push(`missing destructive deny: ${resource}`);
    }
  }
  const extras = rules
    .filter((r) => !(r.resource === "*" && r.effect === "allow") && !destructive.includes(r.resource))
    .map((r) => `${r.effect}:${r.resource}`);
  if (extras.length) {
    missing.push(`non-destructive shell restriction: ${extras.join(", ")}`);
  }

  const status = missing.length ? "FAIL" : "PASS";
  if (missing.length) failures++;
  results.push({ file, status, missing });
  if (!json) {
    console.log(`${status}  ${file}${missing.length ? `\n      - ${missing.join("\n      - ")}` : ""}`);
  }
}

if (json) {
  console.log(JSON.stringify({ results, failures, destructive: destructive.length }, null, 2));
} else {
  console.log(`\n${files.length} agents checked, ${failures} failed.`);
}

process.exit(failures ? 1 : 0);
