#!/usr/bin/env node
/**
 * AI Team 统一命令网关（1.4.0）。
 *
 * 目标：把 agent 的 shell 调用收敛为“角色 + 动作”，由网关用参数数组执行，
 * 不经过 shell；权限只维护 permissions.json 的 gateway 列表。
 *
 * 用法：
 *   node team-shell.mjs --role chief --action script.growth-check --project .
 *   node team-shell.mjs --role code-reviewer --action build.test --project . --module server --test FooTest
 *   node team-shell.mjs --role security-auditor --action scan.dependency --project .
 *   node team-shell.mjs --role chief --action git.status --project . --dry-run
 *
 * 退出码：0 成功；子进程非零则透传；2 参数/策略错误；127 命令不存在；124 超时。
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { loadMatrix, roleFromAgent, skillDir } from "./permission-lib.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(name);

const role = roleFromAgent(getArg("--role", ""));
const action = getArg("--action", "");
const project = path.resolve(getArg("--project", process.cwd()));
const json = hasFlag("--json");
const dryRun = hasFlag("--dry-run");
const strict = hasFlag("--strict");
const moduleName = getArg("--module", "");
const testName = getArg("--test", "");
const rev = getArg("--rev", "HEAD");

if (hasFlag("--help") || !role || !action) {
  console.log(`usage:
  node team-shell.mjs --role <role> --action <action> --project <dir> [--json] [--dry-run]
  actions: git.status|git.diff|git.log|git.show|git.rev-parse
           build.compile|build.test|build.clean-test|build.package|build.verify
           scan.dependency|scan.secrets|scan.sast
           script.state-check|script.retro-check|script.checkpoint-check|script.artifact-check
           script.growth-check|script.audit-state|script.permission-lint
  options: --module <name> --test <class> --rev <rev> --strict --status`);
  process.exit(role && action ? 0 : 2);
}

const matrix = loadMatrix();
const roleSpec = matrix.roles?.[role];
const allowed = roleSpec?.gateway || [];
if (!roleSpec) {
  fail(`unknown role: ${role}`);
}
if (!allowed.includes(action)) {
  fail(`action not allowed for ${role}: ${action}`);
}
if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
  fail(`project not found: ${project}`);
}

function fail(message) {
  if (json) console.log(JSON.stringify({ ok: false, role, action, error: message }, null, 2));
  else console.error(`DENIED: ${message}`);
  process.exit(2);
}

function assertSafe(value, label, pattern) {
  if (value && !pattern.test(value)) fail(`invalid ${label}: ${value}`);
}

assertSafe(moduleName, "module", /^[A-Za-z0-9_.-]+$/);
assertSafe(testName, "test", /^[A-Za-z0-9_.$#,:-]+$/);
assertSafe(rev, "rev", /^[A-Za-z0-9_.~^@/{}:+-]+$/);

const win = process.platform === "win32";
const scriptActions = {
  "script.state-check": "state-check.mjs",
  "script.retro-check": "retro-check.mjs",
  "script.checkpoint-check": "checkpoint-check.mjs",
  "script.artifact-check": "artifact-check.mjs",
  "script.growth-check": "growth-check.mjs",
  "script.audit-state": "audit-state.mjs",
  "script.permission-lint": "permission-lint.mjs",
};

function detectProject() {
  if (fs.existsSync(path.join(project, "pom.xml"))) return "maven";
  if (fs.existsSync(path.join(project, "gradlew")) || fs.existsSync(path.join(project, "gradlew.bat"))) return "gradle";
  if (fs.existsSync(path.join(project, "package.json"))) return "node";
  if (fs.existsSync(path.join(project, "pyproject.toml")) || fs.existsSync(path.join(project, "pytest.ini"))) return "python";
  return "unknown";
}

function commandForBuild() {
  const kind = detectProject();
  if (kind === "maven") {
    const base = win ? "mvn.cmd" : "mvn";
    const mvnArgs = ["-B"];
    if (moduleName) mvnArgs.push("-pl", moduleName, "-am");
    switch (action) {
      case "build.compile": return { command: base, args: [...mvnArgs, "-DskipTests", "compile"] };
      case "build.test": {
        const a = [...mvnArgs, "test"];
        if (testName) a.push(`-Dtest=${testName}`);
        return { command: base, args: a };
      }
      case "build.clean-test": return { command: base, args: [...mvnArgs, "clean", "test"] };
      case "build.package": return { command: base, args: [...mvnArgs, "-DskipTests", "package"] };
      case "build.verify": return { command: base, args: [...mvnArgs, "verify"] };
      default: return null;
    }
  }
  if (kind === "gradle") {
    const base = win ? "gradlew.bat" : "./gradlew";
    const goal = {
      "build.compile": "compileJava",
      "build.test": "test",
      "build.clean-test": "clean test",
      "build.package": "assemble",
      "build.verify": "check",
    }[action];
    return goal ? { command: base, args: goal.split(" ") } : null;
  }
  if (kind === "node") {
    const base = win ? "npm.cmd" : "npm";
    if (action === "build.compile" || action === "build.package") return { command: base, args: ["run", "build"] };
    if (action === "build.test" || action === "build.clean-test" || action === "build.verify") return { command: base, args: ["test"] };
    return null;
  }
  if (kind === "python") {
    if (action === "build.test" || action === "build.clean-test" || action === "build.verify") {
      return { command: "pytest", args: ["-q"] };
    }
    return null;
  }
  return null;
}

function commandForScan() {
  const kind = detectProject();
  if (action === "scan.dependency") {
    if (kind === "maven") return { command: win ? "mvn.cmd" : "mvn", args: ["-B", "org.owasp:dependency-check-maven:check"] };
    if (kind === "node") return { command: win ? "npm.cmd" : "npm", args: ["audit", "--json"] };
    if (kind === "python") return { command: "pip-audit", args: [] };
    return null;
  }
  if (action === "scan.secrets") return { command: "gitleaks", args: ["detect", "--no-git", "--source", project] };
  if (action === "scan.sast") return { command: "semgrep", args: ["--config", "auto", "--json", project] };
  return null;
}

let spec;
if (scriptActions[action]) {
  const script = path.join(skillDir, "scripts", scriptActions[action]);
  const scriptArgs = [script, "--project", project];
  if (action === "script.permission-lint") scriptArgs.push("--role", role);
  if (action === "script.audit-state") scriptArgs.push("--status");
  if (strict && ["script.state-check", "script.artifact-check", "script.growth-check"].includes(action)) scriptArgs.push("--strict");
  spec = { command: process.execPath, args: scriptArgs };
} else if (action.startsWith("git.")) {
  const gitArgs = ["-C", project];
  if (action === "git.status") gitArgs.push("status", "--short");
  else if (action === "git.diff") gitArgs.push("diff", "--stat");
  else if (action === "git.log") gitArgs.push("log", "--oneline", "-n", "10");
  else if (action === "git.show") gitArgs.push("show", "--stat", "--oneline", rev);
  else if (action === "git.rev-parse") gitArgs.push("rev-parse", "--short", "HEAD");
  else fail(`unsupported git action: ${action}`);
  spec = { command: "git", args: gitArgs };
} else if (action.startsWith("build.")) {
  spec = commandForBuild();
} else if (action.startsWith("scan.")) {
  spec = commandForScan();
}

if (!spec) fail(`unsupported action for project type: ${action}`);

function quoteWin(value) {
  if (!/[ \t"]/ .test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function execute(command, commandArgs) {
  const options = {
    cwd: project,
    encoding: "utf8",
    timeout: 30 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
  };
  if (win && /\.(cmd|bat)$/i.test(command)) {
    const line = [command, ...commandArgs].map(quoteWin).join(" ");
    return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", line], options);
  }
  return spawnSync(command, commandArgs, options);
}

const started = Date.now();
const commandLine = [spec.command, ...spec.args];
if (dryRun) {
  console.log(JSON.stringify({ ok: true, dryRun: true, role, action, project, command: commandLine }, null, 2));
  process.exit(0);
}

const result = execute(spec.command, spec.args);
const durationMs = Date.now() - started;
const exit = result.status === null ? 127 : result.status;
const payload = {
  ok: exit === 0,
  role,
  action,
  project,
  command: commandLine,
  exit,
  durationMs,
  stdout: result.stdout || "",
  stderr: result.stderr || "",
  error: result.error ? { code: result.error.code, message: result.error.message } : null,
};

// 审计日志：不阻断主命令。
try {
  const workDir = path.join(project, ".ai-team", "work");
  if (fs.existsSync(workDir)) {
    const log = {
      time: new Date().toISOString(),
      role,
      action,
      project,
      command: commandLine,
      exit,
      durationMs,
      error: payload.error?.code || null,
    };
    fs.appendFileSync(path.join(workDir, "TEAM-SHELL.log"), `${JSON.stringify(log)}\n`, "utf8");
  }
} catch {
  // 审计日志失败不影响命令结果。
}

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`[team-shell] ${role} ${action}`);
  console.log(`[team-shell] ${commandLine.join(" ")}`);
  if (payload.stdout) process.stdout.write(payload.stdout);
  if (payload.stderr) process.stderr.write(payload.stderr);
  console.log(`[team-shell] exit=${exit} duration=${durationMs}ms`);
}
process.exit(exit);
