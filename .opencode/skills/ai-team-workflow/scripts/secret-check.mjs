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
 * 退出码：0 = 无明文；1 = 有明文；2 = 参数/读取错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const ROOTS = [".ai-team/qa", ".ai-team/work", ".ai-team/release", ".ai-team/security", "logs"];
const TEXT_EXT = /\.(md|txt|log|json|headers|ya?ml|xml|csv|http)$/i;
const SKIP_DIRS = new Set([".git", "node_modules", "target", "dist", "build", ".idea", ".vscode", ".mvn"]);
const MAX_FILES_DEFAULT = 500;

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

function preview(value) {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 4)}...${value.slice(-2)}`;
}

/**
 * 检测一行文本中的明文凭据。返回 [{kind, line, value, column}]。
 * value 只用于内部脱敏和预览，不会原样打印。
 */
export function scanText(text, file = "") {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const add = (kind, line, value) => {
    if (isPlaceholder(value) || value.length < 8) return;
    if (value.includes("`") || value.includes("|")) return;
    findings.push({ kind, line: line + 1, value });
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

  // 同一行同一值只报一次，避免 Set-Cookie / __Host- 双重命中。
  return findings.filter((finding, index) => {
    return !findings.slice(0, index).some((other) => other.line === finding.line && other.value === finding.value);
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
 * 扫描项目证据中的明文凭据。
 * @param {string} project
 * @param {{maxFiles?: number}} [options]
 */
export function scanSecrets(project, options = {}) {
  const root = path.resolve(project);
  const maxFiles = Number.parseInt(options.maxFiles ?? MAX_FILES_DEFAULT, 10) || MAX_FILES_DEFAULT;
  const findings = [];
  let scanned = 0;
  let truncated = false;

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
      if (!TEXT_EXT.test(file)) continue;
      if (/secret-scan|gitleaks|trufflehog/i.test(path.basename(file))) continue;
      scanned += 1;
      let text;
      try {
        const buffer = fs.readFileSync(file);
        if (buffer.subarray(0, 4096).includes(0)) continue;
        text = buffer.toString("utf8").replace(/^\uFEFF/, "");
      } catch {
        continue;
      }
      findings.push(...scanText(text, path.relative(root, file)));
    }
    if (truncated) break;
  }

  return { findings, scanned, truncated };
}

/**
 * 原地脱敏项目证据中的明文凭据。
 * @param {string} project
 * @param {{maxFiles?: number}} [options]
 */
export function fixSecrets(project, options = {}) {
  const root = path.resolve(project);
  const maxFiles = Number.parseInt(options.maxFiles ?? MAX_FILES_DEFAULT, 10) || MAX_FILES_DEFAULT;
  const fixed = [];
  let scanned = 0;

  for (const relativeRoot of ROOTS) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) continue;
    for (const file of walkFiles(absoluteRoot, maxFiles - scanned + 1)) {
      if (scanned >= maxFiles) break;
      if (!TEXT_EXT.test(file)) continue;
      if (/secret-scan|gitleaks|trufflehog/i.test(path.basename(file))) continue;
      scanned += 1;
      let buffer;
      try {
        buffer = fs.readFileSync(file);
      } catch {
        continue;
      }
      if (buffer.subarray(0, 4096).includes(0)) continue;
      const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
      const result = redactText(text);
      if (result.changes > 0) {
        fs.writeFileSync(file, result.text, "utf8");
        fixed.push({ path: normalize(path.relative(root, file)), changes: result.changes });
      }
    }
  }

  return { fixed, scanned };
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
  const maxFiles = Number.parseInt(getArg("--max-files", String(MAX_FILES_DEFAULT)), 10) || MAX_FILES_DEFAULT;

  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    console.error(`ERROR  project not found: ${project}`);
    process.exit(2);
  }

  let fixed = [];
  if (fix) {
    try {
      const result = fixSecrets(project, { maxFiles });
      fixed = result.fixed;
    } catch (error) {
      if (json) console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
      else console.log(`ERROR  ${error.message}`);
      process.exit(2);
    }
  }

  const result = scanSecrets(project, { maxFiles });
  const ok = result.findings.length === 0;
  if (json) {
    console.log(JSON.stringify({ ok, fixed, ...result }, null, 2));
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
      console.log(`  FIND  [${finding.kind}] ${finding.file}:${finding.line} value=${preview(finding.value)}`);
    }
    if (result.findings.length > 10) console.log(`  ... and ${result.findings.length - 10} more finding(s)`);
    console.log(`scanned:  ${result.scanned} file(s)${result.truncated ? " (truncated)" : ""}`);
    console.log(`result:   ${ok ? "PASS" : "FAIL"}`);
    if (!ok) console.log("action:   run secret-check --fix, or redact the value manually before commit");
  }
  process.exit(ok ? 0 : 1);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && path.basename(invoked).toLowerCase() === "secret-check.mjs") {
  runCli();
}
