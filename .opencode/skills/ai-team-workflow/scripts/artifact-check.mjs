#!/usr/bin/env node
/**
 * 检查 AI Team 项目的证据与临时产物卫生。
 *
 * 规则（P-15 / P-17）：
 *   - 仓库根目录不得出现 *.log、target-*、*.tmp/*.bak/*.swp、*.class、
 *     hs_err_pid*、replay_pid*、*.pid；这些产物应放到 logs/ 或
 *     .ai-team/work/<TASK>-logs/；
 *   - 根目录下只有 .class 的 io/org/com 包目录视为误落盘；
 *   - logs/** 下的 .log/.txt 必须是 UTF-8；UTF-16 是 error，审查工具会拒绝读取；
 *   - .ai-team/work/** 下的历史 UTF-16 是 warning，可用 --fix-all 批量迁移；
 *   - qa/work/release/security/logs 中的明文 Cookie/Authorization/口令/token 是 error；
 *   - logs/** 文件名建议包含 TASK- 前缀，便于追溯。
 *
 * 用法：
 *   node artifact-check.mjs [--project <dir>] [--json] [--strict] [--quiet]
 *   node artifact-check.mjs --fix        # 只把 logs/** 的 UTF-16 转为 UTF-8
 *   node artifact-check.mjs --fix-all    # 同时迁移 .ai-team/work/** 的历史证据
 *
 * 退出码：
 *   0 = 无 error（warning 不阻断；--strict 下 warning 也阻断）
 *   1 = 有 error，或 --strict 下有 warning
 *   2 = 项目目录不存在
 *   3 = 读取/转换失败
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { scanSecrets } from "./secret-check.mjs";

const DEFAULT_MAX_EVIDENCE_FILES = 500;
const SKIP_DIRS = new Set([".git", "node_modules", "target", "dist", "build", ".idea", ".vscode", ".mvn"]);

function normalize(file) {
  return file.replace(/\\/g, "/");
}

function addIssue(list, code, file, message, suggestion) {
  list.push({ code, path: normalize(file), message, suggestion });
}

function readHead(file, length) {
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(file, "r");
  try {
    const read = fs.readSync(fd, buffer, 0, length, 0);
    return buffer.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

function isUtf16Bom(head) {
  return (head[0] === 0xFF && head[1] === 0xFE) || (head[0] === 0xFE && head[1] === 0xFF);
}

function walkFiles(dir, limit) {
  const files = [];
  const stack = [dir];
  while (stack.length > 0 && files.length < limit) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (files.length >= limit) break;
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  return files;
}

function checkRootArtifacts(project, errors, warnings) {
  let entries;
  try {
    entries = fs.readdirSync(project, { withFileTypes: true });
  } catch (error) {
    throw new Error(`cannot read project root: ${error.message}`);
  }

  for (const entry of entries) {
    const name = entry.name;
    if (entry.isFile()) {
      if (/\.log$/i.test(name)) {
        addIssue(errors, "root-log", name, "仓库根目录存在日志文件", "移到 logs/<date>/ 或 .ai-team/work/<TASK>-logs/");
      } else if (/^target-/i.test(name)) {
        addIssue(errors, "root-temp", name, "仓库根目录存在临时产物", "移到 logs/ 或删除；禁止在根目录生成 target-* 文件");
      } else if (/\.(tmp|bak|swp)$/i.test(name)) {
        addIssue(errors, "root-temp", name, "仓库根目录存在临时文件", "删除或移入本地临时目录");
      } else if (/\.class$/i.test(name)) {
        addIssue(errors, "stray-class", name, "仓库根目录存在编译产物", "删除；构建输出应留在 target/ 或 dist/");
      } else if (/^(hs_err_pid|replay_pid)/i.test(name) || /\.pid$/i.test(name)) {
        addIssue(errors, "runtime-dump", name, "仓库根目录存在运行时转储/pid 文件", "删除并检查 JVM/进程配置");
      }
    } else if (entry.isDirectory()) {
      if (/^target-/i.test(name)) {
        addIssue(errors, "root-temp-dir", name, "仓库根目录存在临时目录", "移到 logs/ 或删除");
      }
      if (/^(io|org|com)$/i.test(name)) {
        const files = walkFiles(path.join(project, name), 20);
        if (files.length > 0 && files.every((file) => /\.class$/i.test(file))) {
          addIssue(errors, "stray-class-dir", name, "根目录包目录只有 .class 文件，疑似误落盘", "删除该目录；源码应放在 src/ 下");
        }
      }
    }
  }
}

function checkEvidence(project, errors, warnings, maxFiles) {
  const roots = [".ai-team/work", "logs"];
  let scanned = 0;
  let truncated = false;

  for (const relativeRoot of roots) {
    const absoluteRoot = path.join(project, relativeRoot);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) continue;

    const remaining = Math.max(0, maxFiles - scanned);
    const files = walkFiles(absoluteRoot, remaining + 1);
    if (files.length > remaining) {
      truncated = true;
      files.length = remaining;
    }

    for (const file of files) {
      if (!/\.(log|txt)$/i.test(file)) continue;
      scanned++;
      const relative = normalize(path.relative(project, file));
      let head;
      try {
        head = readHead(file, 2);
      } catch {
        errors.push({ code: "evidence-read", path: relative, message: "无法读取证据文件", suggestion: "检查文件权限或删除损坏文件" });
        continue;
      }
      if (isUtf16Bom(head)) {
        const issue = {
          code: "evidence-encoding",
          path: relative,
          message: "证据文件使用 UTF-16 编码，审查工具会拒绝读取",
          suggestion: relativeRoot === "logs"
            ? "运行 artifact-check --fix，或重新用 Out-File -Encoding utf8 生成日志"
            : "用 artifact-check --fix-all 迁移历史证据；或提供 UTF-8 文本摘要",
        };
        if (relativeRoot === "logs") errors.push(issue);
        else warnings.push(issue);
      }
      if (relativeRoot === "logs" && !/TASK-[A-Za-z0-9-]+/i.test(path.basename(file))) {
        warnings.push({
          code: "log-name",
          path: relative,
          message: "日志文件名缺少 TASK- 前缀",
          suggestion: "使用 TASK-<id>-<step>-<timestamp>.log；失败日志加 .failed.log",
        });
      }
      if (relativeRoot === ".ai-team/work" && /\.log$/i.test(file) && !/[\\/][^\\/]*-logs[\\/]/.test(relative)) {
        warnings.push({
          code: "raw-log-location",
          path: relative,
          message: "原始日志直接放在 .ai-team/work/ 下",
          suggestion: "移到 .ai-team/work/<TASK>-logs/，只保留 TASK-*-EVIDENCE.md",
        });
      }
    }

    if (truncated) break;
  }

  if (truncated) {
    warnings.push({
      code: "scan-truncated",
      path: ".",
      message: `证据文件超过扫描上限 ${maxFiles}，结果不完整`,
      suggestion: "清理旧日志，或用 --max-files 提高上限",
    });
  }

  return { scanned, truncated };
}

function decodeUtf16(buffer) {
  if (buffer.length < 2) return null;
  const littleEndian = buffer[0] === 0xFF && buffer[1] === 0xFE;
  const bigEndian = buffer[0] === 0xFE && buffer[1] === 0xFF;
  if (!littleEndian && !bigEndian) return null;
  let body = buffer.subarray(2);
  if (bigEndian) {
    const swapped = Buffer.alloc(body.length - (body.length % 2));
    for (let i = 0; i + 1 < body.length; i += 2) {
      swapped[i] = body[i + 1];
      swapped[i + 1] = body[i];
    }
    body = swapped;
  }
  return body.toString("utf16le");
}

/**
 * 把 UTF-16 证据转换为 UTF-8；默认只处理 logs/，includeWork 时处理 .ai-team/work/。
 * @param {string} project
 * @param {{includeWork?: boolean, maxFiles?: number}} [options]
 */
export function fixEvidence(project, options = {}) {
  const root = path.resolve(project);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`project directory does not exist: ${root}`);
  }
  const maxFiles = Number.parseInt(options.maxFiles ?? DEFAULT_MAX_EVIDENCE_FILES, 10) || DEFAULT_MAX_EVIDENCE_FILES;
  const roots = ["logs", ...(options.includeWork ? [".ai-team/work"] : [])];
  const fixed = [];
  let scanned = 0;

  for (const relativeRoot of roots) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) continue;
    const files = walkFiles(absoluteRoot, maxFiles);
    for (const file of files) {
      if (scanned >= maxFiles) break;
      if (!/\.(log|txt)$/i.test(file)) continue;
      scanned++;
      let buffer;
      try {
        buffer = fs.readFileSync(file);
      } catch {
        continue;
      }
      const text = decodeUtf16(buffer);
      if (text === null) continue;
      fs.writeFileSync(file, text, "utf8");
      fixed.push(normalize(path.relative(root, file)));
    }
  }

  return { fixed, scanned };
}

/**
 * 运行检查并返回结构化结果。
 * @param {string} project 项目根目录
 * @param {{maxEvidenceFiles?: number}} [options]
 */
export function checkArtifacts(project, options = {}) {
  const root = path.resolve(project);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`project directory does not exist: ${root}`);
  }
  const maxFiles = Number.parseInt(options.maxEvidenceFiles ?? DEFAULT_MAX_EVIDENCE_FILES, 10) || DEFAULT_MAX_EVIDENCE_FILES;
  const errors = [];
  const warnings = [];
  checkRootArtifacts(root, errors, warnings);
  const evidence = checkEvidence(root, errors, warnings, maxFiles);
  // P-27：证据中的明文 Cookie / Authorization / 口令 / token 直接阻断。
  const secrets = scanSecrets(root, { maxFiles });
  for (const finding of secrets.findings) {
    errors.push({
      code: "credential-plaintext",
      path: finding.file,
      message: `疑似明文凭据 (${finding.kind}) 行 ${finding.line}`,
      suggestion: "运行 secret-check --fix，或手工替换为 <redacted len=.. sha256=..>；不要提交明文",
    });
  }
  return {
    errors,
    warnings,
    scanned: evidence.scanned,
    truncated: evidence.truncated,
    secrets: {
      findings: secrets.findings.length,
      scanned: secrets.scanned,
      truncated: secrets.truncated,
    },
  };
}

function runCli() {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = null) => {
    const index = args.indexOf(name);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
  };
  const hasFlag = (name) => args.includes(name);
  const project = path.resolve(getArg("--project", process.cwd()).replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
  const json = hasFlag("--json");
  const strict = hasFlag("--strict");
  const quiet = hasFlag("--quiet");
  const fixAll = hasFlag("--fix-all");
  const fix = fixAll || hasFlag("--fix");
  const maxFiles = Number.parseInt(getArg("--max-files", String(DEFAULT_MAX_EVIDENCE_FILES)), 10) || DEFAULT_MAX_EVIDENCE_FILES;

  let fixResult = { fixed: [], scanned: 0 };
  if (fix) {
    try {
      fixResult = fixEvidence(project, { includeWork: fixAll, maxFiles });
    } catch (error) {
      if (json) console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
      else console.log(`ERROR  ${error.message}`);
      process.exit(3);
    }
  }

  let result;
  try {
    result = checkArtifacts(project, { maxEvidenceFiles: maxFiles });
  } catch (error) {
    if (json) console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
    else console.log(`ERROR  ${error.message}`);
    process.exit(2);
  }

  const failed = result.errors.length > 0 || (strict && result.warnings.length > 0);
  if (json) {
    console.log(JSON.stringify({ ok: !failed, strict, fixed: fixResult.fixed, ...result }, null, 2));
  } else if (!quiet) {
    console.log("AI Team artifact check");
    console.log(`project:  ${project}`);
    if (fixResult.fixed.length > 0) {
      console.log(`fixed:    ${fixResult.fixed.length} UTF-16 file(s) -> UTF-8`);
      for (const file of fixResult.fixed.slice(0, 10)) console.log(`  FIXED ${file}`);
      if (fixResult.fixed.length > 10) console.log(`  ... and ${fixResult.fixed.length - 10} more file(s)`);
    }
    console.log(`errors:   ${result.errors.length}`);
    for (const issue of result.errors.slice(0, 10)) {
      console.log(`  ERROR [${issue.code}] ${issue.path}: ${issue.message}; ${issue.suggestion}`);
    }
    if (result.errors.length > 10) console.log(`  ... and ${result.errors.length - 10} more error(s)`);
    console.log(`warnings: ${result.warnings.length}`);
    for (const issue of result.warnings.slice(0, 5)) {
      console.log(`  WARN  [${issue.code}] ${issue.path}: ${issue.message}; ${issue.suggestion}`);
    }
    if (result.warnings.length > 5) console.log(`  ... and ${result.warnings.length - 5} more warning(s)`);
    console.log(`evidence: ${result.scanned} file(s) scanned${result.truncated ? " (truncated)" : ""}`);
    console.log(`result:   ${failed ? "FAIL" : "PASS"}${strict ? " (strict)" : ""}`);
  }
  process.exit(failed ? 1 : 0);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
const self = fileURLToPath(import.meta.url);
if (invoked && path.normalize(invoked).toLowerCase() === path.normalize(self).toLowerCase()) {
  runCli();
}
