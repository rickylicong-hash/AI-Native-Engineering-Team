#requires -Version 5.1
<#
.SYNOPSIS
  Verify the team package, install it globally, then verify the installed copy.

.DESCRIPTION
  This is the maintainer workflow for team changes:
    1. verify the source package (agents/commands/skills/manifest/templates)
    2. install into the OpenCode config directory (backup outside the config root)
    3. verify the installed copy and ask OpenCode to list the agents

  Always edit the package in this repository first. Never edit the installed
  copy directly: the next publish overwrites it.

.PARAMETER Target
  Override the OpenCode config directory (mainly for tests).

.PARAMETER SetDefault
  Also set default_agent to ai-team/chief (with backup).

.PARAMETER SkipOpencode
  Skip the `opencode agent list` check (faster, less strict).

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish.ps1 -SetDefault
#>
param(
  [string]$Target = "",
  [switch]$SetDefault,
  [switch]$SkipOpencode
)

$ErrorActionPreference = "Stop"
$sourceRoot = Split-Path -Parent $PSScriptRoot
$verifyScript = Join-Path $sourceRoot "scripts\verify.mjs"
$installScript = Join-Path $sourceRoot "scripts\install.ps1"

if (-not (Test-Path -LiteralPath $verifyScript)) { throw "verify.mjs not found: $verifyScript" }
if (-not (Test-Path -LiteralPath $installScript)) { throw "install.ps1 not found: $installScript" }

function Resolve-Target {
  param([string]$Override)
  if ($Override) { return [System.IO.Path]::GetFullPath($Override) }
  if ($env:XDG_CONFIG_HOME) { return (Join-Path $env:XDG_CONFIG_HOME "opencode") }
  return (Join-Path $HOME ".config\opencode")
}

$configRoot = Resolve-Target -Override $Target

Write-Host "== 1/3 source verification =="
& node $verifyScript
if ($LASTEXITCODE -ne 0) { throw "Source verification failed. Fix the FAIL lines before publishing." }

Write-Host ""
Write-Host "== 2/3 install =="
$installArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $installScript)
if ($Target) { $installArgs += @("-Target", $Target) }
if ($SetDefault) { $installArgs += "-SetDefault" }
& powershell @installArgs
if ($LASTEXITCODE -ne 0) { throw "Install failed." }

Write-Host ""
Write-Host "== 3/3 installed verification =="
$verifyArgs = @($verifyScript, "--root", $configRoot, "--installed")
if (-not $SkipOpencode) { $verifyArgs += "--opencode" }
& node @verifyArgs
if ($LASTEXITCODE -ne 0) { throw "Installed verification failed. The global copy may be incomplete." }

Write-Host ""
Write-Host "== version check =="
$versionScript = Join-Path $sourceRoot "scripts\version.mjs"
& node $versionScript --target $configRoot --check
if ($LASTEXITCODE -ne 0) { throw "Version check failed after publish." }

Write-Host ""
Write-Host "Published: $configRoot"
Write-Host "Next: in any project run /ai <goal>, or select agent ai-team/chief."
