#!/usr/bin/env node
/**
 * 统一会话/门禁预检（1.13.0）。
 *
 * 目的：把 session 启动、交接、门禁、发布前的重复扫描合并成一次：
 *   - artifact/encoding/secret 扫描只跑一次；
 *   - state-check / checkpoint-check 通过 --artifacts-ok 复用结果；
 *   - retro-check / growth-check 只读检查。
 *
 * 用法：
 *   node gate-check.mjs --project . --mode start
 *   node gate-check.mjs --project . --mode handoff
 *   node gate-check.mjs --project . --mode gate --strict
 *   node gate-check.mjs --project . --mode release --json
 *
 * 退出码：
 *   0 = 全部通过
 *   1 = 有阻断项（artifact/state/checkpoint/retro/growth）
 *   2 = 参数/项目错误
 *   3 = 读取/执行失败
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkArtifacts } from "./artifact-check.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node gate-check.mjs [--project DIR] [--mode start|handoff|gate|release|retro] [--strict] [--json] [--bootstrap] [--offline] [--max-files N] [--max-evidence-files N]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const mode = String(getArg("--mode", "start") || "start").toLowerCase();
const json = hasFlag("--json");
const strict = hasFlag("--strict");
const bootstrap = hasFlag("--bootstrap");
const offline = hasFlag("--offline");
const maxFilesArg = getArg("--max-files", null);
const maxEvidenceArg = getArg("--max-evidence-files", null);

const validModes = new Set(["start", "handoff", "gate", "release", "retro"]);
if (!validModes.has(mode)) {
  console.error(`ERROR  --mode must be one of ${[...validModes].join(", ")} (got "${mode}")`);
  process.exit(2);
}
if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  console.error(`ERROR  project not found: ${project}`);
  process.exit(2);
}
for (const [name, value] of [["--max-files", maxFilesArg], ["--max-evidence-files", maxEvidenceArg]]) {
  if (value !== null && (!/^\d+$/.test(value) || Number.parseInt(value, 10) < 1)) {
    console.error(`ERROR  ${name} must be an integer >= 1 (got "${value}")`);
    process.exit(2);
  }
}

const maxFiles = maxFilesArg ? Number.parseInt(maxFilesArg, 10) : 2000;
const maxEvidenceFiles = maxEvidenceArg ? Number.parseInt(maxEvidenceArg, 10) : 2000;
const workflowScripts = path.dirname(fileURLToPath(import.meta.url));
const node = process.execPath;

function run(script, runArgs) {
  const result = spawnSync(node, [path.join(workflowScripts, script), ...runArgs], {
    cwd: project,
    encoding: "utf8",
    timeout: 120000,
  });
  let parsed = null;
  if (result.stdout) {
    try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
  }
  return {
    script,
    status: result.status,
    ok: result.status === 0,
    parsed,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

const failures = [];
const summary = {
  project,
  mode,
  strict,
  artifacts: null,
  state: null,
  retro: null,
  checkpoint: null,
  growth: null,
  surface: { pages: null, endpoints: null, warnings: [] },
};

// 1) artifact + secret 只扫描一次；后续 state/checkpoint 用 --artifacts-ok 复用。
try {
  const artifacts = checkArtifacts(project, { maxEvidenceFiles });
  summary.artifacts = {
    ok: artifacts.errors.length === 0 && (!strict || artifacts.warnings.length === 0),
    errors: artifacts.errors,
    warnings: artifacts.warnings,
    scanned: artifacts.scanned,
    truncated: artifacts.truncated,
    secrets: artifacts.secrets,
  };
  if (artifacts.errors.length > 0) {
    failures.push(`artifact/secret: ${artifacts.errors.length} error(s)`);
  }
  if (strict && artifacts.warnings.length > 0) {
    failures.push(`artifact/secret: ${artifacts.warnings.length} warning(s) under --strict`);
  }
} catch (error) {
  summary.artifacts = { ok: false, error: error.message };
  failures.push(`artifact/secret: ${error.message}`);
}

// 2) state-check：复用 artifact 结果。
const stateArgs = ["--project", project, "--json", "--artifacts-ok", "--max-evidence-files", String(maxEvidenceFiles)];
if (strict) stateArgs.push("--strict");
if (bootstrap) stateArgs.push("--bootstrap");
summary.state = run("state-check.mjs", stateArgs);
if (!summary.state.ok) failures.push(`state: exit ${summary.state.status}`);

// 3) retro-check：到期会 exit 1，必须阻断新功能/交接。
summary.retro = run("retro-check.mjs", ["--project", project, "--json"]);
if (!summary.retro.ok) failures.push(`retro: exit ${summary.retro.status} (due or parse error)`);

// 4) checkpoint-check：复用 artifact 结果；handoff 模式加 --handoff。
const checkpointArgs = ["--project", project, "--json", "--artifacts-ok", "--max-evidence-files", String(maxEvidenceFiles)];
if (mode === "handoff") checkpointArgs.push("--handoff");
if (strict) checkpointArgs.push("--strict");
if (offline) checkpointArgs.push("--offline");
summary.checkpoint = run("checkpoint-check.mjs", checkpointArgs);
if (!summary.checkpoint.ok) failures.push(`checkpoint: exit ${summary.checkpoint.status}`);

// 5) growth-check：索引/净零/债务。
summary.growth = run("growth-check.mjs", ["--project", project, "--json", "--debt"]);
if (!summary.growth.ok) failures.push(`growth: exit ${summary.growth.status}`);

// 6) 交付面覆盖（1.15.0）：项目有 map 才强制；没有 map 时在 gate/release 给出
// “未建立账本”的 warning，--strict 下升级为失败，避免新项目静默跳过。
const pageMap = path.join(project, ".ai-team", "design", "ux", "PAGE-MAP.json");
const iaFile = path.join(project, ".ai-team", "design", "ux", "IA.md");
const endpointMap = path.join(project, ".ai-team", "design", "architecture", "ENDPOINT-MAP.json");
const contractFile = path.join(project, ".ai-team", "design", "architecture", "API-CONTRACTS.md");
const surfaceMissing = [];
if (fs.existsSync(pageMap)) {
  summary.surface.pages = run("page-coverage-check.mjs", ["--project", project, "--json"]);
  if (!summary.surface.pages.ok) failures.push(`surface-pages: exit ${summary.surface.pages.status}`);
} else if (fs.existsSync(iaFile)) {
  surfaceMissing.push("PAGE-MAP.json");
}
if (fs.existsSync(endpointMap)) {
  summary.surface.endpoints = run("endpoint-coverage-check.mjs", ["--project", project, "--json"]);
  if (!summary.surface.endpoints.ok) failures.push(`surface-endpoints: exit ${summary.surface.endpoints.status}`);
} else if (fs.existsSync(contractFile)) {
  surfaceMissing.push("ENDPOINT-MAP.json");
}
if (surfaceMissing.length > 0 && (mode === "gate" || mode === "release")) {
  const message = `surface: missing ${surfaceMissing.join(" + ")}; create the coverage ledger before G5/release`;
  summary.surface.warnings.push(message);
  if (strict) failures.push(message);
}

const ok = failures.length === 0;
if (json) {
  console.log(JSON.stringify({ ok, failures, ...summary }, null, 2));
} else {
  console.log("AI Team gate check");
  console.log(`project: ${project}`);
  console.log(`mode:    ${mode}${strict ? " (strict)" : ""}`);
  console.log(`artifacts: ${summary.artifacts?.ok ? "PASS" : "FAIL"}${summary.artifacts?.skipped ? " (skipped)" : ""}`);
  console.log(`state:     ${summary.state?.ok ? "PASS" : "FAIL"}`);
  console.log(`retro:     ${summary.retro?.ok ? "not due" : "DUE/FAIL"}`);
  console.log(`checkpoint:${summary.checkpoint?.ok ? " not due" : " DUE/FAIL"}`);
  console.log(`growth:    ${summary.growth?.ok ? "PASS" : "FAIL"}`);
  const surfaceLine = (entry) => (entry ? (entry.ok ? "PASS" : "FAIL") : "SKIP");
  console.log(`surface:   pages ${surfaceLine(summary.surface.pages)} / endpoints ${surfaceLine(summary.surface.endpoints)}`);
  for (const warning of summary.surface.warnings) console.log(`  WARN ${warning}`);
  if (!ok) {
    for (const failure of failures) console.log(`  FAIL ${failure}`);
  }
  console.log(`result:    ${ok ? "PASS" : "FAIL"}`);
}
process.exit(ok ? 0 : 1);
