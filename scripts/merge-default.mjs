#!/usr/bin/env node
/**
 * Safely set default_agent in an OpenCode JSON/JSONC config.
 *
 * Usage:
 *   node scripts/merge-default.mjs --config ~/.config/opencode/opencode.jsonc
 *   node scripts/merge-default.mjs --config ./opencode.jsonc --dry-run
 *
 * The file is backed up before writing. If the file cannot be parsed after
 * stripping comments, nothing is changed.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const dryRun = args.includes("--dry-run");
const configPath = getArg("--config");

if (!configPath) {
  console.error("Usage: node scripts/merge-default.mjs --config <opencode.json|jsonc> [--dry-run]");
  process.exit(2);
}

const absolute = path.resolve(configPath.replace(/^~(?=$|[\\/])/, os.homedir()));
if (!fs.existsSync(absolute)) {
  console.error(`Config not found: ${absolute}`);
  process.exit(1);
}

const original = fs.readFileSync(absolute, "utf8").replace(/^\uFEFF/, "");

/** Strip // and /* *\/ comments while preserving strings. */
function stripJsonc(text) {
  let out = "";
  let inString = false;
  let quote = "";
  let escaped = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) inString = false;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

let parsed;
try {
  parsed = JSON.parse(stripJsonc(original));
} catch (err) {
  console.error(`Refusing to modify unparseable config: ${err.message}`);
  process.exit(1);
}

if (parsed.default_agent === "ai-team/chief") {
  console.log("default_agent is already ai-team/chief. Nothing to do.");
  process.exit(0);
}

parsed.default_agent = "ai-team/chief";
const next = `${JSON.stringify(parsed, null, 2)}\n`;

if (dryRun) {
  console.log("Would set default_agent to ai-team/chief in:");
  console.log(`  ${absolute}`);
  console.log("\nResult:\n");
  console.log(next);
  process.exit(0);
}

const backup = `${absolute}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
fs.copyFileSync(absolute, backup);
fs.writeFileSync(absolute, next, "utf8");
console.log(`Updated ${absolute}`);
console.log(`Backup: ${backup}`);
