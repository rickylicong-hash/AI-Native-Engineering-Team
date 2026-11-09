#!/usr/bin/env node
/**
 * 影响面扫描（1.13.0，启发式）。
 *
 * 输入 changed files（--diff 或 git base），输出：
 *   - 变更文件所属模块（最近的 package.json / pom.xml / build.gradle / go.mod / Cargo.toml / pyproject.toml）；
 *   - 可能受影响的测试（按模块目录、文件名/类名匹配）；
 *   - 建议的 V1 测试列表。
 *
 * 这不是语义索引；结果用于缩小 V1，不替代 reviewer/QA 判断。
 *
 * 用法：
 *   node impact-scan.mjs --project . --base HEAD~1
 *   node impact-scan.mjs --project . --diff changed.txt --json
 *
 * 退出码：0 扫描完成；1 参数/读取错误。
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
  console.log("Usage: node impact-scan.mjs [--project DIR] [--base REV] [--diff FILE] [--max-files N] [--json]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const base = getArg("--base", null);
const diffFile = getArg("--diff", null);
const json = hasFlag("--json");
const maxFiles = Number.parseInt(getArg("--max-files", "5000"), 10) || 5000;
const SKIP = new Set([".git", "node_modules", "target", "build", "dist", ".idea", ".vscode", ".mvn", "coverage"]);

if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  console.error(`ERROR  project not found: ${project}`);
  process.exit(1);
}

function git(gitArgs) {
  return spawnSync("git", gitArgs, { cwd: project, encoding: "utf8", timeout: 30000 });
}

function changedFiles() {
  if (diffFile) {
    const file = path.resolve(project, diffFile);
    if (!fs.existsSync(file)) throw new Error(`diff file not found: ${file}`);
    return fs.readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  const files = new Set();
  const argsList = base ? ["diff", "--name-only", `${base}...HEAD`] : ["diff", "--name-only"];
  const diff = git(argsList);
  if (diff.status !== 0) throw new Error(`git ${argsList.join(" ")} failed: ${diff.stderr.trim()}`);
  for (const file of diff.stdout.split(/\r?\n/).filter(Boolean)) files.add(file);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  if (untracked.status === 0) {
    for (const file of untracked.stdout.split(/\r?\n/).filter(Boolean)) files.add(file);
  }
  return [...files];
}

const MANIFESTS = new Set(["package.json", "pom.xml", "build.gradle", "build.gradle.kts", "go.mod", "Cargo.toml", "pyproject.toml"]);

function moduleFor(file) {
  let dir = path.dirname(file);
  while (dir && dir !== "." && dir !== path.dirname(dir)) {
    for (const manifest of MANIFESTS) {
      if (fs.existsSync(path.join(project, dir, manifest))) return dir.replace(/\\/g, "/");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const first = file.split(/[\\/]/)[0];
  return first || ".";
}

function walk(dir, out = []) {
  if (out.length >= maxFiles || !fs.existsSync(dir)) return out;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (out.length >= maxFiles) break;
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) walk(full, out);
    } else if (entry.isFile()) {
      out.push(path.relative(project, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

const TEST_RE = /(^|\/)(__tests__|tests?|e2e|qa)\/|\.(test|spec)\.[^.]+$|(Test|IT)\.(java|kt|cs)$/i;

try {
  const changed = changedFiles();
  const modules = [...new Set(changed.map(moduleFor))].sort();
  const allFiles = walk(project);
  const tests = allFiles.filter((file) => TEST_RE.test(file));
  const changedStems = changed.map((file) => path.basename(file).replace(/\.[^.]+$/, "").toLowerCase());
  const affected = tests.filter((test) => {
    const normalized = test.toLowerCase();
    return modules.some((module) => normalized.startsWith(`${module.toLowerCase()}/`))
      || changedStems.some((stem) => stem.length >= 3 && normalized.includes(stem));
  });
  const result = {
    ok: true,
    project,
    base: base || (diffFile ? `diff:${diffFile}` : "working-tree"),
    changedFiles: changed,
    modules,
    affectedTests: affected.slice(0, 200),
    testCount: affected.length,
    scannedFiles: allFiles.length,
    truncated: allFiles.length >= maxFiles,
    confidence: affected.length > 0 ? "medium" : "low",
    note: "启发式结果：用于 V1 缩小范围，不替代 reviewer/QA 的覆盖矩阵判断。",
  };
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("AI Team impact scan");
    console.log(`project: ${project}`);
    console.log(`changed: ${changed.length}`);
    for (const file of changed.slice(0, 20)) console.log(`  - ${file}`);
    console.log(`modules: ${modules.join(", ") || "(none)"}`);
    console.log(`affected tests: ${affected.length}`);
    for (const test of affected.slice(0, 30)) console.log(`  - ${test}`);
    console.log(`confidence: ${result.confidence}`);
  }
  process.exit(0);
} catch (error) {
  if (json) console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
  else console.log(`ERROR  ${error.message}`);
  process.exit(1);
}
