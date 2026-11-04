# Changelog

All notable changes to the AI Native Engineering Team are documented here.
Format based on Keep a Changelog; versioning follows SemVer.

## [1.1.0] - 2026-11-04

### Added

- Version management: installers now write `ai-team-install.json` with version, install time, source/target, agent/command/skill counts, `sourceHash`, `installedHash`, and `manifestHash`.
- `scripts/version.mjs`:
  - default: show source vs installed version and status;
  - `--check`: exit 0 if up to date, 1 if update/drift/incomplete, 2 if not installed, 3 if unknown;
  - `--update`: verify source → install → verify installed → write marker;
  - `--force`: reinstall or downgrade;
  - `--json`: machine-readable status;
  - `--target`: custom config directory.
- Content-fingerprint drift detection: detects source changes without a version bump, modified/corrupted installed copies, and incomplete installs.
- `scripts/lib/package-info.mjs` and `scripts/write-marker.mjs` as shared version/marker utilities.
- Statuses: `up-to-date`, `update-available`, `drift`, `incomplete`, `legacy`, `not-installed`, `installed-newer`, `unknown`.

### Changed

- `install.ps1` / `install.sh` write the version marker after a successful copy.
- `team-manifest.json` version bumped to `1.1.0`.
- README, INSTALL, CUSTOMIZATION, TROUBLESHOOTING document version checks and updates.
- `publish.sh` calls `install.sh` through `bash` so it does not depend on the executable bit.

## [1.0.0] - 2026-11-04

### Added

- 10-role AI engineering team: Chief, Product Manager, UX/UI Designer, System Architect, Engineer, Code Reviewer, QA Engineer, Security Auditor, DevOps Engineer, Technical Writer.
- One-command entry `/ai <goal>` with automatic Track classification (T0–T4) and G0–G8 stage gates.
- `.ai-team/` durable project memory: project, status, tasks, decisions, risks, handoff, run log.
- Independent review model: code reviewer and security auditor are read-only for source, write only their reports.
- File-ownership permissions per role; destructive shell commands denied; push/deploy/cloud changes ask; `.env` and secrets denied.
- Skills:
  - `ai-team-workflow`: tracks, gates, state protocol, evidence, handoff, templates.
  - `ai-team-standards`: requirements, UX/a11y, architecture, coding, testing, security, DevOps, docs, AI standards.
  - `ai-team-release`: one-click deployment, CI, containers, observability, rollback.
  - `ai-team-ai-native`: eval-driven development, RAG, agents, guardrails, cost, privacy.
- Commands: `/ai`, `/ai-plan`, `/ai-design`, `/ai-review`, `/ai-test`, `/ai-deploy`, `/ai-status`, `/ai-resume`, `/ai-hotfix`, `/ai-retro`, `/ai-docs`.
- Templates for project state, PRD, architecture, ADR, review, test report, security report, release plan, rollback, eval plan, prompt spec.
- Cross-platform installers (`install.ps1`, `install.sh`) with dry-run, backup, and no unrelated-file deletion.
- Maintainer publish scripts (`publish.ps1`, `publish.sh`): source verify → install → installed verify + OpenCode agent list.
- Structural verifier (`scripts/verify.mjs`) with 174+ checks, including agent/command/skill references, permission shape, read-only reviewers, template existence, and stack-specific leakage warnings.
- Safe JSONC default-agent merge tool (`scripts/merge-default.mjs`) with backup.
- Documentation: README, INSTALL, TEAM, WORKFLOW, BEST-PRACTICES, CUSTOMIZATION, TROUBLESHOOTING, VERIFICATION, LARGE-PROJECTS.
- README now contains the full standard maintainer workflow: scope decision table, source → publish → verify, backup/rollback, and growth-proposal handling.
- `docs/LARGE-PROJECTS.md`: honest large-project capability assessment (L3 process maturity), capability matrix, scale-up gaps and P0/P1/P2 roadmap.

### Verified

- Structural verification: 174/174 checks pass.
- Installed verification: 184/184 checks pass, including OpenCode listing all 10 agents.
- Live end-to-end orchestration smoke test:
  - Chief initialized `.ai-team/`, classified T0, dispatched exactly one Technical Writer, and produced evidence.
  - The first run exposed the platform's default `subagent_depth: 1` limitation; Chief reported `BLOCKED` and refused to fabricate the specialist report.
  - With `experimental.subagent_depth: 3`, the retest passed; the Technical Writer produced a 192-line evidence-based review.
  - The review found 5 real documentation defects; all were fixed (Windows `~` expansion, hardcoded paths, missing success criteria, missing next step, temporary smoke agent).

### Fixed

- `verify.mjs` and `merge-default.mjs` now expand a leading `~` themselves, so PowerShell `--root ~/.config/opencode` works.
- README/INSTALL no longer hard-code `D:\Documents\AI Native`; they use `<path-to-this-repo>` and include the clone prerequisite.
- README verification now documents expected output, exit codes, `--opencode`, and the difference between package and installed modes.
- INSTALL now includes an "after install" next step, correct backup naming for commands, and nested-orchestration depth guidance.
- Removed the temporary `chief-smoke.md` test agent so the shipped package has exactly 10 agents.
- Installer backups now live in `~/.config/opencode-backups/ai-team/<stamp>/` (outside the config root), so backups are never discovered as duplicate agents/commands/skills.
- `install.ps1 -SetDefault` now actually merges `default_agent` (with backup) instead of only printing instructions; `merge-default.mjs` handles UTF-8 BOM and JSONC comments.

### Design notes

- Stack-agnostic: no hard-coded framework, language, cloud, or vendor; engineers detect the stack from manifests and follow existing conventions.
- Track scaling avoids over-processing small patches while keeping review/test/evidence mandatory.
- Inspired by the ownership, stage-gate, memory, evidence, and growth practices of `D:\Development\riccon\.opencode\agents`, generalized and extended with product/UX, one-command orchestration, AI-native engineering, and executable verification.
