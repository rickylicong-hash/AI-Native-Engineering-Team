import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const skillDir = path.resolve(scriptDir, "..");
export const agentsDir = path.resolve(scriptDir, "..", "..", "..", "agents", "ai-team");

export function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

export function roleFromAgent(value) {
  return (value || "").replace(/^ai-team\//, "").trim();
}

export function agentFile(role) {
  return path.join(agentsDir, `${roleFromAgent(role)}.md`);
}

export function loadMatrix() {
  return JSON.parse(readText(path.join(skillDir, "permissions.json")));
}

export function parseRules(text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return [...fm.matchAll(/- action: "?([A-Za-z0-9_*]+)"?\s*\r?\n\s*resource: "([^"]+)"\s*\r?\n\s*effect: (allow|ask|deny)/g)]
    .map((m) => ({ action: m[1], resource: m[2], effect: m[3] }));
}

export function readRules(role) {
  return parseRules(readText(agentFile(role)));
}

function normalize(value) {
  return (value || "").replace(/\\/g, "/");
}

export function matches(pattern, value) {
  const p = normalize(pattern);
  const v = normalize(value);
  const escaped = p.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
  return regex.test(v);
}

export function matchingRules(rules, action, resource) {
  return rules
    .map((rule, index) => ({ ...rule, index }))
    .filter((rule) => (rule.action === "*" || rule.action === action) && matches(rule.resource, resource));
}

export function effectiveRule(rules, action, resource) {
  const matchesFound = matchingRules(rules, action, resource);
  // OpenCode 采用最后匹配规则；这里保持同一语义，便于 doctor/lint 与运行时一致。
  return matchesFound.length ? matchesFound[matchesFound.length - 1] : null;
}

export function effectiveEffect(rules, action, resource) {
  return effectiveRule(rules, action, resource)?.effect ?? "none";
}

export function matrixRoles() {
  return Object.keys(loadMatrix().roles);
}

export function requiredFor(role) {
  const matrix = loadMatrix();
  return matrix.roles[roleFromAgent(role)] || null;
}
