#!/usr/bin/env bash
# Install the AI Native Engineering Team into the global OpenCode config.
# Usage:
#   ./scripts/install.sh              # install
#   ./scripts/install.sh --dry-run    # show what would happen
#   ./scripts/install.sh --target DIR # custom config dir (tests)
set -euo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --target) TARGET="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--target DIR]"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

STAMP="$(date +%Y%m%d-%H%M%S)"
# Backups live outside the OpenCode config root so they are never discovered as
# agents/commands/skills by OpenCode.
BACKUP_ROOT="$(dirname "$TARGET")/opencode-backups/ai-team/$STAMP"
if [[ ! -f "$SOURCE_ROOT/team-manifest.json" ]]; then
  echo "team-manifest.json not found in $SOURCE_ROOT" >&2
  exit 1
fi

echo "AI Native Engineering Team installer"
echo "  source : $SOURCE_ROOT"
echo "  target : $TARGET"
echo "  mode   : $([[ $DRY_RUN -eq 1 ]] && echo dry-run || echo install)"
echo

run() {
  if [[ $DRY_RUN -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi
}

backup_to() {
  local path="$1"
  local dest="$2"
  if [[ -e "$path" ]]; then
    run mkdir -p "$(dirname "$dest")"
    run mv "$path" "$dest"
    echo "backup: $dest"
  fi
}

# Agents
backup_to "$TARGET/agents/ai-team" "$BACKUP_ROOT/agents/ai-team"
run mkdir -p "$TARGET/agents"
run cp -R "$SOURCE_ROOT/.opencode/agents/ai-team" "$TARGET/agents/ai-team"

# Commands
run mkdir -p "$TARGET/commands"
for file in "$SOURCE_ROOT"/.opencode/commands/ai*.md; do
  base="$(basename "$file")"
  backup_to "$TARGET/commands/$base" "$BACKUP_ROOT/commands/$base"
  run cp "$file" "$TARGET/commands/$base"
done

# Skills
run mkdir -p "$TARGET/skills"
for dir in "$SOURCE_ROOT"/.opencode/skills/ai-team-*; do
  base="$(basename "$dir")"
  backup_to "$TARGET/skills/$base" "$BACKUP_ROOT/skills/$base"
  run cp -R "$dir" "$TARGET/skills/$base"
done

echo
if [[ $DRY_RUN -eq 1 ]]; then
  echo "Dry run complete. No files changed."
  exit 0
fi

# Version marker (after a successful copy, before summary)
if [[ -f "$SOURCE_ROOT/scripts/write-marker.mjs" ]]; then
  node "$SOURCE_ROOT/scripts/write-marker.mjs" --source "$SOURCE_ROOT" --target "$TARGET" --quiet
else
  echo "warning: write-marker.mjs not found; version marker not written" >&2
fi

echo "Installed: $(find "$TARGET/agents/ai-team" -name '*.md' | wc -l) agents, $(find "$TARGET/commands" -maxdepth 1 -name 'ai*.md' | wc -l) commands, $(find "$TARGET/skills" -maxdepth 1 -type d -name 'ai-team-*' | wc -l) skills."
if [[ -d "$BACKUP_ROOT" ]]; then echo "Backups: $BACKUP_ROOT"; fi
echo "Next: in any project run /ai <your goal>, or select agent ai-team/chief."
