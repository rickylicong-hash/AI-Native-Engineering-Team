#!/usr/bin/env node
/**
 * 跨项目团队优化证据扫描（1.7.0）。
 *
 * 汇总指定项目的 GROWTH、状态文件与 OpenCode 会话数据，输出可审计的
 * 证据快照。脚本只读，不修改项目或团队源码；分析结论由 /ai-improve 生成。
 *
 * 用法：
 *   node improve-scan.mjs --project D:/Development/riccon-ai
 *   node improve-scan.mjs --project . --json
 *   node improve-scan.mjs --project . --out .ai-team/team/IMPROVEMENT-SCAN.md
 *   node improve-scan.mjs --project . --all-agents   # 连非 ai-team/ 会话一起统计
 *
 * 退出码：0 = 扫描完成；2 = 参数/项目错误；3 = 读取失败。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

let DatabaseSync = null;
try {
  ({ DatabaseSync } = await import("node:sqlite"));
} catch {
  // Node < 22.5 没有 node:sqlite；脚本仍可读 GROWTH/状态，但会话数据会标记为不可用。
}

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);
const projectArg = getArg("--project", ".");
const json = hasFlag("--json");
const out = getArg("--out");
const allAgents = hasFlag("--all-agents");
const since = Number.parseInt(getArg("--since", "0"), 10) || 0;
const TEAM_ROLES = new Set([
  "chief",
  "product-manager",
  "ux-designer",
  "system-architect",
  "engineer",
  "code-reviewer",
  "qa-engineer",
  "security-auditor",
  "devops-engineer",
  "technical-writer",
]);

function isTeamAgent(agent) {
  const value = String(agent || "").trim();
  return value.startsWith("ai-team/") || TEAM_ROLES.has(value);
}

const project = path.resolve(projectArg.replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || process.env.HOME || ""));
const aiTeamDir = path.join(project, ".ai-team");

if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  console.error(`ERROR  project not found: ${project}`);
  process.exit(2);
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function normalize(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const hit = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!hit) continue;
    data[hit[1]] = hit[2].replace(/^["']|["']$/g, "").trim();
  }
  return data;
}

function readGrowth() {
  const file = path.join(aiTeamDir, "team", "GROWTH.md");
  if (!fs.existsSync(file)) {
    return { path: file, exists: false, frontmatter: {}, proposals: [], counts: {}, open: 0, done: 0, retros: [] };
  }
  const text = readText(file);
  const lines = text.split(/\r?\n/);
  const proposals = [];
  let header = null;
  let inIndex = false;
  let parsed = false;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      if (inIndex && parsed) break;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const isHeader = cells[0] === "ID" && cells.some((cell) => cell === "状态" || cell.toLowerCase() === "status");
    if (isHeader) {
      if (inIndex) break;
      header = cells;
      inIndex = true;
      continue;
    }
    if (!inIndex || !header) continue;
    if (!/^P-\d+/i.test(cells[0] || "")) {
      if (parsed) break;
      continue;
    }
    const statusIndex = header.findIndex((cell) => cell === "状态" || cell.toLowerCase() === "status");
    const dateIndex = header.findIndex((cell) => cell === "更新日期" || cell.toLowerCase() === "updated");
    proposals.push({
      id: cells[0],
      retro: cells[1] || "",
      title: cells[2] || "",
      status: (cells[statusIndex >= 0 ? statusIndex : 3] || "").toLowerCase(),
      landing: cells[4] || "",
      evidence: cells[5] || "",
      updated: dateIndex >= 0 ? cells[dateIndex] : (cells[6] || ""),
    });
    parsed = true;
  }
  const counts = {};
  for (const proposal of proposals) counts[proposal.status || "unknown"] = (counts[proposal.status || "unknown"] || 0) + 1;
  const retros = [...text.matchAll(/^##\s+(RETRO-\d+)[^\r\n]*/gm)].map((match) => match[1]);
  return {
    path: file,
    exists: true,
    frontmatter: parseFrontmatter(text),
    proposals,
    counts,
    open: proposals.filter((item) => ["proposed", "accepted", "in_progress", "deferred", "partial"].includes(item.status)).length,
    done: proposals.filter((item) => ["done", "rejected", "superseded"].includes(item.status)).length,
    retros,
  };
}

function readTasks() {
  const file = path.join(aiTeamDir, "state", "TASKS.md");
  if (!fs.existsSync(file)) return { path: file, exists: false, done: 0, total: 0 };
  const lines = readText(file).split(/\r?\n/);
  let header = null;
  let statusIndex = -1;
  let done = 0;
  let total = 0;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells[0] === "ID" && cells.some((cell) => cell === "状态" || cell.toLowerCase() === "status")) {
      header = cells;
      statusIndex = header.findIndex((cell) => cell === "状态" || cell.toLowerCase() === "status");
      continue;
    }
    if (!header || !/^TASK-/i.test(cells[0] || "")) continue;
    total += 1;
    const status = (cells[statusIndex] || "").toLowerCase();
    if (/^done\b/.test(status)) done += 1;
  }
  return { path: file, exists: true, done, total };
}

function readAudit() {
  const file = path.join(aiTeamDir, "team", "AUDIT.json");
  if (!fs.existsSync(file)) return { path: file, exists: false };
  try {
    return { path: file, exists: true, data: JSON.parse(readText(file)) };
  } catch (error) {
    return { path: file, exists: true, error: error.message };
  }
}

function findDatabases() {
  const candidates = new Set();
  const fromCli = spawnSync("opencode", ["db", "path"], { encoding: "utf8" });
  if (fromCli.status === 0) {
    const value = (fromCli.stdout || "").trim();
    if (value) candidates.add(path.resolve(value));
  }
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    candidates.add(path.join(home, ".local", "share", "opencode", "opencode.db"));
    candidates.add(path.join(home, ".local", "share", "opencode", "opencode-dev.db"));
  }
  return [...candidates].filter((file) => fs.existsSync(file));
}

function tableNames(db) {
  return new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name));
}

function tableColumns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
}

/**
 * 从 session_message.data.content 读取工具调用明细（P-43）。
 *
 * 兼容两种历史格式：content 是 parts 数组（每个元素可能 type="tool"），
 * 或 content 本身就是单个 tool 对象。只返回 type="tool" 的项；调用方仅在
 * session_part 没有工具数据时使用本结果，保证不重复计数。
 */
function readMessageToolParts(db, table, sessionIds) {
  const items = [];
  for (let offset = 0; offset < sessionIds.length; offset += 500) {
    const chunk = sessionIds.slice(offset, offset + 500);
    const placeholders = chunk.map(() => "?").join(",");
    try {
      const rows = db.prepare(`
        SELECT m.session_id AS session_id, j.value AS item
        FROM ${table} m, json_each(m.data, '$.content') j
        WHERE m.session_id IN (${placeholders})
          AND (CASE WHEN j.type = 'object' THEN json_extract(j.value, '$.type') END) = 'tool'
      `).all(...chunk);
      for (const row of rows) items.push({ session_id: row.session_id, data: row.item });
    } catch {
      // SQLite 没有 JSON1 时退化为全量解析；只影响老环境，不改变统计口径。
      let rows = [];
      try {
        rows = db.prepare(`SELECT session_id, data FROM ${table} WHERE session_id IN (${placeholders})`).all(...chunk);
      } catch {
        continue;
      }
      for (const row of rows) {
        let data;
        try {
          data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
        } catch {
          continue;
        }
        const content = data && data.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item && item.type === "tool") items.push({ session_id: row.session_id, data: item });
          }
        } else if (content && typeof content === "object" && content.type === "tool") {
          items.push({ session_id: row.session_id, data: content });
        }
      }
    }
    try {
      const rows = db.prepare(`
        SELECT session_id, json_extract(data, '$.content') AS item
        FROM ${table}
        WHERE session_id IN (${placeholders}) AND json_extract(data, '$.content.type') = 'tool'
      `).all(...chunk);
      for (const row of rows) items.push({ session_id: row.session_id, data: row.item });
    } catch {
      // 对象型 content 仅在 JSON1 可用时解析；数组型已由上一段处理。
    }
  }
  return items;
}

function scanDatabase(dbPath) {
  if (!DatabaseSync) {
    return { path: dbPath, error: "node:sqlite unavailable; session scan requires Node 22.5+", sessions: [] };
  }
  let db;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
  } catch {
    try {
      db = new DatabaseSync(dbPath);
    } catch (error) {
      return { path: dbPath, error: error.message, sessions: [] };
    }
  }
  try {
    const tables = tableNames(db);
    const sessionTable = tables.has("session") ? "session" : tables.has("session_v2") ? "session_v2" : null;
    if (!sessionTable) return { path: dbPath, error: "no session table", sessions: [] };
    const partTable = tables.has("part") ? "part" : tables.has("session_part") ? "session_part" : null;
    const messageTable = tables.has("session_message") ? "session_message" : tables.has("message") ? "message" : null;
    const hasProject = tables.has("project");
    const projectColumns = hasProject ? tableColumns(db, "project") : new Set();
    const projects = hasProject
      ? db.prepare(`SELECT ${projectColumns.has("id") ? "id" : "rowid AS id"}${projectColumns.has("worktree") ? ", worktree" : ""} FROM project`).all()
      : [];
    const projectIds = new Set(
      projects
        .filter((row) => normalize(row.worktree) === normalize(project))
        .map((row) => row.id),
    );

    const sessions = db.prepare(`SELECT * FROM ${sessionTable}`).all().filter((row) => {
      if (since && Number(row.time_updated || 0) < since) return false;
      if (!allAgents && !isTeamAgent(row.agent)) return false;
      if (row.project_id && projectIds.has(row.project_id)) return true;
      return normalize(row.directory) === normalize(project);
    });
    if (sessions.length === 0) return { path: dbPath, scanned: 0, toolSource: "none", toolItems: 0, sessions: [] };

    const messageCounts = new Map();
    let messageMax = 0;
    if (messageTable) {
      for (const row of db.prepare(`SELECT session_id, count(*) AS n FROM ${messageTable} GROUP BY session_id`).all()) {
        messageCounts.set(row.session_id, Number(row.n) || 0);
      }
      for (let offset = 0; offset < sessions.length; offset += 500) {
        const chunk = sessions.slice(offset, offset + 500);
        const placeholders = chunk.map(() => "?").join(",");
        const maxRow = db.prepare(`SELECT max(time_created) AS t FROM ${messageTable} WHERE session_id IN (${placeholders})`).get(...chunk.map((row) => row.id));
        messageMax = Math.max(messageMax, Number(maxRow && maxRow.t) || 0);
      }
    }

    const matched = new Set(sessions.map((row) => row.id));
    const toolParts = [];
    let toolSource = null;
    if (partTable) {
      if (partTable === "session_part") {
        const columns = tableColumns(db, partTable);
        const sql = columns.has("type")
          ? `SELECT session_id, data FROM ${partTable} WHERE type='tool'`
          : `SELECT session_id, data FROM ${partTable}`;
        toolParts.push(...db.prepare(sql).all());
      } else {
        try {
          toolParts.push(...db.prepare(`SELECT session_id, data FROM ${partTable} WHERE json_extract(data,'$.type')='tool'`).all());
        } catch {
          toolParts.push(...db.prepare(`SELECT session_id, data FROM ${partTable}`).all());
        }
      }
      // session_part 可能只有其他类型或属于别的项目；只保留本项目会话的工具行。
      const matchedParts = toolParts.filter((row) => matched.has(row.session_id));
      toolParts.length = 0;
      toolParts.push(...matchedParts);
      if (toolParts.length > 0) toolSource = partTable;
    }
    if (toolParts.length === 0 && messageTable) {
      // P-43：session_part 为空时，工具明细实际存放在 session_message.data.content。
      toolParts.push(...readMessageToolParts(db, messageTable, [...matched]));
      if (toolParts.length > 0) toolSource = "session_message.data.content";
    }

    const perSession = new Map();
    const seenCalls = new Map();
    for (const row of sessions) {
      perSession.set(row.id, {
        id: row.id,
        title: row.title || "",
        agent: row.agent || "",
        model: row.model || "",
        parent: row.parent_id || null,
        directory: row.directory || "",
        cost: Number(row.cost) || 0,
        tokensInput: Number(row.tokens_input) || 0,
        tokensOutput: Number(row.tokens_output) || 0,
        tokensReasoning: Number(row.tokens_reasoning) || 0,
        tokensCacheRead: Number(row.tokens_cache_read) || 0,
        tokensCacheWrite: Number(row.tokens_cache_write) || 0,
        created: Number(row.time_created) || 0,
        updated: Number(row.time_updated) || 0,
        messages: messageCounts.get(row.id) || 0,
        toolCalls: 0,
        toolErrors: 0,
        permissionDenied: 0,
        tools: {},
      });
    }
    for (const row of toolParts) {
      if (!matched.has(row.session_id)) continue;
      const item = perSession.get(row.session_id);
      if (!item) continue;
      let data;
      try {
        data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
      } catch {
        continue;
      }
      if (!data || typeof data !== "object") continue;
      // 同一 call id 只计一次，防止历史数据同时出现在两处或重复写入。
      const callId = data.id ? String(data.id) : "";
      if (callId) {
        const seen = seenCalls.get(row.session_id) || new Set();
        if (seen.has(callId)) continue;
        seen.add(callId);
        seenCalls.set(row.session_id, seen);
      }
      item.toolCalls += 1;
      // session_part 用 tool 字段，session_message.data.content 用 name 字段。
      const tool = data.tool || data.name || "unknown";
      item.tools[tool] = (item.tools[tool] || 0) + 1;
      const state = data.state && typeof data.state === "object" ? data.state : {};
      const status = state.status ? String(state.status) : "";
      const output = state.output ? String(state.output) : "";
      const errorType = state.error && state.error.type ? String(state.error.type) : "";
      const errorMessage = state.error && state.error.message ? String(state.error.message) : "";
      if (status === "error") item.toolErrors += 1;
      if (
        errorType === "permission.rejected"
        || /permission denied|permission\.rejected|denied by permission/i.test(output)
        || /permission denied|permission\.rejected|denied by permission/i.test(errorMessage)
      ) item.permissionDenied += 1;
    }
    // P3-03：toolItems 与工具调用口径一致，必须是去重后的计数，而不是原始数组长度。
    const countedToolItems = [...perSession.values()].reduce((sum, item) => sum + item.toolCalls, 0);
    return {
      path: dbPath,
      schema: sessionTable,
      scanned: sessions.length,
      messageMax,
      toolSource: toolSource || "none",
      toolItems: countedToolItems,
      sessions: [...perSession.values()],
    };
  } catch (error) {
    return { path: dbPath, error: error.message, sessions: [] };
  } finally {
    db.close();
  }
}

const databases = findDatabases();
const scanned = databases.map((file) => scanDatabase(file));
const byId = new Map();
for (const result of scanned) {
  for (const session of result.sessions) {
    const existing = byId.get(session.id);
    if (!existing || session.updated > existing.updated) byId.set(session.id, session);
  }
}
const sessions = [...byId.values()];
const root = sessions.filter((session) => !session.parent);
const subagents = sessions.filter((session) => session.parent);
const messages = sessions.reduce((sum, session) => sum + session.messages, 0);
const toolCalls = sessions.reduce((sum, session) => sum + session.toolCalls, 0);
const toolErrors = sessions.reduce((sum, session) => sum + session.toolErrors, 0);
const permissionDenied = sessions.reduce((sum, session) => sum + session.permissionDenied, 0);
const tokens = sessions.reduce((sum, session) => ({
  input: sum.input + session.tokensInput,
  output: sum.output + session.tokensOutput,
  reasoning: sum.reasoning + session.tokensReasoning,
  cacheRead: sum.cacheRead + session.tokensCacheRead,
  cacheWrite: sum.cacheWrite + session.tokensCacheWrite,
  cost: sum.cost + session.cost,
}), { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, cost: 0 });

function aggregate(field) {
  const result = {};
  for (const session of sessions) {
    const key = session[field] || "unknown";
    if (!result[key]) result[key] = { sessions: 0, messages: 0, tokens: 0, tools: 0 };
    result[key].sessions += 1;
    result[key].messages += session.messages;
    result[key].tokens += session.tokensInput + session.tokensOutput;
    result[key].tools += session.toolCalls;
  }
  return result;
}

const tools = {};
for (const session of sessions) {
  for (const [name, count] of Object.entries(session.tools)) tools[name] = (tools[name] || 0) + count;
}
const topTools = Object.entries(tools).sort((a, b) => b[1] - a[1]).slice(0, 10);

const growth = readGrowth();
const tasks = readTasks();
const audit = readAudit();
const now = Date.now();
const lastCreated = sessions.reduce((max, session) => Math.max(max, session.created), 0);
const lastUpdated = sessions.reduce((max, session) => Math.max(max, session.updated), 0);
const lastMessage = scanned.reduce((max, item) => Math.max(max, item.messageMax || 0), 0);
const toolSources = [...new Set(scanned.filter((item) => (item.scanned || 0) > 0).map((item) => item.toolSource || "none"))];
const toolDataSource = toolSources.join("+") || "none";
const daysSinceAudit = audit.exists && audit.data && audit.data.last_full_audit_at
  ? Math.floor((now - Date.parse(audit.data.last_full_audit_at)) / 86400000)
  : null;

const signals = [];
if (!growth.exists) signals.push({ id: "missing-growth", level: "warn", detail: "项目没有 .ai-team/team/GROWTH.md；先补复盘或确认项目是否使用该团队。" });
if (growth.open > 0) signals.push({ id: "open-proposals", level: "info", detail: `${growth.open} 条提案未处置；逐条核对证据、落地版本和关闭条件。` });
if (growth.exists && Number(growth.frontmatter.open_proposals) !== growth.open) {
  signals.push({ id: "growth-index-mismatch", level: "warn", detail: `frontmatter open_proposals=${growth.frontmatter.open_proposals || "missing"}，索引实际 ${growth.open}。` });
}
if (!audit.exists) signals.push({ id: "missing-audit", level: "warn", detail: "没有 AUDIT.json；本次只能做全量或基于最近审计报告的分析。" });
if (audit.exists && audit.error) signals.push({ id: "audit-parse-error", level: "warn", detail: `AUDIT.json 无法解析：${audit.error}` });
if (daysSinceAudit !== null && daysSinceAudit > 30) {
  signals.push({ id: "stale-audit", level: "warn", detail: `上次全量审计在 ${daysSinceAudit} 天前；先做增量审计。` });
}
if (sessions.length === 0) signals.push({ id: "no-project-sessions", level: "warn", detail: "当前数据库没有匹配该项目的会话；检查项目路径、OpenCode DB 或改用最近审计报告。" });
if (messages > 0 && toolCalls === 0) signals.push({ id: "no-tool-data", level: "warn", detail: "会话有消息，但 session_part 与 session_message.data.content 都没有工具明细；工具错误/权限拒绝无法从本次数据判断。" });
if (permissionDenied > 0) signals.push({ id: "permission-denials", level: "warn", detail: `${permissionDenied} 次工具调用出现 permission denied；先区分破坏性命令与旧会话缓存。` });
if (toolCalls >= 20 && toolErrors / toolCalls > 0.05) {
  signals.push({ id: "tool-error-rate", level: "warn", detail: `工具错误率 ${((toolErrors / toolCalls) * 100).toFixed(1)}%（${toolErrors}/${toolCalls}）；检查命令、环境与工具契约。` });
}
if (sessions.length > 0 && root.length === 0) signals.push({ id: "no-root-session", level: "warn", detail: "只有子会话，没有主会话；可能路径匹配或数据迁移不完整。" });
if (sessions.length > 0 && subagents.length > 0 && subagents.length / sessions.length > 0.95) {
  signals.push({ id: "subagent-heavy", level: "info", detail: `子会话占比 ${((subagents.length / sessions.length) * 100).toFixed(0)}%；确认编排深度与角色分工是否合理。` });
}

const report = {
  generatedAt: new Date().toISOString(),
  project,
  aiTeam: {
    exists: fs.existsSync(aiTeamDir),
    growth,
    tasks,
    audit: audit.exists ? { path: audit.path, exists: true, data: audit.data || null, error: audit.error || null } : audit,
  },
  sessions: {
    filter: allAgents ? "all-agents" : "ai-team",
    databases: scanned.map((item) => ({
      path: item.path,
      schema: item.schema || null,
      scanned: item.scanned || 0,
      toolSource: item.toolSource || null,
      toolItems: item.toolItems || 0,
      error: item.error || null,
    })),
    total: sessions.length,
    root: root.length,
    subagents: subagents.length,
    messages,
    toolCalls,
    toolErrors,
    permissionDenied,
    toolDataSource,
    tokens,
    lastCreated: lastCreated || null,
    lastUpdated: lastUpdated || null,
    lastMessage: lastMessage || null,
    byAgent: aggregate("agent"),
    byModel: aggregate("model"),
    topTools,
  },
  signals,
};

function markdown(result) {
  const lines = [];
  const growth = result.aiTeam.growth;
  const tasks = result.aiTeam.tasks;
  lines.push(`# 团队优化证据扫描 — ${path.basename(result.project)}`);
  lines.push("");
  lines.push(`- 生成时间：${result.generatedAt}`);
  lines.push(`- 项目：\`${result.project}\``);
  lines.push(`- 会话过滤：${result.sessions.filter === "all-agents" ? "全部 agent" : "仅 ai-team/* 与已知团队角色"}`);
  lines.push(`- 数据源：${result.sessions.databases.map((item) => `\`${item.path}\`${item.error ? ` (${item.error})` : ""}`).join("；") || "无"}`);
  lines.push("");
  lines.push("## 1. GROWTH 与状态");
  lines.push("");
  lines.push("| 项 | 值 |");
  lines.push("|---|---|");
  lines.push(`| GROWTH | ${growth.exists ? `\`${growth.path}\`` : "缺失"} |`);
  lines.push(`| 提案总数 | ${growth.proposals.length} |`);
  lines.push(`| 未处置 | ${growth.open} |`);
  lines.push(`| 已处置 | ${growth.done} |`);
  lines.push(`| 最近复盘 | ${growth.frontmatter.last_retro || "unknown"} |`);
  lines.push(`| TASKS done | ${tasks.done} / ${tasks.total} |`);
  lines.push(`| AUDIT | ${result.aiTeam.audit.exists ? `\`${result.aiTeam.audit.path}\`` : "缺失"} |`);
  lines.push("");
  if (growth.proposals.length > 0) {
    lines.push("### 未处置提案");
    lines.push("");
    lines.push("| ID | 状态 | 提案 | 更新 |");
    lines.push("|---|---|---|---|");
    for (const item of growth.proposals.filter((proposal) => ["proposed", "accepted", "in_progress", "deferred", "partial"].includes(proposal.status))) {
      lines.push(`| ${item.id} | ${item.status} | ${item.title.replace(/\|/g, "\\|")} | ${item.updated} |`);
    }
    lines.push("");
  }
  lines.push("## 2. 会话使用");
  lines.push("");
  lines.push("| 指标 | 值 |");
  lines.push("|---|---:|");
  lines.push(`| 会话 | ${result.sessions.total} |`);
  lines.push(`| 主会话 | ${result.sessions.root} |`);
  lines.push(`| 子会话 | ${result.sessions.subagents} |`);
  lines.push(`| 消息 | ${result.sessions.messages} |`);
  lines.push(`| 工具调用 | ${result.sessions.toolCalls} |`);
  lines.push(`| 工具错误 | ${result.sessions.toolErrors} |`);
  lines.push(`| 权限拒绝 | ${result.sessions.permissionDenied} |`);
  lines.push(`| 工具数据源 | ${result.sessions.toolDataSource} |`);
  lines.push(`| tokens input/output | ${result.sessions.tokens.input} / ${result.sessions.tokens.output} |`);
  lines.push(`| cost | ${result.sessions.tokens.cost} |`);
  lines.push(`| 水位候选（created/updated/message） | ${result.sessions.lastCreated || 0} / ${result.sessions.lastUpdated || 0} / ${result.sessions.lastMessage || 0} |`);
  lines.push("");
  lines.push("### 角色分布");
  lines.push("");
  lines.push("| 角色 | 会话 | 消息 | 工具 | tokens |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const [role, value] of Object.entries(result.sessions.byAgent).sort((a, b) => b[1].messages - a[1].messages)) {
    lines.push(`| ${role} | ${value.sessions} | ${value.messages} | ${value.tools} | ${value.tokens} |`);
  }
  lines.push("");
  lines.push("### 工具 Top");
  lines.push("");
  lines.push(result.sessions.topTools.length === 0 ? "- 无工具数据" : result.sessions.topTools.map(([name, count]) => `- \`${name}\`：${count}`).join("\n"));
  lines.push("");
  lines.push("## 3. 信号");
  lines.push("");
  lines.push(result.signals.length === 0 ? "- 无自动信号；仍需做定性证据审查。" : result.signals.map((signal) => `- **${signal.level} / ${signal.id}**：${signal.detail}`).join("\n"));
  lines.push("");
  lines.push("## 4. 数据质量");
  lines.push("");
  for (const database of result.sessions.databases) {
    lines.push(`- \`${database.path}\`：schema=${database.schema || "unknown"}，匹配会话=${database.scanned}，工具数据源=${database.toolSource || "none"}（${database.toolItems || 0} 项）${database.error ? `，error=${database.error}` : ""}`);
  }
  lines.push("- 本报告只提供证据与信号；是否优化、优化范围、版本级别和用户批准由 `/ai-improve` 决策。");
  return `${lines.join("\n")}\n`;
}

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const text = markdown(report);
  if (out) {
    const file = path.resolve(out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text, "utf8");
    console.log(`created ${file}`);
  } else {
    process.stdout.write(text);
  }
}
