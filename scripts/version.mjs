#!/usr/bin/env node
/**
 * Check or update the installed AI Native Engineering Team version.
 *
 * Usage:
 *   node scripts/version.mjs                 # show source vs installed
 *   node scripts/version.mjs --check         # exit 0 if up to date, 1 if update needed, 2 if not installed
 *   node scripts/version.mjs --update        # verify source -> install -> verify installed
 *   node scripts/version.mjs --update --force
 *   node scripts/version.mjs --json
 *   node scripts/version.mjs --target <dir>  # custom OpenCode config dir
 *
 * Statuses:
 *   up-to-date        installed version and package hash match source
 *   update-available  installed version is older than source
 *   drift             same version, but package content differs from source
 *   legacy            files exist but no version marker (installed before versioning)
 *   installed-newer   installed version is newer than source (use --force to downgrade)
 *   not-installed     no team files found in the target
 *   unknown           marker exists but cannot be parsed / lacks version/hash
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  readManifest,
  readMarker,
  packageHash,
  installedPackageHash,
  resolveSourceRoot,
  resolveTarget,
  installedExists,
  countInstalled,
} from "./lib/package-info.mjs";

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getArg = (name, fallback = "") => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage: node scripts/version.mjs [--check|--update] [--force] [--dry-run] [--json] [--target DIR] [--skip-opencode]`);
  process.exit(0);
}

const sourceRoot = resolveSourceRoot();
const target = resolveTarget(getArg("--target", ""));
const json = hasFlag("--json");
const check = hasFlag("--check");
const update = hasFlag("--update");
const force = hasFlag("--force");
const dryRun = hasFlag("--dry-run");
const skipOpencode = hasFlag("--skip-opencode");

function parseVersion(value) {
  const m = String(value ?? "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ?? "" };
}

function compareVersion(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (const key of ["major", "minor", "patch"]) {
    if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
  }
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

function statusOf() {
  const manifest = readManifest(sourceRoot);
  const marker = readMarker(target);
  const sourceVersion = manifest.version ?? "0.0.0";
  const sourceHash = packageHash(sourceRoot);
  const currentInstalledHash = installedPackageHash(target);
  const exists = installedExists(target) || Boolean(marker);
  const counts = countInstalled(target);

  const markerSourceHash = marker?.sourceHash ?? marker?.packageHash ?? null;
  const markerInstalledHash = marker?.installedHash ?? null;

  let status;
  if (!exists) status = "not-installed";
  else if (!marker) status = "legacy";
  else if (marker.parseError || !marker.version) status = "unknown";
  else if (compareVersion(marker.version, sourceVersion) < 0) status = "update-available";
  else if (compareVersion(marker.version, sourceVersion) > 0) status = "installed-newer";
  else if (!marker.installedHash) status = "legacy";
  else if (!markerSourceHash) status = "unknown";
  else if (markerSourceHash !== sourceHash) status = "drift";
  else if (markerInstalledHash && markerInstalledHash !== currentInstalledHash) status = "drift";
  else if (markerInstalledHash && markerInstalledHash !== markerSourceHash) status = "incomplete";
  else status = "up-to-date";

  return {
    status,
    sourceVersion,
    installedVersion: marker?.version ?? null,
    installedAt: marker?.installedAt ?? null,
    source: sourceRoot,
    target,
    sourceHash,
    installedHash: currentInstalledHash,
    markerSourceHash,
    markerInstalledHash,
    counts,
    markerFile: path.join(target, "ai-team-install.json"),
  };
}

function printStatus(s) {
  if (json) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }
  console.log("AI Native Engineering Team — version");
  console.log("");
  console.log(`source:      ${s.sourceVersion.padEnd(12)} ${s.source}`);
  console.log(`installed:   ${(s.installedVersion ?? "(none)").padEnd(12)} ${s.target}`);
  console.log(`status:      ${s.status}`);
  if (s.installedAt) console.log(`installedAt: ${s.installedAt}`);
  console.log(`package:     ${s.counts.agents} agents / ${s.counts.commands} commands / ${s.counts.skills} skills`);
  console.log(`hash:        source ${s.sourceHash}`);
  if (s.installedHash) console.log(`             installed ${s.installedHash}`);
  console.log("");
}

function exitForCheck(s) {
  switch (s.status) {
    case "up-to-date": return 0;
    case "update-available":
    case "drift":
    case "incomplete":
    case "legacy":
    case "installed-newer": return 1;
    case "not-installed": return 2;
    default: return 3;
  }
}

function publishCommand() {
  if (process.platform === "win32") {
    const script = path.join(sourceRoot, "scripts", "publish.ps1");
    const cmdArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Target", target];
    if (skipOpencode) cmdArgs.push("-SkipOpencode");
    return { command: "powershell", args: cmdArgs, display: `powershell ${cmdArgs.join(" ")}` };
  }
  const script = path.join(sourceRoot, "scripts", "publish.sh");
  const cmdArgs = [script, "--target", target];
  if (skipOpencode) cmdArgs.push("--skip-opencode");
  return { command: "bash", args: cmdArgs, display: `bash ${cmdArgs.join(" ")}` };
}

const before = statusOf();

if (update) {
  if (before.status === "up-to-date" && !force) {
    printStatus(before);
    console.log("Already up to date. Use --force to reinstall.");
    process.exit(0);
  }
  if (before.status === "installed-newer" && !force) {
    printStatus(before);
    console.log("Installed version is newer than source. Use --force to downgrade.");
    process.exit(1);
  }

  printStatus(before);
  if (before.status === "drift") {
    console.log("Warning: package content changed without a version bump. Consider bumping team-manifest.json version.");
  }
  const pub = publishCommand();
  if (dryRun) {
    console.log(`[dry-run] ${pub.display}`);
    process.exit(0);
  }

  console.log(`Updating ${before.installedVersion ?? "(not installed)"} -> ${before.sourceVersion} ...`);
  console.log(`Running: ${pub.display}`);
  console.log("");

  const result = spawnSync(pub.command, pub.args, { stdio: "inherit" });
  if (result.error) {
    console.error(`Failed to start publish: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Publish failed with exit code ${result.status}. Installed version unchanged or incomplete.`);
    process.exit(result.status ?? 1);
  }

  const after = statusOf();
  printStatus(after);
  if (after.status !== "up-to-date") {
    console.error(`Update finished but status is still "${after.status}".`);
    process.exit(1);
  }
  console.log(`Updated to ${after.sourceVersion}.`);
  if (!json) {
    console.log("");
    console.log("RESTART REQUIRED: OpenCode caches agent permissions at session creation.");
    console.log("Start a new session (or restart OpenCode) before running /ai or /ai-resume.");
    console.log("Old sessions may still deny non-destructive commands.");
  }
  process.exit(0);
}

printStatus(before);
if (check) process.exit(exitForCheck(before));
process.exit(0);
