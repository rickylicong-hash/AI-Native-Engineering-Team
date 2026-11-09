#!/usr/bin/env node
/**
 * 检查是否需要 AI Team checkpoint 提交。
 *
 * 只读检查：不会执行 git add/commit。到期时应由 Chief 调度
 * ai-team/devops-engineer 做精选提交，Chief 自己不得提交。
 *
 * 同时扫描根目录临时产物与证据编码；artifact error 会使 checkpoint 到期，
 * 并让 --mark 拒绝。--strict 还会把 artifact warning 视为到期。
 * 1.6.0 起还扫描证据中的明文凭据，并提供 --sync-docs 自动同步 HANDOFF/STATUS。
 *
 * 用法：
 *   node checkpoint-check.mjs [--project <dir>] [--json] [--quiet] [--strict]
 *   node checkpoint-check.mjs --handoff          # 交接前强制检查
 *   node checkpoint-check.mjs --mark             # 提交成功后记录基线
 *   node checkpoint-check.mjs --sync-docs        # 把 HANDOFF/STATUS 同步到 CHECKPOINT.json
 *   node checkpoint-check.mjs --mark --sync-docs # 标记后立即同步文档
 *   node checkpoint-check.mjs --max-files 20     # 自定义文件阈值
 *   node checkpoint-check.mjs --max-evidence-files 2000  # 证据扫描上限（默认 2000，必须 >= 1）
 *   node checkpoint-check.mjs --artifacts-ok            # 调用方已跑过 artifact-check，跳过重复扫描
 *   node checkpoint-check.mjs --offline                # 不调用 git ls-remote，直接用本地 upstream
 *
 * 远程行写入 HANDOFF 前会剥离 URL userinfo 与 query/fragment，并清洗换行/反引号，
 * 避免凭据随被提交的状态文件进入仓库历史。
 *
 * 退出码：
 *   0 = 未到期
 *   1 = 到期
 *   2 = 不是 git 仓库 / 参数非法
 *   3 = 标记或读取失败
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
const quiet = hasFlag("--quiet");
const handoff = hasFlag("--handoff");
const mark = hasFlag("--mark");
const syncDocs = hasFlag("--sync-docs");
const force = hasFlag("--force");
const strict = hasFlag("--strict");
const artifactsOk = hasFlag("--artifacts-ok") || hasFlag("--skip-artifacts");
const offline = hasFlag("--offline");
const maxFiles = Number.parseInt(getArg("--max-files", "20"), 10) || 20;

/**
 * 读取数量型参数；显式传值必须是 >= 1 的整数（P3-03）。
 * 旧实现用 `parseInt(...) || 2000`，负值会被当成 0 条扫描却仍退出 0，
 * 相当于静默禁用证据/凭据扫描；这里改为参数错误退出 2。
 */
function parseCountOption(name, fallback) {
  const raw = getArg(name, null);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw) || Number.parseInt(raw, 10) < 1) {
    console.error(`ERROR  ${name} must be an integer >= 1 (got "${raw}")`);
    process.exit(2);
  }
  return Number.parseInt(raw, 10);
}

// P-36：与 artifact-check 默认（500）解耦；默认 2000，避免 500+ 证据项目
// 每次 checkpoint 都报 scan-truncated。
const maxEvidenceFiles = parseCountOption("--max-evidence-files", 2000);

const stateDir = path.join(project, ".ai-team", "state");
const tasksFile = path.join(stateDir, "TASKS.md");
const statusFile = path.join(stateDir, "STATUS.md");
const handoffFile = path.join(stateDir, "HANDOFF.md");
const checkpointFile = path.join(stateDir, "CHECKPOINT.json");

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function git(gitArgs, options = {}) {
  return spawnSync("git", gitArgs, { cwd: project, encoding: "utf8", ...options });
}

function countDone(text) {
  let done = 0;
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*TASK-[A-Za-z0-9-]+\s*\|/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 7) continue;
    const id = cells[1];
    const status = cells[5] || "";
    if (!/^done\b/i.test(status)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    done++;
  }
  return done;
}

function detectStage() {
  if (!fs.existsSync(statusFile)) return "unknown";
  const match = read(statusFile).match(/^-\s*Stage:\s*([^\r\n]+)/m);
  if (!match) return "unknown";
  const stage = match[1].match(/G[0-8]/);
  return stage ? stage[0] : "unknown";
}

function auditHead() {
  const show = git(["show", "--pretty=format:", "--name-only", "HEAD"]);
  if (show.status !== 0) return [];
  const files = show.stdout.split(/\r?\n/).filter(Boolean);
  const violations = [];
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    const rawEvidence = /^\.ai-team\/work\/.*\.(txt|log)$/.test(normalized)
      || /^\.ai-team\/work\/.*-logs\//.test(normalized)
      || /^\.ai-team\/(?:.*\/)?(?:tmp|screenshots)\//.test(normalized);
    const secret = /(^|\/)\.env($|\.)/.test(normalized) && !/\.env\.(example|sample|template)$/.test(normalized)
      || /\.(pem|key|p12|jks)$/.test(normalized);
    const build = /(^|\/)(node_modules|target|dist)\//.test(normalized);
    if (rawEvidence || secret || build) violations.push(normalized);
  }
  return [...new Set(violations)];
}

function replaceFirstHash(line, commit) {
  if (/`[0-9a-f]{7,40}`/i.test(line)) return line.replace(/`[0-9a-f]{7,40}`/i, `\`${commit}\``);
  if (/\b[0-9a-f]{7,40}\b/i.test(line)) return line.replace(/\b[0-9a-f]{7,40}\b/i, commit);
  return `${line.trimEnd()} \`${commit}\``;
}

function replaceLastHash(line, commit) {
  const hashes = [...line.matchAll(/`?([0-9a-f]{7,40})`?/gi)];
  if (hashes.length > 0) {
    const last = hashes[hashes.length - 1];
    const start = last.index;
    const end = start + last[0].length;
    return `${line.slice(0, start)}\`${commit}\`${line.slice(end)}`;
  }
  return `${line.trimEnd()} \`${commit}\``;
}

/**
 * 清洗写入 Markdown 单行的文本（P3-01）：
 * - CR/LF 折成空格，避免一行拆成两行破坏 HANDOFF 结构；
 * - 反引号替换为单引号，避免破坏 code span 的奇偶配对。
 */
function sanitizeInline(value) {
  return String(value).replace(/[\r\n]+/g, " ").replace(/`/g, "'").trim();
}

/**
 * 剥离 URL 中的凭据与 query/fragment（P1-01 / R3 L-01）。
 *
 * 顺序很关键：必须在 sanitizeInline 之前处理**原文**。若先清洗，
 * userinfo 内的 CR/LF 会被折成空格，`[^/\s]*` 就跨不过空白，
 * 密码会原样写进被提交的 HANDOFF.md。这里改为：
 *   1. 只定位 authority 段（scheme:// 或 // 之后、第一个 / 之前），
 *      去掉其中最后一个 @ 及其左侧的 userinfo；允许 userinfo 含空白/换行。
 *   2. 无 scheme 的 scp 形式 `user:pass@host:path` 剥掉 `user:pass@`；
 *      不含冒号的 `git@host:path` 是纯用户名，不算凭据，保持原样。
 *   3. 最后统一去掉 query/fragment（`?private_token=...`/`#...`），
 *      避免 query 参数中的 token 随远程行进入提交。
 *   4. 只在这一步做 sanitizeInline，保证输出单行、反引号成对。
 */
function stripUserinfo(url) {
  let raw = String(url).trim();
  const authority = raw.match(/^([a-z][a-z0-9+.-]*:\/\/|\/\/)([^/]*)([\s\S]*)$/i);
  if (authority) {
    const [, prefix, hostPart, rest] = authority;
    const at = hostPart.lastIndexOf("@");
    if (at >= 0) raw = `${prefix}${hostPart.slice(at + 1)}${rest}`;
  } else {
    // 只匹配“带密码的 userinfo”，且 host 段不含反斜杠/空白，
    // 避免把 `C:\repos\my@repo` 这类本地路径误判成远程 URL。
    raw = raw.replace(/^[^/@\\\s]+:[^/@\\\s]*@(?=[^/\\\s]*(?:[:/]|$))/, "");
  }
  raw = raw.replace(/[?#][\s\S]*$/, "");
  return sanitizeInline(raw);
}

/**
 * 生成 HANDOFF 的“- 远程：”行（P-35）。
 * 读取 origin URL、当前分支、upstream、ahead 数和 upstream 短 SHA；
 * 无 origin/upstream（含 detached HEAD）时返回 `(no upstream)`，不阻断同步。
 * 所有外部字符串先脱敏/清洗，避免凭据或换行进入被提交的 HANDOFF.md。
 */
function remoteLine() {
  const branchResult = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const branchRaw = branchResult.status === 0 ? branchResult.stdout.trim() : "";
  const upstreamResult = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const upstreamRaw = upstreamResult.status === 0 ? upstreamResult.stdout.trim() : "";
  if (!branchRaw || branchRaw === "HEAD" || !upstreamRaw) {
    return "- 远程：(no upstream)";
  }
  const remoteName = upstreamRaw.split("/")[0] || "origin";
  const remoteUrlResult = git(["remote", "get-url", remoteName]);
  const remoteUrl = remoteUrlResult.status === 0 ? stripUserinfo(remoteUrlResult.stdout) : "";
  if (!remoteUrl) {
    return "- 远程：(no upstream)";
  }
  const branch = sanitizeInline(branchRaw);
  const upstream = sanitizeInline(upstreamRaw);
  // P-39：ahead 以远端实测 SHA 为准，避免本地 origin/master 过期导致“假 ahead”。
  // ls-remote 是只读网络调用；失败/超时/远端 SHA 不在本地对象库时回退本地 upstream，
  // 并在输出中显式标记 local，不能把推断值写成“实测”。
  let ahead = "(unknown)";
  let sha = "(unknown)";
  let source = "local";
  const remoteResult = offline ? { status: 1, stdout: "" } : git(["ls-remote", "--heads", remoteName], { timeout: 15000 });
  if (remoteResult.status === 0 && remoteResult.stdout.trim()) {
    const ref = `refs/heads/${branchRaw}`;
    const line = remoteResult.stdout.trim().split(/\r?\n/).find((row) => row.split(/\s+/)[1] === ref);
    const remoteSha = line ? line.split(/\s+/)[0] : "";
    if (/^[0-9a-f]{40,64}$/i.test(remoteSha)) {
      const aheadResult = git(["rev-list", "--count", `${remoteSha}..HEAD`]);
      if (aheadResult.status === 0) {
        ahead = sanitizeInline(aheadResult.stdout);
        sha = remoteSha.slice(0, 7);
        source = "ls-remote";
      }
    }
  }
  if (source === "local") {
    const aheadResult = git(["rev-list", "--count", `${upstreamRaw}..HEAD`]);
    ahead = aheadResult.status === 0 ? sanitizeInline(aheadResult.stdout) : "(unknown)";
    const shaResult = git(["rev-parse", "--short", upstreamRaw]);
    sha = shaResult.status === 0 ? sanitizeInline(shaResult.stdout) : "(unknown)";
  }
  const sourceText = source === "ls-remote" ? "实测 `git ls-remote`" : "local";
  return `- 远程：\`${remoteName} ${remoteUrl}\`，\`${branch}\` ahead ${ahead}（\`${upstream}=${sha}\`，${sourceText}）`;
}

/**
 * 读取 GROWTH frontmatter，供 STATUS 的 Retro 行使用（P-51）。
 * 只读；缺失/解析失败返回 null，不阻断 checkpoint。
 */
function growthMeta() {
  const file = path.join(project, ".ai-team", "team", "GROWTH.md");
  if (!fs.existsSync(file)) return null;
  const match = read(file).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim();
  }
  return data;
}

/**
 * 读取 growth-check 的 JSON 摘要（P-51），供 STATUS 的 Growth 行使用。
 * 失败返回 null，保留原行；不因为 GROWTH 临时不可读而阻断 checkpoint。
 */
function growthSummary() {
  const file = path.join(project, ".ai-team", "team", "GROWTH.md");
  if (!fs.existsSync(file)) return null;
  const result = spawnSync(process.execPath, [path.join(path.dirname(process.argv[1]), "growth-check.mjs"), "--project", project, "--json"], {
    cwd: project,
    encoding: "utf8",
    timeout: 15000,
  });
  if (result.status !== 0 || !result.stdout) return null;
  try {
    const data = JSON.parse(result.stdout);
    if (!Number.isFinite(data.open) || !Number.isFinite(data.done)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 构建 HANDOFF/STATUS 的下一版内容（只读，不写盘，P2-01）。
 *
 * 所有前置校验都在这里完成：文件存在、HANDOFF 的 Git/Baseline 行、
 * STATUS 的 Checkpoint 行。任何一项失败都返回 ok:false，调用方不得写文件，
 * 从而保证失败路径没有半写。
 */
function buildStateDocs(commit, doneCount) {
  const changes = [];
  if (!fs.existsSync(handoffFile)) {
    return { ok: false, error: "HANDOFF.md missing; cannot sync Git/Baseline", changes };
  }
  if (!fs.existsSync(statusFile)) {
    return { ok: false, error: "STATUS.md missing; cannot sync Checkpoint", changes };
  }
  const handoffText = read(handoffFile);
  const handoffEol = handoffText.includes("\r\n") ? "\r\n" : "\n";
  const handoffLines = handoffText.split(/\r?\n/);
  // P-35/P-39：远程/ahead 由脚本读取；P-51：STATUS 的 Retro/Growth/远程行也由脚本生成。
  const remote = remoteLine();
  const growth = growthSummary();
  const meta = growthMeta();
  const remoteIndexes = [];
  let gitIndex = -1;
  let baselineIndex = -1;
  for (let i = 0; i < handoffLines.length; i += 1) {
    const line = handoffLines[i];
    if (/^-\s*远程[：:]/.test(line)) {
      remoteIndexes.push(i);
    } else if (/^-\s*Git[：:]/.test(line) && gitIndex < 0) {
      gitIndex = i;
    } else if (/^-\s*Baseline[：:]/.test(line) && baselineIndex < 0) {
      baselineIndex = i;
    }
  }
  if (gitIndex < 0 || baselineIndex < 0) {
    return { ok: false, error: "HANDOFF.md needs both '- Git:' and '- Baseline:' lines", changes };
  }
  const previousRemote = remoteIndexes.length > 0 ? handoffLines[remoteIndexes[0]] : null;
  // P3-02：重复的“- 远程：”只保留一行；倒序删除避免索引漂移。
  for (const index of remoteIndexes.slice(1).reverse()) handoffLines.splice(index, 1);
  if (remoteIndexes.length === 0) {
    // 旧 HANDOFF 没有“- 远程：”时插到“- Git：”前，兼容既有格式。
    handoffLines.splice(gitIndex, 0, remote);
    changes.push("HANDOFF.md 远程");
  } else {
    handoffLines[remoteIndexes[0]] = remote;
    if (previousRemote !== remote || remoteIndexes.length > 1) changes.push("HANDOFF.md 远程");
  }
  const nextGitIndex = handoffLines.findIndex((line) => /^-\s*Git[：:]/.test(line));
  if (nextGitIndex >= 0) {
    const updated = replaceFirstHash(handoffLines[nextGitIndex], commit);
    if (updated !== handoffLines[nextGitIndex]) changes.push("HANDOFF.md Git");
    handoffLines[nextGitIndex] = updated;
  }
  const nextBaselineIndex = handoffLines.findIndex((line) => /^-\s*Baseline[：:]/.test(line));
  if (nextBaselineIndex >= 0) {
    const updated = replaceLastHash(handoffLines[nextBaselineIndex], commit);
    if (updated !== handoffLines[nextBaselineIndex]) changes.push("HANDOFF.md Baseline");
    handoffLines[nextBaselineIndex] = updated;
  }
  const nextHandoff = handoffLines.join(handoffEol);

  const statusText = read(statusFile);
  const statusEol = statusText.includes("\r\n") ? "\r\n" : "\n";
  const statusLines = statusText.split(/\r?\n/);
  let statusCheckpoint = false;
  let statusHeadChanged = false;
  let statusRemote = false;
  let statusRetro = false;
  let statusGrowth = false;
  for (let i = 0; i < statusLines.length; i += 1) {
    const line = statusLines[i];
    if (/^-\s*Checkpoint[：:]/.test(line)) {
      const updated = `- Checkpoint: \`${commit}\`（done ${doneCount}）`;
      if (updated !== line) changes.push("STATUS.md Checkpoint");
      statusLines[i] = updated;
      statusCheckpoint = true;
    } else if (/^-\s*HEAD[：:]/.test(line)) {
      const updated = replaceFirstHash(line, commit);
      if (updated !== line) statusHeadChanged = true;
      statusLines[i] = updated;
    } else if (!statusRemote && /^-\s*远程[：:]/.test(line)) {
      if (line !== remote) changes.push("STATUS.md 远程");
      statusLines[i] = remote;
      statusRemote = true;
    } else if (!statusRetro && /^-\s*Retro[：:]/.test(line) && meta?.last_retro) {
      const updated = `- Retro: ${meta.last_retro}（done ${doneCount} → next ${meta.next_due_at || "?"}）`;
      if (updated !== line) changes.push("STATUS.md Retro");
      statusLines[i] = updated;
      statusRetro = true;
    } else if (!statusGrowth && /^-\s*Growth[：:]/.test(line) && growth) {
      const updated = `- Growth: open ${growth.openAll ?? growth.open} / done ${growth.done}（以 \`growth-check\` 为准）`;
      if (updated !== line) changes.push("STATUS.md Growth");
      statusLines[i] = updated;
      statusGrowth = true;
    }
  }
  if (!statusCheckpoint) {
    return { ok: false, error: "STATUS.md needs a '- Checkpoint:' line", changes };
  }
  if (statusHeadChanged) changes.push("STATUS.md HEAD");
  if (!statusRemote) {
    const checkpointIndex = statusLines.findIndex((line) => /^-\s*Checkpoint[：:]/.test(line));
    if (checkpointIndex >= 0) {
      statusLines.splice(checkpointIndex + 1, 0, remote);
      changes.push("STATUS.md 远程");
    }
  }
  if (!statusRetro && meta?.last_retro) {
    const anchor = statusLines.findIndex((line) => /^-\s*Last gate[：:]/.test(line));
    if (anchor >= 0) {
      statusLines.splice(anchor + 1, 0, `- Retro: ${meta.last_retro}（done ${doneCount} → next ${meta.next_due_at || "?"}）`);
      changes.push("STATUS.md Retro");
    }
  }
  if (!statusGrowth && growth) {
    const anchor = statusLines.findIndex((line) => /^-\s*Retro[：:]/.test(line));
    if (anchor >= 0) {
      statusLines.splice(anchor + 1, 0, `- Growth: open ${growth.openAll ?? growth.open} / done ${growth.done}（以 \`growth-check\` 为准）`);
      changes.push("STATUS.md Growth");
    }
  }
  const nextStatus = statusLines.join(statusEol);

  // 只把真正有变化的文件放进计划，避免无谓改写（保留 CRLF/原内容）。
  const files = [];
  if (nextHandoff !== handoffText) files.push({ path: handoffFile, content: nextHandoff, original: handoffText });
  if (nextStatus !== statusText) files.push({ path: statusFile, content: nextStatus, original: statusText });
  return { ok: true, changes, files };
}

/**
 * 同步 HANDOFF/STATUS：build（校验+计算）全部通过后才 apply（写盘）。
 * --sync-docs 单跑走这里；--mark --sync-docs 复用 build/apply 以保持同样的顺序。
 */
function syncStateDocs(commit, doneCount) {
  const plan = buildStateDocs(commit, doneCount);
  if (!plan.ok) return { ok: false, error: plan.error, changes: plan.changes };
  const applied = applyStateDocs(plan);
  if (!applied.ok) return { ok: false, error: applied.error, changes: plan.changes };
  return { ok: true, changes: plan.changes };
}

/**
 * 应用 buildStateDocs 的计划：先写临时文件，再统一 rename，降低半写概率。
 * 执行阶段不再做业务校验；build 失败时本函数不会被调用。
 * rename 中途失败时，把已替换的文件恢复成原内容（尽力而为）。
 */
function applyStateDocs(plan) {
  if (!plan.ok || plan.files.length === 0) return { ok: true };
  const staged = [];
  const applied = [];
  try {
    for (const entry of plan.files) {
      const temp = `${entry.path}.tmp-${process.pid}`;
      fs.writeFileSync(temp, entry.content, "utf8");
      staged.push({ temp, dest: entry.path, original: entry.original });
    }
    for (const entry of staged) {
      fs.renameSync(entry.temp, entry.dest);
      applied.push(entry);
    }
    return { ok: true };
  } catch (error) {
    for (const entry of applied) {
      try {
        fs.writeFileSync(entry.dest, entry.original, "utf8");
      } catch {
        // 恢复失败不掩盖原始写盘错误
      }
    }
    for (const entry of staged) {
      try {
        if (fs.existsSync(entry.temp)) fs.unlinkSync(entry.temp);
      } catch {
        // 临时文件清理失败忽略
      }
    }
    return { ok: false, error: `failed to write state docs: ${error.message}` };
  }
}

if (!fs.existsSync(tasksFile)) {
  const message = `not an AI Team project: missing ${tasksFile}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(3);
}

const inside = git(["rev-parse", "--is-inside-work-tree"]);
if (inside.status !== 0 || inside.stdout.trim() !== "true") {
  const message = `not a git repository: ${project}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(2);
}

const status = git(["status", "--porcelain"]);
if (status.status !== 0) {
  const message = `git status failed: ${status.stderr.trim()}`;
  if (json) console.log(JSON.stringify({ ok: false, due: null, error: message }, null, 2));
  else if (!quiet) console.log(`ERROR  ${message}`);
  process.exit(3);
}

const lines = status.stdout.split(/\r?\n/).filter(Boolean);
const changed = lines.length;
const untracked = lines.filter((line) => line.startsWith("??")).length;
const modified = changed - untracked;
const done = countDone(read(tasksFile));
const stage = detectStage();

let checkpoint = {};
let warning = "";
if (fs.existsSync(checkpointFile)) {
  try {
    checkpoint = JSON.parse(read(checkpointFile));
  } catch {
    warning = "CHECKPOINT.json 无法解析，按从未 checkpoint 处理";
  }
}
const parsedLast = Number.parseInt(checkpoint.tasks_at_last_checkpoint ?? "0", 10);
const last = Number.isFinite(parsedLast) ? parsedLast : 0;
const lastAt = checkpoint.last_checkpoint_at || "never";
const lastCommit = checkpoint.last_checkpoint_commit || "";

const head = git(["rev-parse", "--short", "HEAD"]);
const headCommit = head.status === 0 ? head.stdout.trim() : "(no commits)";
const branchResult = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const branch = branchResult.status === 0 ? branchResult.stdout.trim() : "unknown";
const headViolations = head.status === 0 ? auditHead() : [];

// P-26：把 HANDOFF/STATUS 的基线字段同步到 CHECKPOINT.json，避免每次
// checkpoint 后再派一个纯文档 subagent。
if (syncDocs && !mark) {
  const commit = String(checkpoint.last_checkpoint_commit || "");
  const doneCount = checkpoint.tasks_at_last_checkpoint !== undefined && Number.isFinite(Number(checkpoint.tasks_at_last_checkpoint))
    ? Number(checkpoint.tasks_at_last_checkpoint)
    : done;
  if (!commit) {
    const message = "CHECKPOINT.json has no last_checkpoint_commit; run --mark first";
    if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  // P2-01：syncStateDocs 内部先完成全部校验与内容计算，再写盘。
  const result = syncStateDocs(commit, doneCount);
  if (!result.ok) {
    if (json) console.log(JSON.stringify({ ok: false, error: result.error, changes: result.changes }, null, 2));
    else {
      console.log(`ERROR  ${result.error}`);
      for (const change of result.changes) console.log(`  CHANGED ${change}`);
    }
    process.exit(3);
  }
  if (json) console.log(JSON.stringify({ ok: true, commit, done: doneCount, changes: result.changes }, null, 2));
  else {
    console.log(`SYNCED  HANDOFF/STATUS -> ${commit} (done ${doneCount})`);
    for (const change of result.changes) console.log(`  CHANGED ${change}`);
    console.log("next: run state-check, then commit the doc-only sync.");
  }
  process.exit(0);
}

// P-15/P-17：被 .gitignore 忽略的日志不会被 git status 看到，必须单独扫描根目录。
// 1.13.0：gate-check 已跑过 artifact-check 时用 --artifacts-ok 复用结果，避免重复扫描。
let artifactResult = { errors: [], warnings: [], scanned: 0, truncated: false };
let artifactReadError = "";
if (!artifactsOk) {
  try {
    artifactResult = checkArtifacts(project, { maxEvidenceFiles });
  } catch (error) {
    artifactReadError = `artifact check failed: ${error.message}`;
  }
} else {
  artifactResult = { errors: [], warnings: [], scanned: 0, truncated: false, skipped: true, reason: "artifacts-ok" };
}
const artifactErrors = artifactResult.errors;
const artifactWarnings = artifactResult.warnings;

const reasons = [];
if (changed > 0) {
  if (handoff) reasons.push("handoff");
  if (["G5", "G7", "G8"].includes(stage)) reasons.push(`gate-${stage}`);
  if (changed >= maxFiles) reasons.push(`files-${changed}`);
  // 任务计数只在项目已有 checkpoint 基线后启用，避免老项目因缺少
  // CHECKPOINT.json 被误判为“从未提交”。
  if (fs.existsSync(checkpointFile) && done - last >= 10) reasons.push(`tasks-${done}-last-${last}`);
}
if (headViolations.length > 0) reasons.push("head-noncompliant");
if (artifactErrors.length > 0) reasons.push(`artifacts-${artifactErrors.length}`);
if (strict && artifactWarnings.length > 0) reasons.push(`artifact-warnings-${artifactWarnings.length}`);
if (force) reasons.push("forced");

if (mark) {
  if (changed > 0) {
    const message = `working tree is not clean (${changed} files); commit first, then run --mark`;
    if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  if (headViolations.length > 0) {
    const message = `HEAD ${headCommit} contains ${headViolations.length} forbidden path(s); do not mark it as a clean baseline:\n- ${headViolations.join("\n- ")}`;
    if (json) console.log(JSON.stringify({ ok: false, error: message, violations: headViolations }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  if (artifactErrors.length > 0) {
    const message = `working tree has ${artifactErrors.length} artifact hygiene error(s); clean them before marking a checkpoint:\n- ${artifactErrors.slice(0, 10).map((issue) => `${issue.code}: ${issue.path}`).join("\n- ")}`;
    if (json) console.log(JSON.stringify({ ok: false, error: message, artifacts: artifactResult }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  if (strict && artifactWarnings.length > 0) {
    const message = `working tree has ${artifactWarnings.length} artifact warning(s) under --strict; fix or omit --strict only with a documented risk`;
    if (json) console.log(JSON.stringify({ ok: false, error: message, artifacts: artifactResult }, null, 2));
    else console.log(`ERROR  ${message}`);
    process.exit(3);
  }
  // P2-01：sync 计划必须在写 CHECKPOINT.json 之前完成全部校验与内容计算；
  // 校验失败时直接退出，HANDOFF/STATUS/CHECKPOINT 都不动。
  let syncPlan = null;
  if (syncDocs) {
    syncPlan = buildStateDocs(headCommit, done);
    if (!syncPlan.ok) {
      const message = `cannot sync HANDOFF/STATUS: ${syncPlan.error}`;
      if (json) console.log(JSON.stringify({ ok: false, error: message, changes: syncPlan.changes }, null, 2));
      else {
        console.log(`ERROR  ${message}`);
        for (const change of syncPlan.changes) console.log(`  CHANGED ${change}`);
      }
      process.exit(3);
    }
  }
  const payload = {
    last_checkpoint_at: new Date().toISOString(),
    last_checkpoint_commit: headCommit,
    tasks_at_last_checkpoint: done,
    updated: new Date().toISOString().slice(0, 10),
  };
  const next = [
    `HANDOFF Git/Baseline = ${headCommit}`,
    `STATUS Checkpoint = ${headCommit} (done ${done})`,
    "run checkpoint-check --sync-docs (or update the two doc lines manually), then state-check",
  ];
  // 记录旧的 CHECKPOINT.json 内容，文档写盘失败时回滚，避免“已标记但未同步”。
  const previousCheckpoint = fs.existsSync(checkpointFile) ? read(checkpointFile) : null;
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(checkpointFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const syncResult = syncPlan ? applyStateDocs(syncPlan) : { ok: true };
  if (!syncResult.ok) {
    // 回滚标记：恢复旧 CHECKPOINT.json（原本不存在则删除），保证失败路径零残留。
    try {
      if (previousCheckpoint === null) fs.rmSync(checkpointFile, { force: true });
      else fs.writeFileSync(checkpointFile, previousCheckpoint, "utf8");
    } catch {
      // 回滚失败时无法进一步恢复，但必须保留原始错误可见
    }
    if (json) console.log(JSON.stringify({ ok: false, marked: payload, error: syncResult.error, changes: syncPlan.changes }, null, 2));
    else {
      console.log(`ERROR  ${syncResult.error}`);
      console.log("       CHECKPOINT.json rolled back; no state file was intentionally kept.");
    }
    process.exit(3);
  }
  if (json) console.log(JSON.stringify({ ok: true, marked: payload, next, synced: syncPlan ? syncPlan.changes : [] }, null, 2));
  else if (!quiet) {
    console.log(`MARKED  ${path.relative(project, checkpointFile)} (${headCommit}, done ${done})`);
    if (syncPlan && syncPlan.changes.length > 0) {
      console.log("SYNCED:");
      for (const change of syncPlan.changes) console.log(`  - ${change}`);
      console.log("NEXT: run state-check, then commit the doc-only sync.");
    } else {
      console.log("NEXT:");
      for (const step of next) console.log(`  - ${step}`);
    }
  }
  process.exit(0);
}

const due = reasons.length > 0;
if (json) {
  console.log(JSON.stringify({
    ok: true,
    due,
    reasons,
    changed,
    modified,
    untracked,
    maxFiles,
    maxEvidenceFiles,
    done,
    last,
    lastAt,
    lastCommit,
    head: headCommit,
    branch,
    stage,
    checkpoint: fs.existsSync(checkpointFile) ? path.relative(project, checkpointFile).replace(/\\/g, "/") : null,
    headViolations,
    strict,
    artifacts: {
      errors: artifactErrors,
      warnings: artifactWarnings,
      scanned: artifactResult.scanned,
      truncated: artifactResult.truncated,
      readError: artifactReadError,
    },
    warnings: warning ? [warning] : [],
  }, null, 2));
} else if (!quiet) {
  console.log("AI Team checkpoint check");
  console.log(`project:  ${project}`);
  console.log(`branch:   ${branch} @ ${headCommit}`);
  console.log(`stage:    ${stage}`);
  console.log(`tasks:    done ${done}, last checkpoint ${last} (${lastAt}${lastCommit ? ` @ ${lastCommit}` : ""})`);
  console.log(`changed:  ${changed} files (modified ${modified}, untracked ${untracked})`);
  console.log(`artifacts: ${artifactErrors.length} error(s), ${artifactWarnings.length} warning(s), ${artifactResult.scanned} evidence file(s) scanned`);
  if (artifactReadError) console.log(`warning:  ${artifactReadError}`);
  for (const issue of artifactErrors.slice(0, 5)) {
    console.log(`  ERROR [${issue.code}] ${issue.path}: ${issue.message}; ${issue.suggestion}`);
  }
  if (artifactErrors.length > 5) console.log(`  ... and ${artifactErrors.length - 5} more artifact error(s)`);
  for (const issue of artifactWarnings.slice(0, 3)) {
    console.log(`  WARN  [${issue.code}] ${issue.path}: ${issue.message}`);
  }
  if (artifactWarnings.length > 3) console.log(`  ... and ${artifactWarnings.length - 3} more artifact warning(s)`);
  console.log(`due:      ${due ? "YES" : "no"}${due ? ` (${reasons.join(", ")})` : ""}`);
  if (warning) console.log(`warning:  ${warning}`);
  if (headViolations.length > 0) {
    console.log(`warning:  HEAD ${headCommit} contains ${headViolations.length} forbidden path(s) (raw logs, secrets, build output); --mark will refuse it:`);
    for (const file of headViolations.slice(0, 10)) console.log(`          - ${file}`);
    if (headViolations.length > 10) console.log(`          ... and ${headViolations.length - 10} more`);
  }
  if (due) {
    console.log("action:   dispatch ai-team/devops-engineer for a curated checkpoint;");
    console.log("          Project Chief/read-only roles must NOT run git add/commit. Push still needs user approval.");
  } else {
    console.log(`action:   none; next file threshold ${maxFiles}, next task threshold ${fs.existsSync(checkpointFile) ? last + 10 : "after first checkpoint"}`);
  }
}

process.exit(due ? 1 : 0);
