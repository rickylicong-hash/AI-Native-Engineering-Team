#!/usr/bin/env node
/**
 * Verify the AI Native Engineering Team package.
 *
 * Usage:
 *   node scripts/verify.mjs                 # verify the package in the current directory
 *   node scripts/verify.mjs --root <dir>    # verify an installed config dir
 *   node scripts/verify.mjs --installed     # treat --root as an OpenCode config dir
 *   node scripts/verify.mjs --opencode      # also ask the OpenCode CLI for the agent list
 *
 * Exit code 0 = all checks passed; 1 = errors found.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

const root = path.resolve(getArg("--root", process.cwd()).replace(/^~(?=$|[\\/])/, os.homedir()));
const installed = hasFlag("--installed");
const checkOpencode = hasFlag("--opencode");

const paths = installed
  ? {
      agents: path.join(root, "agents", "ai-team"),
      commands: path.join(root, "commands"),
      skills: path.join(root, "skills"),
      manifest: path.join(process.cwd(), "team-manifest.json"),
    }
  : {
      agents: path.join(root, ".opencode", "agents", "ai-team"),
      commands: path.join(root, ".opencode", "commands"),
      skills: path.join(root, ".opencode", "skills"),
      manifest: path.join(root, "team-manifest.json"),
    };

const errors = [];
const warnings = [];
const checks = [];
const addCheck = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  if (!ok) errors.push(`${name}${detail ? `: ${detail}` : ""}`);
};

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function parseScalar(raw) {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}

/** Minimal YAML frontmatter parser for the controlled subset used by this team. */
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: text };
  const data = {};
  let currentKey = null;
  let currentList = null;
  let currentItem = null;

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = line.match(/^\s*/)[0].length;
    const content = trimmed;

    if (indent === 0) {
      const idx = content.indexOf(":");
      if (idx === -1) continue;
      const key = content.slice(0, idx).trim();
      const value = content.slice(idx + 1).trim();
      if (value === "") {
        data[key] = [];
        currentKey = key;
        currentList = data[key];
        currentItem = null;
      } else {
        data[key] = parseScalar(value);
        currentKey = key;
        currentList = null;
        currentItem = null;
      }
      continue;
    }

    if (content.startsWith("- ")) {
      if (!currentList) continue;
      currentItem = {};
      currentList.push(currentItem);
      const rest = content.slice(2).trim();
      const idx = rest.indexOf(":");
      if (idx !== -1) {
        currentItem[rest.slice(0, idx).trim()] = parseScalar(rest.slice(idx + 1));
      }
      continue;
    }

    if (currentItem && content.includes(":")) {
      const idx = content.indexOf(":");
      currentItem[content.slice(0, idx).trim()] = parseScalar(content.slice(idx + 1));
    }
  }

  return { data, body: text.slice(match[0].length) };
}

function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".md"))
    .map((d) => path.join(dir, d.name))
    .sort();
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => path.join(dir, d.name))
    .sort();
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------
let manifest = null;
addCheck("manifest exists", fs.existsSync(paths.manifest), paths.manifest);
if (fs.existsSync(paths.manifest)) {
  try {
    manifest = JSON.parse(readText(paths.manifest));
    addCheck("manifest parses", true);
    addCheck("manifest version", typeof manifest.version === "string", String(manifest.version));
  } catch (err) {
    addCheck("manifest parses", false, err.message);
  }
}

const manifestAgents = new Set((manifest?.agents ?? []).map((a) => a.id));
const manifestCommands = new Set((manifest?.commands ?? []).map((c) => c.id));
const manifestSkills = new Set((manifest?.skills ?? []).map((s) => s.id));

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
const agentFiles = listMarkdown(paths.agents);
addCheck("agent count", agentFiles.length === 10, `expected 10, found ${agentFiles.length}`);

const agentIds = new Set();
for (const file of agentFiles) {
  const name = path.basename(file, ".md");
  const id = `ai-team/${name}`;
  if (agentIds.has(id)) errors.push(`duplicate agent id: ${id}`);
  agentIds.add(id);

  const text = readText(file);
  const { data, body } = parseFrontmatter(text);
  const label = `agent ${id}`;

  addCheck(`${label} description`, typeof data.description === "string" && data.description.length >= 10);
  addCheck(`${label} mode`, ["primary", "subagent", "all"].includes(data.mode), String(data.mode));
  addCheck(`${label} prompt`, typeof body === "string" && body.trim().length > 200);
  addCheck(`${label} permissions`, Array.isArray(data.permissions) && data.permissions.length > 0);

  if (Array.isArray(data.permissions)) {
    let invalid = 0;
    for (const rule of data.permissions) {
      if (!rule || typeof rule !== "object") { invalid++; continue; }
      if (!rule.action || !rule.resource || !rule.effect) invalid++;
      if (rule.effect && !["allow", "ask", "deny"].includes(rule.effect)) invalid++;
    }
    addCheck(`${label} permission shape`, invalid === 0, `${invalid} invalid rule(s)`);
  }

  if (manifestAgents.size > 0) {
    addCheck(`${label} in manifest`, manifestAgents.has(id));
  }

  // Stack-specific leakage should be a warning, not a hard failure.
  const banned = ["Spring Boot", "agentscope", "Riccon", "Vue 3"];
  const found = banned.filter((term) => text.includes(term));
  if (found.length) warnings.push(`${label} contains stack-specific term(s): ${found.join(", ")}`);
}

// Chief specifics
const chiefFile = path.join(paths.agents, "chief.md");
if (fs.existsSync(chiefFile)) {
  const { data } = parseFrontmatter(readText(chiefFile));
  addCheck("chief mode is primary", data.mode === "primary", String(data.mode));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
const commandFiles = listMarkdown(paths.commands).filter((f) => path.basename(f).startsWith("ai"));
const externalCommandAgents = new Set(["build"]);
addCheck("command count", commandFiles.length === 13, `expected 13, found ${commandFiles.length}`);

const commandIds = new Set();
for (const file of commandFiles) {
  const id = path.basename(file, ".md");
  commandIds.add(id);
  const { data, body } = parseFrontmatter(readText(file));
  const label = `command /${id}`;
  addCheck(`${label} description`, typeof data.description === "string" && data.description.length >= 5);
  addCheck(`${label} agent exists`, typeof data.agent === "string" && (agentIds.has(data.agent) || externalCommandAgents.has(data.agent)), String(data.agent));
  addCheck(`${label} body`, body.trim().length > 40);
  addCheck(`${label} passes arguments or is a read-only command`, body.includes("$ARGUMENTS") || id === "ai-status" || id === "ai-resume" || id === "ai-handoff");
  if (manifestCommands.size > 0) addCheck(`${label} in manifest`, manifestCommands.has(id));
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
const skillDirs = listDirs(paths.skills).filter((d) => path.basename(d).startsWith("ai-team-"));
addCheck("skill count", skillDirs.length === 4, `expected 4, found ${skillDirs.length}`);

for (const dir of skillDirs) {
  const id = path.basename(dir);
  const skillFile = path.join(dir, "SKILL.md");
  addCheck(`skill ${id} has SKILL.md`, fs.existsSync(skillFile));
  if (!fs.existsSync(skillFile)) continue;
  const text = readText(skillFile);
  const { data } = parseFrontmatter(text);
  addCheck(`skill ${id} name`, typeof data.name === "string" && data.name.length > 2);
  addCheck(`skill ${id} description`, typeof data.description === "string" && data.description.length >= 20);
  if (manifestSkills.size > 0) addCheck(`skill ${id} in manifest`, manifestSkills.has(id));

  // Check every references/..., templates/... and profiles/... backtick path mentioned in SKILL.md.
  const refs = [...text.matchAll(/`((?:references|templates|profiles)\/[^`]+)`/g)].map((m) => m[1]);
  for (const ref of new Set(refs)) {
    addCheck(`skill ${id} reference ${ref}`, fs.existsSync(path.join(dir, ref)));
  }
}

// Workflow templates listed in the skill must exist.
const workflowDir = path.join(paths.skills, "ai-team-workflow");
if (fs.existsSync(workflowDir)) {
  const expected = [
    "PROJECT.md", "STATUS.md", "TASKS.md", "HANDOFF.md", "PRD.md",
    "ARCHITECTURE.md", "ADR.md", "REVIEW.md", "TEST-REPORT.md", "SECURITY-REPORT.md", "RELEASE-PLAN.md", "GROWTH.md", "AI-TEAM-GITIGNORE",
  ];
  for (const t of expected) {
    addCheck(`workflow template ${t}`, fs.existsSync(path.join(workflowDir, "templates", t)));
  }
  const profiles = ["README.md", "java-spring.md", "vue.md", "strict-security.md"];
  for (const profile of profiles) {
    addCheck(`workflow profile ${profile}`, fs.existsSync(path.join(workflowDir, "profiles", profile)));
  }
  const growthTemplate = readText(path.join(workflowDir, "templates", "GROWTH.md"));
  addCheck(
    "workflow GROWTH template has scope and net-zero",
    growthTemplate.includes("scope") && (growthTemplate.includes("net-zero") || growthTemplate.includes("净零")) && growthTemplate.includes("TEAM-CORE"),
    "GROWTH template is missing the 1.9.0 scope/net-zero fields",
  );
}

// ---------------------------------------------------------------------------
// Script syntax and team audits
// ---------------------------------------------------------------------------
const scriptFiles = [];
const sourceScripts = path.join(root, "scripts");
if (fs.existsSync(sourceScripts)) {
  for (const name of fs.readdirSync(sourceScripts).filter((f) => f.endsWith(".mjs"))) {
    scriptFiles.push(path.join(sourceScripts, name));
  }
}
for (const dir of skillDirs) {
  const scriptsDir = path.join(dir, "scripts");
  if (!fs.existsSync(scriptsDir)) continue;
  for (const name of fs.readdirSync(scriptsDir).filter((f) => f.endsWith(".mjs"))) {
    scriptFiles.push(path.join(scriptsDir, name));
  }
}
for (const file of scriptFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  addCheck(`script syntax ${path.relative(root, file)}`, result.status === 0, (result.stderr ?? "").trim());
}

if (!installed) {
  for (const audit of ["audit-git-permissions.mjs", "audit-team-consistency.mjs"]) {
    const file = path.join(root, "scripts", audit);
    if (!fs.existsSync(file)) continue;
    const result = spawnSync(process.execPath, [file], { cwd: root, encoding: "utf8", timeout: 120000 });
    const detail = result.status === 0 ? "" : `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().split(/\r?\n/).filter(Boolean).slice(-3).join(" | ");
    addCheck(`audit ${audit}`, result.status === 0, detail);
  }
}

// 1.9.1：净零真值与证据扫描上限的行为回归（fixtures 在 scripts/test-gates.mjs）。
// 安装副本不含 scripts/，只在源码树强制；缺失即 FAIL，不能静默降计数。
if (!installed) {
  const gateTest = path.join(root, "scripts", "test-gates.mjs");
  if (!fs.existsSync(gateTest)) {
    addCheck("gate regression fixtures", false, "scripts/test-gates.mjs missing");
  } else {
    const result = spawnSync(process.execPath, [gateTest, "--skills", paths.skills], { cwd: root, encoding: "utf8", timeout: 120000 });
    const detail = result.status === 0 ? "" : `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().split(/\r?\n/).filter(Boolean).slice(-3).join(" | ");
    addCheck("gate regression fixtures", result.status === 0, detail);
  }
}

// ---------------------------------------------------------------------------
// Portability checks
// ---------------------------------------------------------------------------
const scanRoots = [paths.agents, paths.commands, ...skillDirs];
const absPathPattern = /(^|[\s"'(])[A-Za-z]:[\\/]|\/Users\/|\/home\/[A-Za-z0-9._-]+\//;
for (const scanRoot of scanRoots) {
  if (!fs.existsSync(scanRoot)) continue;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && /\.(md|json|ya?ml)$/.test(entry.name)) {
        const text = readText(full);
        if (absPathPattern.test(text)) {
          warnings.push(`absolute path found in ${path.relative(root, full)}`);
        }
      }
    }
  };
  walk(scanRoot);
}

// ---------------------------------------------------------------------------
// Optional: ask OpenCode for the agent list
// ---------------------------------------------------------------------------
if (checkOpencode) {
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "opencode agent list"], { encoding: "utf8", timeout: 120000 })
    : spawnSync("opencode", ["agent", "list"], { encoding: "utf8", timeout: 120000 });
  if (result.error) {
    warnings.push(`opencode agent list failed: ${result.error.message}`);
  } else {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    for (const id of ["ai-team/chief", "ai-team/product-manager", "ai-team/ux-designer", "ai-team/system-architect",
      "ai-team/engineer", "ai-team/code-reviewer", "ai-team/qa-engineer", "ai-team/security-auditor",
      "ai-team/devops-engineer", "ai-team/technical-writer"]) {
      addCheck(`opencode lists ${id}`, output.includes(id));
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n, " ");
console.log("AI Native Engineering Team — verification");
console.log(`root: ${root}`);
console.log(`mode: ${installed ? "installed" : "package"}`);
console.log("");
console.log(`${pad("CHECK", 62)} RESULT`);
console.log("-".repeat(72));
for (const c of checks) {
  console.log(`${pad(c.name, 62)} ${c.ok ? "PASS" : "FAIL"}${c.detail && !c.ok ? ` (${c.detail})` : ""}`);
}
console.log("-".repeat(72));
console.log(`checks: ${checks.length}, passed: ${checks.filter((c) => c.ok).length}, failed: ${errors.length}, warnings: ${warnings.length}`);
if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.log("\nErrors:");
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
console.log("\nOK: package is structurally valid.");
