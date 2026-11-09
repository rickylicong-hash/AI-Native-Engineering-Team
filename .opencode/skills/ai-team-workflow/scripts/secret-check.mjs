#!/usr/bin/env node
/**
 * 证据凭据扫描与脱敏（1.6.0，P-27）。
 *
 * 扫描 `.ai-team/qa/**`、`.ai-team/work/**`、`.ai-team/release/**`、
 * `.ai-team/security/**` 与 `logs/**`，发现明文 Cookie、Authorization、
 * 口令/token 时默认失败；`--fix` 原地替换为
 * `<redacted len=NN sha256=前12位>`，保留长度与可交叉核对的哈希。
 *
 * 用法：
 *   node secret-check.mjs --project .
 *   node secret-check.mjs --project . --fix
 *   node secret-check.mjs --project . --json
 *
 * 退出码：0 = 无明文；1 = 有明文；2 = 参数/读取错误；
 *         3 = 扫描被截断（PARTIAL，未扫完不能当作 PASS）。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const ROOTS = [".ai-team/qa", ".ai-team/work", ".ai-team/release", ".ai-team/security", "logs"];
const TEXT_EXT = /\.(md|txt|log|json|jsonl|har|html?|headers|ya?ml|xml|csv|http|js|ts|jsx|tsx|py|java|go|rs|sh|ps1|sql)$/i;
const SKIP_DIRS = new Set([".git", "node_modules", "target", "dist", "build", ".idea", ".vscode", ".mvn"]);
// P-44：500 上限会让 500+ 证据文件的项目把“未扫完”当成 PASS；默认提高到 2000。
// 1.9.1：2000 会随项目成熟再次溢出；截断时自动升限（2x）到此硬上限，到上限仍截断才 PARTIAL。
const MAX_FILES_DEFAULT = 2000;
export const MAX_SCAN_CEILING = 20000;
const MAX_FILE_BYTES_DEFAULT = 5 * 1024 * 1024;
const MAX_DURATION_MS_DEFAULT = 60000;

function normalize(file) {
  return file.replace(/\\/g, "/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function redacted(value) {
  return `<redacted len=${value.length} sha256=${sha256(value).slice(0, 12)}>`;
}

function isPlaceholder(value) {
  return !value
    || value.startsWith("<redacted")
    || value.startsWith("${")
    || value.startsWith("{{")
    || value.startsWith("%")
    || value.includes("...")
    || /^(null|none|undefined|deleted|example|placeholder|your[-_]|xxx+|changeme|dummy|redacted|\*+)$/i.test(value)
    || /wrong|example|placeholder|changeme|dummy|sample/i.test(value)
    || /^(password|passwd|123456|test|test123)$/i.test(value)
    || /example|placeholder|your[-_]|changeme/i.test(value);
}

/**
 * 检测一行文本中的明文凭据。返回 [{kind, line, len, sha256, file}]。
 * P1-01：findings 不包含原始值，避免 --json / 证据日志二次泄露；
 * 原始值只在扫描函数内部用于判定与哈希，不进入返回值。
 */
export function scanText(text, file = "") {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const add = (kind, line, value) => {
    if (isPlaceholder(value) || value.length < 8) return;
    if (value.includes("`") || value.includes("|")) return;
    findings.push({ kind, line: line + 1, len: value.length, sha256: sha256(value).slice(0, 12) });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line.length > 20000) continue;
    // 扫描器日志/规则说明本身包含 "password="、"pattern" 等词，不是真实凭据。
    if (/secret[-_ ]?scan|gitleaks|trufflehog|"match"|pattern|rule[ _-]?id|模式|扫描|hits|finding/i.test(line)) continue;

    for (const match of line.matchAll(/(Set-Cookie:\s*[A-Za-z0-9_.-]+=)([^;\s]+)/gi)) {
      add("set-cookie", i, match[2]);
    }
    for (const match of line.matchAll(/((?:Proxy-)?Authorization:\s*(?:Bearer|Basic)\s+)([A-Za-z0-9._~+/=-]{8,})/gi)) {
      add("authorization", i, match[2]);
    }
    for (const match of line.matchAll(/(X-CSRF-Token:\s*)([A-Za-z0-9._~+/=-]{8,})/gi)) {
      add("csrf-header", i, match[2]);
    }
    for (const match of line.matchAll(/(?<!Set-)Cookie:\s*[^=\r\n;]+=([^;\r\n]*)/gi)) {
      add("cookie-header", i, match[1]);
    }
    for (const match of line.matchAll(/("(?:password|passwd|pwd|secret|client_secret|access_token|refresh_token|id_token|api_key|apikey|token)"\s*:\s*")([^"]{6,})(")/gi)) {
      add("json-secret", i, match[2]);
    }
    for (const match of line.matchAll(/(__Host-[A-Za-z0-9_-]+=)([A-Za-z0-9._~+/=-]{12,})/g)) {
      add("host-cookie", i, match[2]);
    }
  }

  // 同一行同一值只报一次，避免 Set-Cookie / __Host- 双重命中；用哈希比较，不保留明文。
  return findings.filter((finding, index) => {
    return !findings.slice(0, index).some((other) => other.line === finding.line && other.sha256 === finding.sha256);
  }).map((finding) => ({ ...finding, file: normalize(file) }));
}

/**
 * 把文本中的明文值替换为 <redacted len=.. sha256=..>。
 * 返回 {text, changes}。
 */
export function redactText(text) {
  let changes = 0;
  const replace = (value) => {
    if (isPlaceholder(value)) return value;
    changes += 1;
    return redacted(value);
  };

  let next = text.replace(/(Set-Cookie:\s*[A-Za-z0-9_.-]+=)([^;\s]+)/gi, (m, prefix, value) => `${prefix}${replace(value)}`);
  next = next.replace(/((?:Proxy-)?Authorization:\s*(?:Bearer|Basic)\s+)([A-Za-z0-9._~+/=-]{8,})/gi, (m, prefix, value) => `${prefix}${replace(value)}`);
  next = next.replace(/(X-CSRF-Token:\s*)([A-Za-z0-9._~+/=-]{8,})/gi, (m, prefix, value) => `${prefix}${replace(value)}`);
  next = next.replace(/(?<!Set-)(Cookie:\s*[^=\r\n;]+=)([^;\r\n]*)/gi, (m, prefix, value) => `${prefix}${replace(value)}`);
  next = next.replace(/("(?:password|passwd|pwd|secret|client_secret|access_token|refresh_token|id_token|api_key|apikey|token)"\s*:\s*")([^"]{6,})(")/gi, (m, prefix, value, suffix) => `${prefix}${replace(value)}${suffix}`);
  next = next.replace(/(__Host-[A-Za-z0-9_-]+=)([A-Za-z0-9._~+/=-]{12,})/g, (m, prefix, value) => `${prefix}${replace(value)}`);

  return { text: next, changes };
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

/**
 * 解码证据文本：UTF-8（含 BOM）、UTF-16 LE/BE（含 BOM）；无 BOM 的二进制返回 null。
 * 1.9.1：PowerShell 5.1 常产出 UTF-16 日志；不能因 NUL 直接跳过而漏掉凭据。
 * @param {Buffer} buffer
 * @returns {string|null}
 */
function decodeTextBuffer(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return buffer.subarray(2).toString("utf16le");
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    const body = buffer.subarray(2);
    const swapped = Buffer.alloc(body.length - (body.length % 2));
    for (let i = 0; i + 1 < body.length; i += 2) {
      swapped[i] = body[i + 1];
      swapped[i + 1] = body[i];
    }
    return swapped.toString("utf16le");
  }
  if (buffer.subarray(0, 4096).includes(0)) return null;
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function isValidUtf8(buffer) {
  if (buffer.length >= 2 && ((buffer[0] === 0xFF && buffer[1] === 0xFE) || (buffer[0] === 0xFE && buffer[1] === 0xFF))) {
    return true;
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * 扫描项目证据中的明文凭据（单次上限）。
 * @param {string} root
 * @param {number} maxFiles
 * @param {{maxFileBytes?: number, maxDurationMs?: number}} [options]
 */
function scanSecretsOnce(root, maxFiles, options = {}) {
  const findings = [];
  let scanned = 0;
  let skipped = 0;
  let oversized = 0;
  let timedOut = false;
  let truncated = false;
  const maxFileBytes = options.maxFileBytes ?? MAX_FILE_BYTES_DEFAULT;
  const deadline = Date.now() + (options.maxDurationMs ?? MAX_DURATION_MS_DEFAULT);

  for (const relativeRoot of ROOTS) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) continue;
    const files = walkFiles(absoluteRoot, maxFiles - scanned + 1);
    if (files.length > maxFiles - scanned) {
      truncated = true;
      files.length = maxFiles - scanned;
    }
    for (const file of files) {
      if (scanned >= maxFiles) break;
      if (Date.now() > deadline) {
        timedOut = true;
        break;
      }
      if (!TEXT_EXT.test(file)) continue;
      if (/secret-scan|gitleaks|trufflehog/i.test(path.basename(file))) continue;
      scanned += 1;
      let text;
      try {
        if (fs.statSync(file).size > maxFileBytes) {
          oversized += 1;
          continue;
        }
        const buffer = fs.readFileSync(file);
        text = decodeTextBuffer(buffer);
        if (text === null) {
          skipped += 1;
          continue;
        }
      } catch {
        skipped += 1;
        continue;
      }
      findings.push(...scanText(text, path.relative(root, file)));
    }
    if (truncated || timedOut) break;
  }

  return { findings, scanned, skipped, oversized, timedOut, truncated };
}

/**
 * 扫描项目证据中的明文凭据。
 * 1.9.1：默认 2000 只是起点；截断时按 2x 自动升限到 20000。
 * 显式 maxFiles 作为起点/下限，不用一次截断就误报 PARTIAL。
 * @param {string} project
 * @param {{maxFiles?: number, maxFilesCeiling?: number}} [options]
 */
export function scanSecrets(project, options = {}) {
  const root = path.resolve(project);
  const requestedLimit = Number.parseInt(options.maxFiles ?? MAX_FILES_DEFAULT, 10) || MAX_FILES_DEFAULT;
  const initialLimit = Math.min(requestedLimit, MAX_SCAN_CEILING);
  const ceiling = Math.min(
    MAX_SCAN_CEILING,
    Math.max(initialLimit, Number.parseInt(options.maxFilesCeiling ?? MAX_SCAN_CEILING, 10) || MAX_SCAN_CEILING),
  );
  let limit = initialLimit;
  let result;
  const deadline = Date.now() + (options.maxDurationMs ?? MAX_DURATION_MS_DEFAULT);
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      result = { findings: [], scanned: 0, skipped: 0, oversized: 0, timedOut: true, truncated: false };
      break;
    }
    result = scanSecretsOnce(root, limit, {
      ...options,
      maxDurationMs: remaining,
    });
    if (!result.truncated || result.timedOut || limit >= ceiling) break;
    limit = Math.min(ceiling, limit * 2);
  }
  return { ...result, limit, initialLimit, ceiling, maxFileBytes: options.maxFileBytes ?? MAX_FILE_BYTES_DEFAULT };
}

/**
 * 原地脱敏项目证据中的明文凭据（单次上限）。
 * @param {string} root
 * @param {number} maxFiles
 */
function fixSecretsOnce(root, maxFiles, options = {}) {
  const fixed = [];
  let scanned = 0;
  let skipped = 0;
  let oversized = 0;
  let timedOut = false;
  let truncated = false;
  const unsupported = [];
  const maxFileBytes = options.maxFileBytes ?? MAX_FILE_BYTES_DEFAULT;
  const deadline = Date.now() + (options.maxDurationMs ?? MAX_DURATION_MS_DEFAULT);

  for (const relativeRoot of ROOTS) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) continue;
    const files = walkFiles(absoluteRoot, maxFiles - scanned + 1);
    if (files.length > maxFiles - scanned) {
      truncated = true;
      files.length = maxFiles - scanned;
    }
    for (const file of files) {
      if (scanned >= maxFiles) break;
      if (Date.now() > deadline) {
        timedOut = true;
        break;
      }
      if (!TEXT_EXT.test(file)) continue;
      if (/secret-scan|gitleaks|trufflehog/i.test(path.basename(file))) continue;
      scanned += 1;
      let buffer;
      try {
        if (fs.statSync(file).size > maxFileBytes) {
          oversized += 1;
          continue;
        }
        buffer = fs.readFileSync(file);
      } catch {
        skipped += 1;
        continue;
      }
      if (!isValidUtf8(buffer)) {
        unsupported.push(normalize(path.relative(root, file)));
        continue;
      }
      const text = decodeTextBuffer(buffer);
      if (text === null) {
        skipped += 1;
        continue;
      }
      const result = redactText(text);
      if (result.changes > 0) {
        fs.writeFileSync(file, result.text, "utf8");
        fixed.push({ path: normalize(path.relative(root, file)), changes: result.changes });
      }
    }
    if (truncated || timedOut) break;
  }

  return { fixed, scanned, skipped, oversized, timedOut, truncated, unsupported };
}

/**
 * 原地脱敏项目证据中的明文凭据。
 * 1.9.1：与 scanSecrets 相同，截断时自动升限；--fix 不会只处理前 2000 个文件。
 * @param {string} project
 * @param {{maxFiles?: number, maxFilesCeiling?: number}} [options]
 */
export function fixSecrets(project, options = {}) {
  const root = path.resolve(project);
  const requestedLimit = Number.parseInt(options.maxFiles ?? MAX_FILES_DEFAULT, 10) || MAX_FILES_DEFAULT;
  const initialLimit = Math.min(requestedLimit, MAX_SCAN_CEILING);
  const ceiling = Math.min(
    MAX_SCAN_CEILING,
    Math.max(initialLimit, Number.parseInt(options.maxFilesCeiling ?? MAX_SCAN_CEILING, 10) || MAX_SCAN_CEILING),
  );
  let limit = initialLimit;
  const allFixed = new Map();
  let scanned = 0;
  let skipped = 0;
  let truncated = false;
  let oversized = 0;
  let timedOut = false;
  const unsupported = new Set();
  const deadline = Date.now() + (options.maxDurationMs ?? MAX_DURATION_MS_DEFAULT);
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      timedOut = true;
      break;
    }
    const result = fixSecretsOnce(root, limit, {
      ...options,
      maxDurationMs: remaining,
    });
    for (const item of result.fixed) allFixed.set(item.path, item);
    for (const item of result.unsupported || []) unsupported.add(item);
    scanned = result.scanned;
    skipped = result.skipped;
    oversized = result.oversized || 0;
    timedOut = Boolean(result.timedOut);
    truncated = result.truncated;
    if (!truncated || timedOut || limit >= ceiling) break;
    limit = Math.min(ceiling, limit * 2);
  }
  return {
    fixed: [...allFixed.values()],
    scanned,
    skipped,
    oversized,
    timedOut,
    truncated,
    unsupported: [...unsupported],
    limit,
    initialLimit,
    ceiling,
    maxFileBytes: options.maxFileBytes ?? MAX_FILE_BYTES_DEFAULT,
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
  const fix = hasFlag("--fix");
  const quiet = hasFlag("--quiet");
  const maxFilesArg = args.includes("--max-files") ? getArg("--max-files", null) : null;
  const maxFileBytesArg = args.includes("--max-file-bytes") ? getArg("--max-file-bytes", null) : null;
  const maxDurationArg = args.includes("--max-duration-ms") ? getArg("--max-duration-ms", null) : null;
  let maxFiles = MAX_FILES_DEFAULT;
  let maxFileBytes = MAX_FILE_BYTES_DEFAULT;
  let maxDurationMs = MAX_DURATION_MS_DEFAULT;

  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    console.error(`ERROR  project not found: ${project}`);
    process.exit(2);
  }

  // P3-01：0/负数/非整数会让 walkFiles 收到非法 limit，必须在扫描和 --fix 前拦截。
  if (args.includes("--max-files")) {
    if (maxFilesArg === null || !/^[1-9]\d*$/.test(maxFilesArg) || !Number.isSafeInteger(Number(maxFilesArg))) {
      console.error(`ERROR  --max-files must be a positive integer, got: ${maxFilesArg === null ? "(missing value)" : maxFilesArg}`);
      process.exit(2);
    }
    maxFiles = Number(maxFilesArg);
  }
  if (args.includes("--max-file-bytes")) {
    if (maxFileBytesArg === null || !/^[1-9]\d*$/.test(maxFileBytesArg) || !Number.isSafeInteger(Number(maxFileBytesArg))) {
      console.error(`ERROR  --max-file-bytes must be a positive integer, got: ${maxFileBytesArg === null ? "(missing value)" : maxFileBytesArg}`);
      process.exit(2);
    }
    maxFileBytes = Number(maxFileBytesArg);
  }
  if (args.includes("--max-duration-ms")) {
    if (maxDurationArg === null || !/^[1-9]\d*$/.test(maxDurationArg) || !Number.isSafeInteger(Number(maxDurationArg))) {
      console.error(`ERROR  --max-duration-ms must be a positive integer, got: ${maxDurationArg === null ? "(missing value)" : maxDurationArg}`);
      process.exit(2);
    }
    maxDurationMs = Number(maxDurationArg);
  }

  let fixed = [];
  let fixUnsupported = [];
  if (fix) {
    try {
      const result = fixSecrets(project, { maxFiles, maxFileBytes, maxDurationMs });
      fixed = result.fixed;
      fixUnsupported = result.unsupported || [];
    } catch (error) {
      if (json) console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
      else console.log(`ERROR  ${error.message}`);
      process.exit(2);
    }
  }

  const result = scanSecrets(project, { maxFiles, maxFileBytes, maxDurationMs });
  // 截断意味着还有文件没扫；skipped/oversized/unsupported/timeout 同样不能算 PASS。
  const incomplete = result.truncated || result.skipped > 0 || (result.oversized || 0) > 0 || Boolean(result.timedOut) || fixUnsupported.length > 0;
  const ok = result.findings.length === 0 && !incomplete;
  const status = result.findings.length > 0 ? "FAIL" : incomplete ? "PARTIAL" : "PASS";
  if (json) {
    console.log(JSON.stringify({ ok, result: status, fixed, fixUnsupported, ...result }, null, 2));
  } else if (!quiet) {
    console.log("AI Team secret check");
    console.log(`project:  ${project}`);
    if (fixed.length > 0) {
      console.log(`fixed:    ${fixed.length} file(s)`);
      for (const file of fixed.slice(0, 10)) console.log(`  FIXED ${file.path} (${file.changes})`);
      if (fixed.length > 10) console.log(`  ... and ${fixed.length - 10} more file(s)`);
    }
    console.log(`findings: ${result.findings.length}`);
    for (const finding of result.findings.slice(0, 10)) {
      console.log(`  FIND  [${finding.kind}] ${finding.file}:${finding.line} len=${finding.len} sha256=${finding.sha256}`);
    }
    if (result.findings.length > 10) console.log(`  ... and ${result.findings.length - 10} more finding(s)`);
    console.log(`scanned:  ${result.scanned} file(s) (limit ${result.limit}${result.truncated ? ` / ceiling ${result.ceiling}` : ""})`);
    console.log(`skipped:  ${result.skipped} binary/unreadable file(s)`);
    if ((result.oversized || 0) > 0) console.log(`oversized: ${result.oversized} file(s) > ${result.maxFileBytes || maxFileBytes} bytes`);
    if (fixUnsupported.length > 0) console.log(`encoding-unsupported: ${fixUnsupported.length} file(s) (not rewritten)`);
    if (result.timedOut) console.log(`timed-out: scan exceeded ${maxDurationMs} ms`);
    console.log(`result:   ${status === "PARTIAL" ? `PARTIAL (${result.truncated ? "truncated at ceiling" : result.timedOut ? "timed out" : (result.oversized || 0) > 0 ? "oversized file skipped" : fixUnsupported.length > 0 ? "encoding-unsupported" : "binary/unreadable skipped"})` : status}`);
    if (status === "FAIL") {
      console.log(fixUnsupported.length > 0
        ? "action:   non-UTF-8 evidence cannot be auto-fixed; convert it to UTF-8 and rerun, or redact manually"
        : "action:   run secret-check --fix, or redact the value manually before commit");
    }
    else if (status === "PARTIAL" && result.truncated) console.log(`action:   archive old evidence; the hard ceiling is ${result.ceiling} and --max-files cannot exceed it; a truncated scan is not a pass`);
    else if (status === "PARTIAL") console.log("action:   decode or remove binary/unreadable evidence; a skipped scan is not a pass");
  }
  process.exit(result.findings.length > 0 ? 1 : incomplete ? 3 : 0);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && path.basename(invoked).toLowerCase() === "secret-check.mjs") {
  runCli();
}
