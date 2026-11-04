import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const MARKER_FILE = "ai-team-install.json";

export function expandHome(value) {
  return value.replace(/^~(?=$|[\\/])/, os.homedir());
}

export function resolveTarget(override = "") {
  if (override) return path.resolve(expandHome(override));
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "opencode");
  return path.join(os.homedir(), ".config", "opencode");
}

export function resolveSourceRoot() {
  // package-info.mjs lives in <source>/scripts/lib/
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function readManifest(sourceRoot) {
  const file = path.join(sourceRoot, "team-manifest.json");
  if (!fs.existsSync(file)) throw new Error(`team-manifest.json not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

export function readMarker(target) {
  const file = path.join(target, MARKER_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return { parseError: true };
  }
}

function walkFiles(dir, predicate) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, predicate));
    else if (entry.isFile() && (!predicate || predicate(entry.name, full))) out.push(full);
  }
  return out;
}

function hashEntries(entries) {
  const hash = crypto.createHash("sha256");
  const sorted = [...entries].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  for (const { key, file } of sorted) {
    hash.update(key.replace(/\\/g, "/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function collectPackageFiles(sourceRoot) {
  const agents = walkFiles(path.join(sourceRoot, ".opencode", "agents", "ai-team"), (name) => name.endsWith(".md"));
  const commands = walkFiles(path.join(sourceRoot, ".opencode", "commands"), (name) => /^ai.*\.md$/.test(name));
  const skillsRoot = path.join(sourceRoot, ".opencode", "skills");
  const skills = [];
  if (fs.existsSync(skillsRoot)) {
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("ai-team-")) {
        skills.push(...walkFiles(path.join(skillsRoot, entry.name)));
      }
    }
  }
  return [...agents, ...commands, ...skills].sort();
}

export function packageHash(sourceRoot) {
  return hashEntries(collectPackageFiles(sourceRoot).map((file) => ({
    key: path.relative(sourceRoot, file),
    file,
  })));
}

/**
 * Hash the installed copy using the same relative keys as the source package,
 * so a clean install yields the same hash as the source.
 */
export function installedPackageHash(target) {
  const entries = [];
  const agentsRoot = path.join(target, "agents", "ai-team");
  for (const file of walkFiles(agentsRoot, (name) => name.endsWith(".md"))) {
    entries.push({ key: `.opencode/agents/ai-team/${path.relative(agentsRoot, file)}`, file });
  }
  for (const file of walkFiles(path.join(target, "commands"), (name) => /^ai.*\.md$/.test(name))) {
    entries.push({ key: `.opencode/commands/${path.basename(file)}`, file });
  }
  const skillsRoot = path.join(target, "skills");
  if (fs.existsSync(skillsRoot)) {
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("ai-team-")) {
        for (const file of walkFiles(path.join(skillsRoot, entry.name))) {
          entries.push({
            key: `.opencode/skills/${entry.name}/${path.relative(path.join(skillsRoot, entry.name), file)}`,
            file,
          });
        }
      }
    }
  }
  return hashEntries(entries);
}

export function manifestHash(sourceRoot) {
  const file = path.join(sourceRoot, "team-manifest.json");
  return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
}

export function countInstalled(target) {
  const countFiles = (dir, filter) => {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && filter(e.name)).length;
  };
  const countDirs = (dir, prefix) => {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith(prefix)).length;
  };
  return {
    agents: countFiles(path.join(target, "agents", "ai-team"), (n) => n.endsWith(".md")),
    commands: countFiles(path.join(target, "commands"), (n) => /^ai.*\.md$/.test(n)),
    skills: countDirs(path.join(target, "skills"), "ai-team-"),
  };
}

export function writeMarker({ sourceRoot, target, quiet = false }) {
  const manifest = readManifest(sourceRoot);
  const counts = countInstalled(target);
  const sourceHash = packageHash(sourceRoot);
  const installedHash = installedPackageHash(target);
  const marker = {
    id: manifest.id ?? "ai-team",
    name: manifest.name ?? "AI Native Engineering Team",
    version: manifest.version ?? "0.0.0",
    installedAt: new Date().toISOString(),
    source: sourceRoot,
    target,
    ...counts,
    sourceHash,
    installedHash,
    // Backward-compatible alias for older tooling.
    packageHash: sourceHash,
    manifestHash: manifestHash(sourceRoot),
  };
  fs.mkdirSync(target, { recursive: true });
  const file = path.join(target, MARKER_FILE);
  fs.writeFileSync(file, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
  if (!quiet) console.log(`Version marker: ${marker.version} -> ${file}`);
  return marker;
}

export function installedExists(target) {
  if (fs.existsSync(path.join(target, "agents", "ai-team"))) return true;
  const commands = path.join(target, "commands");
  if (fs.existsSync(commands) && fs.readdirSync(commands).some((name) => /^ai.*\.md$/.test(name))) return true;
  const skills = path.join(target, "skills");
  if (fs.existsSync(skills)) {
    return fs.readdirSync(skills, { withFileTypes: true })
      .some((entry) => entry.isDirectory() && entry.name.startsWith("ai-team-"));
  }
  return false;
}
