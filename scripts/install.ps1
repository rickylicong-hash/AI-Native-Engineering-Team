#requires -Version 5.1
<#
.SYNOPSIS
  Install the AI Native Engineering Team into the global OpenCode configuration.

.DESCRIPTION
  Copies the team's agents, commands and skills into the OpenCode config directory
  (default: ~/.config/opencode). Existing files with the same names are backed up
  first; unrelated agents/commands/skills are never touched.

.PARAMETER Target
  Override the OpenCode config directory (mainly for tests).

.PARAMETER DryRun
  Show what would be copied without changing anything.

.PARAMETER SetDefault
  Also set default_agent to ai-team/chief in the global config. Uses a backup and
  only supports strict JSON/JSONC files that can be parsed after comment stripping.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -DryRun
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
#>
param(
  [string]$Target = "",
  [switch]$DryRun,
  [switch]$SetDefault
)

$ErrorActionPreference = "Stop"
$sourceRoot = Split-Path -Parent $PSScriptRoot

function Resolve-ConfigRoot {
  param([string]$Override)
  if ($Override) { return [System.IO.Path]::GetFullPath($Override) }
  if ($env:XDG_CONFIG_HOME) { return (Join-Path $env:XDG_CONFIG_HOME "opencode") }
  return (Join-Path $HOME ".config\opencode")
}

function Backup-Path {
  param([string]$Path, [string]$Destination)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  if ($DryRun) { Write-Host "[dry-run] backup $Path -> $Destination"; return }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Move-Item -LiteralPath $Path -Destination $Destination -Force
  Write-Host "backup: $Destination"
}

function Copy-Tree {
  param([string]$From, [string]$To)
  if (-not (Test-Path -LiteralPath $From)) { throw "Source not found: $From" }
  if ($DryRun) {
    Write-Host "[dry-run] copy $From -> $To"
    return
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $To) | Out-Null
  Copy-Item -LiteralPath $From -Destination $To -Recurse -Force
}

$configRoot = Resolve-ConfigRoot -Override $Target
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
# Backups live outside the OpenCode config root so they are never discovered as
# agents/commands/skills by OpenCode.
$backupRoot = Join-Path (Split-Path -Parent $configRoot) "opencode-backups\ai-team\$stamp"

Write-Host "AI Native Engineering Team installer"
Write-Host "  source : $sourceRoot"
Write-Host "  target : $configRoot"
Write-Host "  mode   : $(if ($DryRun) { 'dry-run' } else { 'install' })"
Write-Host ""

if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot "team-manifest.json"))) {
  throw "team-manifest.json not found in $sourceRoot. Run this script from the package directory."
}

# 1. Agents
$agentsSrc = Join-Path $sourceRoot ".opencode\agents\ai-team"
$agentsDst = Join-Path $configRoot "agents\ai-team"
if (Test-Path -LiteralPath $agentsDst) { Backup-Path -Path $agentsDst -Destination (Join-Path $backupRoot "agents\ai-team") }
Copy-Tree -From $agentsSrc -To $agentsDst

# 2. Commands
$commandsSrc = Join-Path $sourceRoot ".opencode\commands"
$commandsDst = Join-Path $configRoot "commands"
if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $commandsDst | Out-Null }
$commandFiles = Get-ChildItem -LiteralPath $commandsSrc -Filter "ai*.md" -File
foreach ($file in $commandFiles) {
  $dest = Join-Path $commandsDst $file.Name
  if (Test-Path -LiteralPath $dest) {
    Backup-Path -Path $dest -Destination (Join-Path $backupRoot "commands\$($file.Name)")
  }
  if ($DryRun) { Write-Host "[dry-run] copy $($file.FullName) -> $dest" }
  else { Copy-Item -LiteralPath $file.FullName -Destination $dest -Force }
}

# 3. Skills
$skillsSrc = Join-Path $sourceRoot ".opencode\skills"
$skillsDst = Join-Path $configRoot "skills"
if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $skillsDst | Out-Null }
foreach ($skill in Get-ChildItem -LiteralPath $skillsSrc -Directory -Filter "ai-team-*") {
  $dest = Join-Path $skillsDst $skill.Name
  if (Test-Path -LiteralPath $dest) { Backup-Path -Path $dest -Destination (Join-Path $backupRoot "skills\$($skill.Name)") }
  Copy-Tree -From $skill.FullName -To $dest
}

# 4. Optional default agent
if ($SetDefault) {
  $configFile = Join-Path $configRoot "opencode.jsonc"
  if (-not (Test-Path -LiteralPath $configFile)) {
    $jsonConfig = Join-Path $configRoot "opencode.json"
    if (Test-Path -LiteralPath $jsonConfig) { $configFile = $jsonConfig }
  }

  if (Test-Path -LiteralPath $configFile) {
    $mergeScript = Join-Path $sourceRoot "scripts\merge-default.mjs"
    if (-not (Test-Path -LiteralPath $mergeScript)) {
      throw "merge-default.mjs not found: $mergeScript"
    }
    $mergeArgs = @($mergeScript, "--config", $configFile)
    if ($DryRun) { $mergeArgs += "--dry-run" }
    & node @mergeArgs
    if ($LASTEXITCODE -ne 0) { Write-Host "warning: default_agent was not changed (see error above)." }
  } else {
    if ($DryRun) {
      Write-Host "[dry-run] create $configFile with default_agent"
    } else {
      @'
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "ai-team/chief"
}
'@ | Set-Content -LiteralPath $configFile -Encoding UTF8
      Write-Host "Created $configFile with default_agent = ai-team/chief"
    }
  }
}

Write-Host ""
if ($DryRun) {
  Write-Host "Dry run complete. No files changed."
  exit 0
}

# 5. Version marker (after a successful copy, before summary)
$markerScript = Join-Path $sourceRoot "scripts\write-marker.mjs"
if (Test-Path -LiteralPath $markerScript) {
  & node $markerScript --source $sourceRoot --target $configRoot --quiet
  if ($LASTEXITCODE -ne 0) { Write-Host "warning: failed to write version marker" }
} else {
  Write-Host "warning: write-marker.mjs not found; version marker not written"
}

$agentCount = (Get-ChildItem -LiteralPath $agentsDst -Filter "*.md" -File).Count
$commandCount = (Get-ChildItem -LiteralPath $commandsDst -Filter "ai*.md" -File).Count
$skillCount = (Get-ChildItem -LiteralPath $skillsDst -Directory -Filter "ai-team-*").Count
Write-Host "Installed: $agentCount agents, $commandCount commands, $skillCount skills."
if (Test-Path -LiteralPath $backupRoot) { Write-Host "Backups: $backupRoot" }
Write-Host "Next:"
Write-Host "  1. In any project, run: /ai <your goal>"
Write-Host "  2. Or select agent: ai-team/chief"
Write-Host "  3. Verify: node scripts/verify.mjs --root `"$configRoot`" --installed"
