#!/usr/bin/env node
/**
 * 检查 .ai-team 状态文件是否一致。
 *
 * 检查项：
 *   - PROJECT.md frontmatter 的 track/stage 与 STATUS.md 是否一致；
 *   - STATUS.md 是否包含 Retro / Checkpoint 行；
 *   - HANDOFF.md 记录的 Git commit 是否与当前 HEAD 一致；
 *   - HANDOFF/STATUS 的 checkpoint 是否与 CHECKPOINT.json 同步（P-18）；
 *   - TASKS.md 是否还在使用 `done（...）` 这类非标准完成状态；
 *   - 根目录临时产物与证据编码（调用 artifact-check）。
 *
 * 用法：
 *   node state-check.mjs [--project <dir>] [--json] [--strict]
 *
 * 退出码：
 *   0 = 无 error（warning 不阻断）
 *   1 = 有 error，或 --strict 下有 warning
 *   2 = 没有 .ai-team/state
 *   3 = 读取失败
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { checkArtifacts } from "./artifact-check.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

const project = path.resolve(getArg("--project", process.cwd()).replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const json = hasFlag("--json");
const strict = hasFlag("--strict");

const stateDir = path.join(project, ".ai-team", "state");
const projectFile = path.join(stateDir, "PROJECT.md");
const statusFile = path.join(stateDir, "STATUS.md");
const tasksFile = path.join(stateDir, "TASKS.md");
const handoffFile = path.join(stateDir, "HANDOFF.md");
const checkpointFile = path.join(stateDir, "CHECKPOINT.json");

const errors = [];
const warnings = [];
let artifactSummary = null;
let checkpointSummary = null;

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return data;
}

function gate(value) {
  return (value || "").match(/G[0-8]/)?.[0] || "";
}

function git(gitArgs) {
  return spawnSync("git", gitArgs, { cwd: project, encoding: "utf8" });
}

function sameCommit(a, b) {
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function isAncestor(ancestor, descendant) {
  if (!ancestor || !descendant) return false;
  return git(["merge-base", "--is-ancestor", ancestor, descendant]).status === 0;
}

function isDocOnly(file) {
  const f = file.replace(/\\/g, "/");
  return /^docs\//.test(f)
    || /^\.ai-team\//.test(f)
    || /^(README|CHANGELOG|CONTRIBUTING|SECURITY|CODE_OF_CONDUCT|LICENSE)(\.|$)/.test(f)
    || /^(AGENTS|CLAUDE)\.md$/.test(f)
    || /^opencode\.jsonc?$/.test(f)
    || /^\.github\/(ISSUE_TEMPLATE|PULL_REQUEST_TEMPLATE|CODEOWNERS)\//.test(f);
}

function docOnlySince(baseline, head) {
  const ancestor = git(["merge-base", "--is-ancestor", baseline, head]);
  if (ancestor.status !== 0) {
    return { ok: false, reason: "baseline is not an ancestor of HEAD", files: [] };
  }
  const rev = git(["rev-list", `${baseline}..${head}`]);
  if (rev.status !== 0) {
    return { ok: false, reason: "could not list commits after baseline", files: [] };
  }
  const commits = rev.stdout.split(/\r?\n/).filter(Boolean);
  const files = new Set();
  for (const commit of commits) {
    const show = git(["show", "--pretty=format:", "--name-only", commit]);
    if (show.status !== 0) {
      return { ok: false, reason: `could not inspect ${commit}`, files: [...files] };
    }
    for (const file of show.stdout.split(/\r?\n/).filter(Boolean)) files.add(file);
  }
  const nonDoc = [...files].filter((file) => !isDocOnly(file));
  return { ok: nonDoc.length === 0, reason: nonDoc.length ? "non-doc changes after baseline" : "", files: [...files], nonDoc };
}

if (!fs.existsSync(stateDir)) {
  const message = `not an AI Team project: missing ${stateDir}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(2);
}

try {
  const projectFm = fs.existsSync(projectFile) ? frontmatter(read(projectFile)) : {};
  const statusText = fs.existsSync(statusFile) ? read(statusFile) : "";
  const statusTrack = statusText.match(/^-\s*Track:\s*(\S+)/m)?.[1] || "";
  const statusStage = gate(statusText.match(/^-\s*Stage:\s*([^\r\n]+)/m)?.[1] || "");
  const projectTrack = projectFm.track || "";
  const projectStage = gate(projectFm.stage || "");

  if (projectTrack && statusTrack && projectTrack !== statusTrack) {
    errors.push(`track mismatch: PROJECT.md=${projectTrack}, STATUS.md=${statusTrack}`);
  }
  if (projectStage && statusStage && projectStage !== statusStage) {
    errors.push(`stage mismatch: PROJECT.md=${projectStage}, STATUS.md=${statusStage}`);
  }
  if (!projectStage) warnings.push("PROJECT.md has no stage");
  if (!statusStage) warnings.push("STATUS.md has no Stage");
  if (!/^-\s*Retro:/m.test(statusText)) warnings.push("STATUS.md has no Retro line");
  if (!/^-\s*Checkpoint:/m.test(statusText)) warnings.push("STATUS.md has no Checkpoint line");

  // P-18：CHECKPOINT.json 是 checkpoint 的唯一事实源；HANDOFF/STATUS 必须同步到它。
  let checkpointCommit = "";
  let checkpointTasks = null;
  if (fs.existsSync(checkpointFile)) {
    try {
      const checkpoint = JSON.parse(read(checkpointFile));
      checkpointCommit = String(checkpoint.last_checkpoint_commit || "");
      const tasksValue = checkpoint.tasks_at_last_checkpoint;
      checkpointTasks = tasksValue !== undefined && tasksValue !== null && Number.isFinite(Number(tasksValue))
        ? Number(tasksValue)
        : null;
      checkpointSummary = {
        commit: checkpointCommit || null,
        tasks: checkpointTasks,
        at: checkpoint.last_checkpoint_at || null,
      };
    } catch {
      warnings.push("CHECKPOINT.json 无法解析");
    }
  }

  const statusCheckpointLine = statusText.match(/^-\s*Checkpoint:\s*([^\r\n]*)/m)?.[1] || "";
  const statusCheckpointSha = statusCheckpointLine.match(/\b[0-9a-f]{7,40}\b/i)?.[0] || "";
  if (statusCheckpointSha && checkpointCommit && !sameCommit(statusCheckpointSha, checkpointCommit)) {
    warnings.push(`STATUS.md Checkpoint=${statusCheckpointSha}, CHECKPOINT.json=${checkpointCommit}; update STATUS after checkpoint sync`);
  }
  const statusDone = statusCheckpointLine.match(/done\s+(\d+)/i)?.[1];
  if (statusDone && checkpointTasks !== null && Number(statusDone) !== checkpointTasks) {
    warnings.push(`STATUS.md Checkpoint done=${statusDone}, CHECKPOINT.json done=${checkpointTasks}; update STATUS after checkpoint sync`);
  }

  if (fs.existsSync(handoffFile)) {
    const handoffText = read(handoffFile);
    const gitLineText = handoffText.match(/^-\s*Git[：:][^\r\n]*/m)?.[0] || "";
    const baselineLineText = handoffText.match(/^-\s*Baseline[：:][^\r\n]*/m)?.[0] || "";
    const sourceLine = baselineLineText || gitLineText;
    const hashes = [...sourceLine.matchAll(/`?([0-9a-f]{7,40})`?/g)].map((m) => m[1]);
    const baseline = hashes.length ? hashes[hashes.length - 1] : "";
    const head = git(["rev-parse", "--short=7", "HEAD"]);
    const headCommit = head.status === 0 ? head.stdout.trim() : "";
    if (!baseline) {
      warnings.push("HANDOFF.md has no Git/Baseline commit reference");
    } else {
      const checkpointHint = checkpointCommit && !sameCommit(baseline, checkpointCommit)
        ? `; CHECKPOINT.json=${checkpointCommit}; update HANDOFF Git/Baseline to ${checkpointCommit}`
        : "";
      let headBlocked = false;
      if (headCommit && !sameCommit(headCommit, baseline)) {
        const doc = docOnlySince(baseline, headCommit);
        if (!doc.ok) {
          const detail = doc.nonDoc?.length
            ? `; non-doc changes: ${doc.nonDoc.slice(0, 5).join(", ")}${doc.nonDoc.length > 5 ? " ..." : ""}`
            : `; ${doc.reason}`;
          errors.push(`HANDOFF.md baseline=${baseline}, HEAD=${headCommit}${detail}${checkpointHint}`);
          headBlocked = true;
        }
      }
      if (!headBlocked && checkpointCommit && !sameCommit(baseline, checkpointCommit)) {
        const checkpointBehind = sameCommit(checkpointCommit, headCommit) || isAncestor(checkpointCommit, headCommit);
        const baselineBehind = isAncestor(baseline, checkpointCommit);
        if (checkpointBehind && baselineBehind) {
          errors.push(`HANDOFF.md baseline=${baseline} is behind CHECKPOINT.json=${checkpointCommit}; update HANDOFF Git/Baseline to ${checkpointCommit}`);
        } else {
          warnings.push(`HANDOFF.md baseline=${baseline} differs from CHECKPOINT.json=${checkpointCommit}`);
        }
      }
    }
  } else {
    warnings.push("HANDOFF.md missing");
  }

  if (fs.existsSync(tasksFile)) {
    const tasksText = read(tasksFile);
    const legacy = [];
    for (const line of tasksText.split(/\r?\n/)) {
      if (!/^\|\s*TASK-/.test(line)) continue;
      const cells = line.split("|").map((cell) => cell.trim());
      const id = cells[1];
      const status = cells[5] || "";
      if (/^done（/.test(status) || /^done\(/.test(status)) legacy.push(`${id}=${status}`);
    }
    if (legacy.length > 0) {
      warnings.push(`${legacy.length} task(s) use non-standard done(...) status: ${legacy.join(", ")}`);
    }
  }

  // P-15/P-17：根目录产物与证据可读性也属于状态一致性的一部分。
  const artifacts = checkArtifacts(project);
  artifactSummary = {
    errors: artifacts.errors.length,
    warnings: artifacts.warnings.length,
    scanned: artifacts.scanned,
    truncated: artifacts.truncated,
  };
  for (const issue of artifacts.errors) {
    errors.push(`artifact ${issue.code}: ${issue.path}: ${issue.message}; ${issue.suggestion}`);
  }
  if (artifacts.warnings.length > 0) {
    const sample = artifacts.warnings.slice(0, 3).map((issue) => `${issue.code} ${issue.path}`).join("; ");
    warnings.push(`${artifacts.warnings.length} artifact warning(s): ${sample}${artifacts.warnings.length > 3 ? " ..." : ""}`);
  }
} catch (error) {
  const message = `could not read state: ${error.message}`;
  if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  else console.log(`ERROR  ${message}`);
  process.exit(3);
}

const failed = errors.length > 0 || (strict && warnings.length > 0);

if (json) {
  console.log(JSON.stringify({ ok: !failed, errors, warnings, strict, checkpoint: checkpointSummary, artifacts: artifactSummary }, null, 2));
} else {
  console.log("AI Team state check");
  console.log(`project:  ${project}`);
  if (checkpointSummary) {
    console.log(`checkpoint: ${checkpointSummary.commit || "(unknown)"} (done ${checkpointSummary.tasks ?? "?"})`);
  }
  console.log(`errors:   ${errors.length}`);
  for (const error of errors) console.log(`  ERROR  ${error}`);
  console.log(`warnings: ${warnings.length}`);
  for (const warning of warnings) console.log(`  WARN   ${warning}`);
  console.log(`result:   ${failed ? "FAIL" : "PASS"}${strict ? " (strict)" : ""}`);
  if (failed) console.log("action:   fix state files before handoff or gate approval; do not proceed on drifted memory");
}

process.exit(failed ? 1 : 0);
