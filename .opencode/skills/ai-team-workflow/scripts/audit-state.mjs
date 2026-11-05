#!/usr/bin/env node
/**
 * 会话审计水位（1.3.1）。
 *
 * 每次全量审计结束后记录审计时间与已覆盖的会话/消息最大时间戳；
 * 下次审计只处理：
 *   - session_v2.time_created > last_audited_session_created_ms
 *   - session_v2.time_updated > last_audited_session_updated_ms
 *   - session_message.time_created > last_audited_message_ms
 *
 * 用法：
 *   node audit-state.mjs --project . --mark --report .ai-team/team/AUDIT-2026-11-06.md \
 *     --scope D:/Development/riccon-ai --session-count 152 \
 *     --last-session-created 1793... --last-session-updated 1793... --last-message-time 1793...
 *   node audit-state.mjs --project . --status
 *
 * 退出码：0 = 正常；1 = 未找到；2 = 参数/解析错误。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);
const project = path.resolve(getArg("--project", process.cwd()).replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const stateFile = path.join(project, ".ai-team", "team", "AUDIT.json");
const json = hasFlag("--json");

function nowIso() {
  return new Date().toISOString();
}

function parseTime(value, label) {
  if (value === null || value === undefined || value === "") return null;
  if (/^\d+$/.test(String(value))) return Number(value);
  const ms = Date.parse(String(value));
  if (Number.isNaN(ms)) throw new Error(`invalid ${label}: ${value}`);
  return ms;
}

function readState() {
  if (!fs.existsSync(stateFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

if (hasFlag("--mark")) {
  const report = getArg("--report", "");
  if (!report) {
    console.error("--mark requires --report");
    process.exit(2);
  }
  let sessionCreated;
  let sessionUpdated;
  let messageTime;
  try {
    sessionCreated = parseTime(getArg("--last-session-created"), "last-session-created");
    sessionUpdated = parseTime(getArg("--last-session-updated"), "last-session-updated");
    messageTime = parseTime(getArg("--last-message-time"), "last-message-time");
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  const state = {
    schema: 1,
    project: path.basename(project),
    scope: getArg("--scope", project),
    last_full_audit_at: nowIso(),
    last_audited_session_created_ms: sessionCreated,
    last_audited_session_updated_ms: sessionUpdated,
    last_audited_message_ms: messageTime,
    last_session_count: Number.parseInt(getArg("--session-count", "0"), 10) || 0,
    report: report.replace(/\\/g, "/"),
    next_audit_after: nowIso(),
  };
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  if (json) console.log(JSON.stringify(state, null, 2));
  else {
    console.log("AI Team audit watermark");
    console.log(`state:  ${stateFile}`);
    console.log(`audit:  ${state.last_full_audit_at}`);
    console.log(`report: ${state.report}`);
    console.log(`scope:  ${state.scope}`);
  }
  process.exit(0);
}

const state = readState();
if (!state) {
  if (json) console.log(JSON.stringify({ ok: false, error: `no audit state: ${stateFile}` }, null, 2));
  else console.log(`no audit state: ${stateFile}`);
  process.exit(1);
}

if (json) {
  console.log(JSON.stringify({ ok: true, stateFile, state }, null, 2));
} else {
  console.log("AI Team audit watermark");
  console.log(`state:  ${stateFile}`);
  console.log(`audit:  ${state.last_full_audit_at}`);
  console.log(`report: ${state.report}`);
  console.log(`scope:  ${state.scope}`);
  console.log(`session count: ${state.last_session_count}`);
  console.log(`next audit: time_created > ${state.last_audited_session_created_ms}; time_updated > ${state.last_audited_session_updated_ms}; message time > ${state.last_audited_message_ms}`);
}
process.exit(0);
