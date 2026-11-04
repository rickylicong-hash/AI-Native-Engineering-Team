#!/usr/bin/env node
/**
 * Write the installed-version marker after a successful install/publish.
 *
 * Usage:
 *   node scripts/write-marker.mjs --source <package-root> --target <opencode-config> [--quiet]
 */

import path from "node:path";
import process from "node:process";
import { resolveSourceRoot, resolveTarget, writeMarker } from "./lib/package-info.mjs";

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const quiet = args.includes("--quiet");

const sourceRoot = path.resolve(getArg("--source", resolveSourceRoot()));
const target = resolveTarget(getArg("--target", ""));

writeMarker({ sourceRoot, target, quiet });
