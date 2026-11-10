#!/usr/bin/env node
/**
 * 端点覆盖门禁（1.15.0，交付面覆盖）。
 *
 * 解决的问题：API 契约声明了端点，任务/FR 也标了 done，但服务端没有对应
 * Controller；前端只能显示“后端未开放”，却没人知道契约与实现已经脱节。
 *
 * 设计：团队脚本不解析 Java/Node 源码。项目维护 `ENDPOINT-MAP.json`，逐条
 * 给出契约端点的实现证据或显式延期；本脚本解析 `API-CONTRACTS.md` 的
 * `| METHOD | \`/path\` |` 表，校验：
 *   - 每个契约端点都有 map 条目；
 *   - `implemented` 的证据文件存在；
 *   - `deferred` 有 DEC/RISK + 复查日期；
 *   - map 中多出的端点给出 stale warning。
 *
 * 用法：
 *   node endpoint-coverage-check.mjs --project .
 *   node endpoint-coverage-check.mjs --project . --json
 *   node endpoint-coverage-check.mjs --project . --contract .ai-team/design/architecture/API-CONTRACTS.md
 *   node endpoint-coverage-check.mjs --project . --require-map --strict
 *
 * 退出码：0 = PASS（或没有 map/contract 且未 require）；1 = 有阻断项；2 = 参数/读取错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log("Usage: node endpoint-coverage-check.mjs [--project DIR] [--contract FILE] [--map FILE] [--json] [--strict] [--require-map]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const contractFile = path.resolve(project, getArg("--contract", ".ai-team/design/architecture/API-CONTRACTS.md"));
const mapFile = path.resolve(project, getArg("--map", ".ai-team/design/architecture/ENDPOINT-MAP.json"));
const json = hasFlag("--json");
const strict = hasFlag("--strict");
const requireMap = hasFlag("--require-map");

if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  console.error(`ERROR project not found: ${project}`);
  process.exit(2);
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

const errors = [];
const warnings = [];

if (!fs.existsSync(contractFile)) {
  const message = `contract not found: ${contractFile}`;
  if (requireMap) errors.push(message);
  else warnings.push(`${message} (endpoint coverage skipped)`);
  const result = { ok: errors.length === 0, present: false, project, contract: contractFile, map: mapFile, summary: null, errors, warnings };
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log("AI Team endpoint coverage check");
    console.log(`project:  ${project}`);
    console.log(`contract: ${contractFile} (missing)`);
    console.log(`result:   ${result.ok ? "PASS" : "FAIL"}`);
    for (const warning of warnings) console.log(`  WARN  ${warning}`);
    for (const error of errors) console.log(`  ERROR ${error}`);
  }
  process.exit(result.ok ? 0 : 1);
}

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function normalizePath(value) {
  let result = String(value || "").trim();
  result = result.split(/[?#]/)[0];
  result = result.replace(/\/+/g, "/");
  result = result.replace(/:[A-Za-z0-9_]+/g, "{}");
  result = result.replace(/\{[^}]+\}/g, "{}");
  if (result.length > 1) result = result.replace(/\/$/, "");
  return result;
}

function parseContract(text) {
  const endpoints = new Map();
  const skipped = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!/^\|/.test(rawLine)) continue;
    const cells = rawLine.split("|").map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const methodCell = cells[1].replace(/`/g, "").toUpperCase();
    const methodPart = methodCell.split(/[\s/,]+/).filter(Boolean);
    if (methodPart.length === 0 || !methodPart.every((method) => METHODS.has(method))) continue;
    const pathCell = cells[2];
    const paths = [...pathCell.matchAll(/`(\/[^`]+)`/g)].map((match) => match[1]);
    for (const rawPath of paths) {
      if (!/^\/(v1|scim|actuator)\//.test(rawPath)) continue;
      if (rawPath.includes("...") || rawPath.includes("**") || rawPath.includes("<")) {
        skipped.push(rawPath);
        continue;
      }
      const normalized = normalizePath(rawPath);
      for (const method of methodPart) {
        endpoints.set(`${method} ${normalized}`, { method, path: normalized, rawPath });
      }
    }
  }
  return { endpoints, skipped };
}

const contractText = read(contractFile);
const { endpoints: contractEndpoints, skipped } = parseContract(contractText);
for (const pathValue of [...new Set(skipped)]) {
  warnings.push(`wildcard/placeholder endpoint skipped: ${pathValue}`);
}
if (contractEndpoints.size === 0) {
  warnings.push("no concrete endpoints parsed from contract tables");
}

if (!fs.existsSync(mapFile)) {
  const message = `ENDPOINT-MAP.json not found: ${mapFile}`;
  if (requireMap) errors.push(message);
  else warnings.push(`${message} (endpoint coverage skipped; use --require-map to enforce)`);
  const result = {
    ok: errors.length === 0 && (!strict || warnings.length === 0),
    present: false,
    project,
    contract: contractFile,
    map: mapFile,
    summary: { contract_endpoints: contractEndpoints.size, implemented: 0, deferred: 0, covered: 0, missing: contractEndpoints.size },
    errors,
    warnings,
  };
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log("AI Team endpoint coverage check");
    console.log(`project:  ${project}`);
    console.log(`contract: ${contractFile}`);
    console.log(`map:      ${mapFile} (missing)`);
    console.log(`result:   ${result.ok ? "PASS" : "FAIL"}`);
    for (const warning of warnings) console.log(`  WARN  ${warning}`);
    for (const error of errors) console.log(`  ERROR ${error}`);
  }
  process.exit(result.ok ? 0 : 1);
}

let data;
try {
  data = JSON.parse(read(mapFile));
} catch (error) {
  console.error(`ERROR cannot parse ${mapFile}: ${error.message}`);
  process.exit(2);
}

const entries = Array.isArray(data.endpoints) ? data.endpoints : [];
const map = new Map();
for (const entry of entries) {
  if (!entry || typeof entry !== "object") {
    errors.push("endpoint entry must be an object");
    continue;
  }
  const method = String(entry.method || "").trim().toUpperCase();
  const normalized = normalizePath(entry.path);
  const key = `${method} ${normalized}`;
  if (!METHODS.has(method) || !normalized) {
    errors.push(`invalid endpoint entry: ${method || "-"} ${entry.path || "-"}`);
    continue;
  }
  if (map.has(key)) errors.push(`duplicate endpoint map entry: ${key}`);
  map.set(key, { ...entry, method, path: normalized, key });
}

const today = new Date().toISOString().slice(0, 10);
const implemented = [];
const deferred = [];
const missing = [];

function evidenceExists(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.some((item) => fs.existsSync(path.resolve(project, String(item))));
}

for (const [key, endpoint] of contractEndpoints) {
  const entry = map.get(key);
  if (!entry) {
    missing.push(key);
    continue;
  }
  const status = String(entry.status || "").trim().toLowerCase();
  if (status === "implemented") {
    if (!evidenceExists(entry.evidence)) {
      errors.push(`${key}: implemented requires an existing evidence path`);
      continue;
    }
    implemented.push(key);
    continue;
  }
  if (status === "deferred") {
    const deferral = entry.deferral || {};
    const decision = String(deferral.decision || "").trim();
    const reviewAt = String(deferral.review_at || "").trim();
    if (!/^(DEC|RISK|TASK)-[A-Za-z0-9-]+$/.test(decision)) errors.push(`${key}: deferred requires deferral.decision DEC-*/RISK-*/TASK-*`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewAt)) errors.push(`${key}: deferred requires deferral.review_at YYYY-MM-DD`);
    else if (reviewAt < today) warnings.push(`${key}: deferral review_at ${reviewAt} is overdue`);
    deferred.push(key);
    continue;
  }
  errors.push(`${key}: status must be implemented/deferred (got "${status || "-"}")`);
}

for (const key of missing) errors.push(`contract endpoint has no map entry: ${key}`);
for (const key of map.keys()) {
  if (!contractEndpoints.has(key)) warnings.push(`map entry not found in contract (stale?): ${key}`);
}

const covered = implemented.length + deferred.length;
const summary = {
  contract_endpoints: contractEndpoints.size,
  map_entries: map.size,
  implemented: implemented.length,
  deferred: deferred.length,
  covered,
  missing: missing.length,
  coverage_rate: contractEndpoints.size > 0 ? covered / contractEndpoints.size : null,
};
const ok = errors.length === 0 && (!strict || warnings.length === 0);
const result = {
  ok,
  present: true,
  project,
  contract: contractFile,
  map: mapFile,
  summary,
  errors,
  warnings: [...new Set(warnings)],
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const pct = summary.coverage_rate === null ? "n/a" : `${(summary.coverage_rate * 100).toFixed(1)}%`;
  console.log("AI Team endpoint coverage check");
  console.log(`project:  ${project}`);
  console.log(`contract: ${contractFile}`);
  console.log(`map:      ${mapFile}`);
  console.log(`endpoints:${summary.implemented} implemented + ${summary.deferred} deferred / ${summary.contract_endpoints} (${pct}); missing ${summary.missing}`);
  console.log(`result:   ${ok ? "PASS" : "FAIL"}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  for (const warning of result.warnings) console.log(`  WARN  ${warning}`);
}
process.exit(ok ? 0 : 1);
