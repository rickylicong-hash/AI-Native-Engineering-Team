#!/usr/bin/env node
/**
 * 页面覆盖门禁（1.15.0，交付面覆盖）。
 *
 * 解决的问题：IA 注册了几十/上百个页面，但实现只覆盖少数；占位页没有延期依据，
 * 骨架建好后后端落地也不接线，导致“完成度”长期不可见。
 *
 * 设计：团队脚本不解析具体前端框架；项目维护 `PAGE-MAP.json`，本脚本按
 * `current_milestone` 校验：
 *   - `real` 必须有存在的证据文件；
 *   - 已到期里程碑的 P0 页若不是 real，必须有 `DEC-*`/`RISK-*` 延期、复查日期
 *     和接线触发条件；
 *   - `skeleton` 必须写清何时接线；`deferred` 必须有决策与复查日期；
 *   - 输出按里程碑的 real/total、P0 real/total，供 quality-report/gate-check 使用。
 *
 * 用法：
 *   node page-coverage-check.mjs --project .
 *   node page-coverage-check.mjs --project . --json
 *   node page-coverage-check.mjs --project . --milestone M1 --strict
 *   node page-coverage-check.mjs --project . --require-map
 *
 * 退出码：0 = PASS（或没有 map 且未 --require-map）；1 = 有阻断项；2 = 参数/读取错误。
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
  console.log("Usage: node page-coverage-check.mjs [--project DIR] [--map FILE] [--milestone M1] [--json] [--strict] [--require-map]");
  process.exit(0);
}

const project = path.resolve((getArg("--project", ".") || ".").replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const mapFile = path.resolve(project, getArg("--map", ".ai-team/design/ux/PAGE-MAP.json"));
const json = hasFlag("--json");
const strict = hasFlag("--strict");
const requireMap = hasFlag("--require-map");
const milestoneOverride = getArg("--milestone", null);

if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  console.error(`ERROR project not found: ${project}`);
  process.exit(2);
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function pct(part, total) {
  return total > 0 ? part / total : null;
}

function pctText(value) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

const errors = [];
const warnings = [];

if (!fs.existsSync(mapFile)) {
  const message = `PAGE-MAP.json not found: ${mapFile}`;
  if (requireMap) errors.push(message);
  else warnings.push(`${message} (page coverage skipped; use --require-map to enforce)`);
  const result = {
    ok: errors.length === 0 && (!strict || warnings.length === 0),
    present: false,
    project,
    map: mapFile,
    current_milestone: null,
    summary: null,
    errors,
    warnings,
  };
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log("AI Team page coverage check");
    console.log(`project: ${project}`);
    console.log(`map:     ${mapFile} (missing)`);
    console.log(`result:  ${result.ok ? "PASS" : "FAIL"}`);
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

const DEFAULT_MILESTONES = ["M1", "M2", "M3", "M4"];
const milestones = Array.isArray(data.milestones) && data.milestones.length > 0
  ? data.milestones.map((item) => String(item).trim()).filter(Boolean)
  : DEFAULT_MILESTONES;
const rank = new Map(milestones.map((item, index) => [item, index]));
const current = String(milestoneOverride || data.current_milestone || "").trim();
if (!current) {
  errors.push("current_milestone is required (set PAGE-MAP.json current_milestone or pass --milestone)");
} else if (!rank.has(current)) {
  errors.push(`current_milestone "${current}" is not in milestones (${milestones.join(", ")})`);
}
const currentRank = rank.has(current) ? rank.get(current) : Number.POSITIVE_INFINITY;

const pages = Array.isArray(data.pages) ? data.pages : [];
if (pages.length === 0) errors.push("PAGE-MAP.json has no pages");

const VALID_STATUS = new Set(["real", "skeleton", "placeholder", "unavailable", "deferred"]);
const VALID_PRIORITY = new Set(["P0", "P1", "P2"]);
const seenIds = new Set();
const today = new Date().toISOString().slice(0, 10);

function evidencePaths(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return [String(value)];
}

function evidenceExists(value) {
  return evidencePaths(value).some((item) => fs.existsSync(path.resolve(project, item)));
}

function validateDeferral(page, due) {
  const deferral = page.deferral || null;
  const label = page.id;
  if (!deferral || typeof deferral !== "object") {
    if (due) {
      if (page.priority === "P0") errors.push(`${label}: P0 page is ${page.status} in due milestone ${page.milestone} without deferral (DEC/RISK + review_at + upgrade_trigger)`);
      else if (page.priority === "P1") warnings.push(`${label}: P1 page is ${page.status} in due milestone ${page.milestone} without deferral`);
      else warnings.push(`${label}: P2 page is ${page.status} in due milestone ${page.milestone} without deferral`);
    }
    if (page.status === "skeleton") errors.push(`${label}: skeleton must include deferral with upgrade_trigger`);
    return;
  }
  const decision = String(deferral.decision || "").trim();
  const reviewAt = String(deferral.review_at || "").trim();
  const trigger = String(deferral.upgrade_trigger || "").trim();
  if (!/^(DEC|RISK|TASK)-[A-Za-z0-9-]+$/.test(decision)) {
    errors.push(`${label}: deferral.decision must be DEC-*/RISK-*/TASK-* (got "${decision || "-"}")`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewAt)) {
    errors.push(`${label}: deferral.review_at must be YYYY-MM-DD (got "${reviewAt || "-"}")`);
  } else if (reviewAt < today) {
    warnings.push(`${label}: deferral review_at ${reviewAt} is overdue`);
  }
  if (page.status === "skeleton" && !trigger) {
    errors.push(`${label}: skeleton must include deferral.upgrade_trigger (when/how it will be wired)`);
  }
  if (page.status === "deferred" && !trigger) {
    warnings.push(`${label}: deferred page should include deferral.upgrade_trigger`);
  }
}

for (const page of pages) {
  if (!page || typeof page !== "object") {
    errors.push("page entry must be an object");
    continue;
  }
  const id = String(page.id || "").trim();
  const priority = String(page.priority || "").trim().toUpperCase();
  const milestone = String(page.milestone || "").trim();
  const status = String(page.status || "").trim().toLowerCase();
  if (!id) {
    errors.push("page entry missing id");
    continue;
  }
  if (seenIds.has(id)) errors.push(`${id}: duplicate page id`);
  seenIds.add(id);
  if (!VALID_PRIORITY.has(priority)) errors.push(`${id}: priority must be P0/P1/P2 (got "${priority || "-"}")`);
  if (!rank.has(milestone)) errors.push(`${id}: milestone "${milestone || "-"}" is not in milestones (${milestones.join(", ")})`);
  if (!VALID_STATUS.has(status)) errors.push(`${id}: status must be real/skeleton/placeholder/unavailable/deferred (got "${status || "-"}")`);
  const due = rank.has(milestone) && rank.get(milestone) <= currentRank;

  if (status === "real") {
    if (!evidenceExists(page.evidence)) errors.push(`${id}: real page requires an existing evidence path (${evidencePaths(page.evidence).join(", ") || "missing"})`);
    if (page.deferral) warnings.push(`${id}: real page still has a deferral; remove it after wiring`);
    continue;
  }
  if (status === "skeleton") {
    if (!evidenceExists(page.evidence)) errors.push(`${id}: skeleton requires an existing skeleton evidence path`);
    validateDeferral(page, true);
    continue;
  }
  if (status === "deferred") {
    validateDeferral(page, true);
    continue;
  }
  if (status === "placeholder" || status === "unavailable") {
    validateDeferral(page, due);
  }
}

function countsFor(filter) {
  const selected = pages.filter((page) => filter(page));
  const real = selected.filter((page) => String(page.status || "").toLowerCase() === "real").length;
  const p0 = selected.filter((page) => String(page.priority || "").toUpperCase() === "P0");
  const p0Real = p0.filter((page) => String(page.status || "").toLowerCase() === "real").length;
  const byStatus = {};
  for (const status of VALID_STATUS) {
    byStatus[status] = selected.filter((page) => String(page.status || "").toLowerCase() === status).length;
  }
  return {
    total: selected.length,
    real,
    rate: pct(real, selected.length),
    p0_total: p0.length,
    p0_real: p0Real,
    p0_rate: pct(p0Real, p0.length),
    by_status: byStatus,
  };
}

const duePages = pages.filter((page) => rank.has(String(page.milestone || "").trim()) && rank.get(String(page.milestone || "").trim()) <= currentRank);
const summary = {
  current_milestone: current || null,
  milestones,
  pages_total: pages.length,
  ...countsFor(() => true),
  due: countsFor((page) => duePages.includes(page)),
  by_milestone: Object.fromEntries(milestones.map((milestone) => [
    milestone,
    countsFor((page) => String(page.milestone || "").trim() === milestone),
  ])),
};

const ok = errors.length === 0 && (!strict || warnings.length === 0);
const result = {
  ok,
  present: true,
  project,
  map: mapFile,
  current_milestone: current || null,
  summary,
  errors,
  warnings,
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("AI Team page coverage check");
  console.log(`project:   ${project}`);
  console.log(`map:       ${mapFile}`);
  console.log(`milestone: ${current || "-"}`);
  console.log(`pages:     ${summary.real}/${summary.pages_total} real (${pctText(summary.rate)}); P0 ${summary.p0_real}/${summary.p0_total} (${pctText(summary.p0_rate)})`);
  console.log(`due:       ${summary.due.real}/${summary.due.total} real (${pctText(summary.due.rate)}); P0 ${summary.due.p0_real}/${summary.due.p0_total} (${pctText(summary.due.p0_rate)})`);
  for (const milestone of milestones) {
    const item = summary.by_milestone[milestone];
    console.log(`  ${milestone}: ${item.real}/${item.total} real; P0 ${item.p0_real}/${item.p0_total}`);
  }
  console.log(`result:    ${ok ? "PASS" : "FAIL"}`);
  for (const error of errors) console.log(`  ERROR ${error}`);
  for (const warning of warnings) console.log(`  WARN  ${warning}`);
}
process.exit(ok ? 0 : 1);
