#!/usr/bin/env bash
# Maintainer workflow: verify source -> install globally -> verify installed copy.
# Always edit the package in this repository first. Never edit the installed copy
# directly: the next publish overwrites it.
#
# Usage:
#   ./scripts/publish.sh                 # full publish
#   ./scripts/publish.sh --skip-opencode # skip `opencode agent list`
#   ./scripts/publish.sh --target DIR    # custom config dir (tests)
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
SKIP_OPENCODE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-opencode) SKIP_OPENCODE=1; shift ;;
    --target) TARGET="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--skip-opencode] [--target DIR]"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

echo "== 1/3 source verification =="
node "$SOURCE_ROOT/scripts/verify.mjs"

echo
echo "== 2/3 install =="
bash "$SOURCE_ROOT/scripts/install.sh" --target "$TARGET"

echo
echo "== 3/3 installed verification =="
args=(--root "$TARGET" --installed)
if [[ $SKIP_OPENCODE -eq 0 ]]; then args+=(--opencode); fi
node "$SOURCE_ROOT/scripts/verify.mjs" "${args[@]}"

echo
echo "== version check =="
node "$SOURCE_ROOT/scripts/version.mjs" --target "$TARGET" --check

echo
echo "Published: $TARGET"
echo "Next: in any project run /ai <goal>, or select agent ai-team/chief."
