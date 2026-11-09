#!/usr/bin/env node
/**
 * 角色边界/所有权校验（1.11.0）。
 *
 * 从 brief 的 `所有权：` 行解析反引号路径，和 diff 文件/工作区变更比对：
 *   - 只允许修改 `src/**`, `docs/**`
 *   - 禁止 `infra/**`, `.env`
 *
 * 用法：
 *   node ownership-check.mjs --brief .ai-team/tasks/TASK-0001-BRIEF.md --diff changed.txt
 *   node ownership-check.mjs --brief ... --base origin/main --json
 *   node ownership-check.mjs --brief ... --strict
 *
 * 退出码：0 = 通过/跳过；1 = 越权或 --strict 下不可解析；2 = 参数/读取错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node ownership-check.mjs --brief <file> [--diff <file>|--base <ref>] [--project DIR] [--json] [--strict]");
  process.exit(0);
}

const brief = getArg("--brief");
const diffFile = getArg("--diff");
const base = getArg("--base", "HEAD");
let project = path.resolve(getArg("--project", "."));
try {
  project = fs.realpathSync(project);
} catch {
  // keep lexical path if the project does not exist yet
}
const json = hasFlag("--json");
const strict = hasFlag("--strict");

if (!brief) {
  console.error("--brief is required");
  process.exit(2);
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function normalize(value) {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
  return path.posix.normalize(normalized).replace(/^\.\//, "");
}

function resolveInsideProject(file, label) {
  let resolved = path.resolve(file);
  try {
    resolved = fs.realpathSync(resolved);
  } catch {
    // keep lexical path for non-existent files
  }
  const root = project.endsWith(path.sep) ? project : `${project}${path.sep}`;
  const target = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  const prefix = process.platform === "win32" ? root.toLowerCase() : root;
  if (target !== prefix.slice(0, -1) && !target.startsWith(prefix)) {
    console.error(`${label} must be inside the project: ${file}`);
    process.exit(2);
  }
  return resolved;
}

function globToRegExp(pattern) {
  const normalized = normalize(pattern);
  let out = "";
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === "*") {
      if (normalized[i + 1] === "*") {
        if (normalized[i + 2] === "/") {
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (char === "?") {
      out += "[^/]";
    } else if ("\\^$+.|()[]{}".includes(char)) {
      out += `\\${char}`;
    } else {
      out += char;
    }
  }
  return new RegExp(`^${out}$`);
}

function matches(file, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(file));
}

const briefPath = resolveInsideProject(brief, "--brief");
if (diffFile) resolveInsideProject(diffFile, "--diff");
if (!diffFile && /^-/.test(base)) {
  console.error("--base must not start with '-'");
  process.exit(2);
}

let briefText;
try {
  briefText = readText(briefPath);
} catch (error) {
  console.error(`could not read brief: ${error.message}`);
  process.exit(2);
}

const ownershipLine = (briefText.match(/^\s*所有权[：:]\s*(.+)$/m) || [])[1] || "";
const allowedSection = ownershipLine.split(/禁止/)[0] || "";
const forbiddenSection = ownershipLine.includes("禁止") ? ownershipLine.split(/禁止/).slice(1).join("禁止") : "";

function pathsIn(section) {
  const backticked = [...section.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim()).filter(Boolean);
  if (backticked.length > 0) return backticked.map(normalize);
  return section
    .split(/[、,，;；\s]+/)
    .map((item) => item.trim())
    .filter((item) => /[/\\*?]/.test(item) || /\.[A-Za-z0-9]+$/.test(item))
    .map(normalize);
}

const allowed = pathsIn(allowedSection);
const forbidden = pathsIn(forbiddenSection);
const forbiddenDeclared = /禁止/.test(ownershipLine);

if (allowed.length === 0) {
  const detail = "所有权行没有可解析的反引号路径；请写 `src/**`、`docs/**` 这类 glob";
  if (strict) {
    if (json) console.log(JSON.stringify({ ok: false, brief, allowed, forbidden, violations: [], error: detail }, null, 2));
    else console.error(`FAIL  ${detail}`);
    process.exit(1);
  }
  console.log(`WARN  ${detail}`);
  console.log("result:   SKIP");
  process.exit(0);
}

if (forbiddenDeclared && forbidden.length === 0) {
  const detail = "所有权行声明了“禁止”，但没有可解析的反引号路径；禁止段不能静默为空";
  if (strict) {
    if (json) console.log(JSON.stringify({ ok: false, brief, allowed, forbidden, violations: [], error: detail }, null, 2));
    else console.error(`FAIL  ${detail}`);
    process.exit(1);
  }
  console.log(`WARN  ${detail}`);
  console.log("result:   SKIP");
  process.exit(0);
}

let changed = [];
if (diffFile) {
  try {
    changed = readText(diffFile).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map(normalize);
  } catch (error) {
    console.error(`could not read diff: ${error.message}`);
    process.exit(2);
  }
} else {
  const root = project;
  const diff = spawnSync("git", ["diff", "--name-only", base], { cwd: root, encoding: "utf8" });
  if (diff.status !== 0) {
    console.error(`git diff failed: ${(diff.stderr || "").trim()}`);
    process.exit(2);
  }
  const untracked = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  if (untracked.status !== 0) {
    console.error(`git ls-files failed: ${(untracked.stderr || "").trim()}`);
    process.exit(2);
  }
  changed = [...diff.stdout.split(/\r?\n/), ...untracked.stdout.split(/\r?\n/)]
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalize);
}

if (changed.length === 0) {
  const detail = "diff 为空：请确认候选确实没有变更，或在严格模式下提供非空 diff/正确的 --base";
  if (strict) {
    if (json) console.log(JSON.stringify({ ok: false, brief, allowed, forbidden, changed: 0, violations: [], error: detail }, null, 2));
    else console.error(`FAIL  ${detail}`);
    process.exit(1);
  }
  console.log(`WARN  ${detail}`);
  console.log("result:   SKIP");
  process.exit(0);
}

const violations = [];
for (const file of changed) {
  if (file === ".." || file.startsWith("../")) {
    violations.push({ file, reason: "outside" });
  } else if (matches(file, forbidden)) {
    violations.push({ file, reason: "forbidden" });
  } else if (!matches(file, allowed)) {
    violations.push({ file, reason: "not-allowed" });
  }
}

const result = {
  ok: violations.length === 0,
  brief,
  allowed,
  forbidden,
  changed: changed.length,
  violations,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team ownership check");
  console.log(`brief:      ${brief}`);
  console.log(`allowed:    ${allowed.join(", ")}`);
  console.log(`forbidden:  ${forbidden.length ? forbidden.join(", ") : "-"}`);
  console.log(`changed:    ${changed.length}`);
  for (const item of violations) console.log(`VIOLATION  ${item.file} (${item.reason})`);
  console.log(`result:     ${result.ok ? "PASS" : "FAIL"}`);
}

process.exit(result.ok ? 0 : 1);
