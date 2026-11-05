# Changelog

All notable changes to the AI Native Engineering Team are documented here.
Format based on Keep a Changelog; versioning follows SemVer.

## [1.2.5] - 2026-11-05

### Fixed

- **Chief could not run the new retro check**: Chief's shell was `* deny` with only `node -v`; added explicit allow for `node *retro-check.mjs*` and `node *checkpoint-check.mjs*`. The audit now detects “prompt references a script but permission does not allow it”.
- **QA permission contradicted its prompt**: QA said it must not commit, but `git commit`/`git push`/`git tag` were `ask` and `git init` was `ask`. They are now `deny`; `audit-git-permissions.mjs` has a non-committing write-role category and checks the *last* matching rule instead of merely finding a deny anywhere.
- **External directory claims were not enforced**: all 10 agents now have `external_directory * -> ask`, matching the docs that outside-project reads/edits require approval.
- **Checkpoint work was ad hoc**: added `checkpoint-check.mjs`, `state/CHECKPOINT.json`, `TASK-GIT-*` requirement, `--mark` baseline, and a HEAD audit that rejects raw work logs, secrets and build output. Wired into `/ai`, `/ai-resume`, `/ai-status`, `/ai-handoff`, `/ai-deploy`, `/ai-hotfix`, `/ai-retro`, Chief §7.2/§15 and the gates.
- **Old checkpoint briefs could say `git add -A`**: Chief/DevOps prompts now forbid it; DevOps must refuse such a brief with `BLOCKED`; checkpoint evidence must list explicit paths.
- **`/ai-hotfix` had no GROWTH step**: P0/P1/hotfix/rollback now writes a lightweight retro.
- **`/ai-deploy` did not check retro/checkpoint**: both are now release preconditions.

### Added

- `scripts/audit-team-consistency.mjs`: 80 checks for manifest/command/skill references, script permissions, QA commit posture, `external_directory`, and required templates/scripts.
- `checkpoint-check.mjs`: file/task/gate/handoff triggers, `--mark` baseline, HEAD audit that marks a non-compliant commit as due and rejects raw work logs, secrets and build output.
- `verify.mjs` now checks every `.mjs` syntax and runs both audits (190 checks).

### Verified

- `node scripts/verify.mjs` → 190/190.
- `node scripts/audit-team-consistency.mjs` → 80 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `checkpoint-check.mjs` fixture tests → 13 cases, 0 failed.
- `riccon-ai` current HEAD `ebb16df` was committed with `git add -A` (234 files) and contains 16 raw work logs; `checkpoint-check --mark` refuses it. Only 3 untracked evidence files remain.

## [1.2.4] - 2026-11-05

### Added

- Mandatory retro cadence, triggered by delivery progress instead of release only:
  - first 10 `done` tasks, then every 10 more;
  - T3/T4 before G5, G7 and G8;
  - P0/P1 incidents, hotfixes and rollbacks;
  - the same failure pattern appearing twice;
  - before `/ai-handoff` when any trigger is due;
  - `/ai-retro`.
- `ai-team-workflow/scripts/retro-check.mjs`: deterministic `done` counting from `TASKS.md`, comparison with `GROWTH.md` frontmatter, gate/incident triggers, JSON output and exit codes.
- `ai-team-workflow/templates/GROWTH.md`: append-only retro format with `last_retro`, `last_gate`, `tasks_at_last_retro`, `next_due_at`.
- Retro check wired into `/ai`, `/ai-resume`, `/ai-status`, `/ai-handoff`, `/ai-retro`, Chief's startup checklist and gate rules.
- `STATUS.md` and `HANDOFF.md` now carry a `Retro:` line.

### Changed

- `team/GROWTH.md` is created at the first due event (10 done), not only at G8; a due retro blocks new feature work and gate approval.
- Lightweight retro (10–20 lines) at cadence/gate/incident; full retro at G8.
- One-off issues go to `RISKS.md`; only patterns with ≥2 evidence occurrences become growth proposals.
- `GIT-POLICY.md` checkpoint now also fires after a retro is written; GROWTH is part of the curated `.ai-team` snapshot.
- Updated `docs/WORKFLOW.md`, `docs/TEAM.md`, `QUALITY-GATES.md`, README and the `/ai-retro` command.

### Verified

- `node .opencode/skills/ai-team-workflow/scripts/retro-check.mjs --project D:\Development\riccon-ai` → due, 29 done, GROWTH missing, and flags the stale `PROJECT.md` stage (G1 vs STATUS G4).
- `node scripts/verify.mjs` → all checks pass.

## [1.2.3] - 2026-11-05

### Added

- Commit ownership policy: authors own content, but commits are assigned by role:
  - Engineer commits code + unit tests + `.ai-team/work/TASK-*` evidence.
  - Technical Writer commits docs + `.ai-team/docs`.
  - DevOps commits curated `.ai-team` checkpoint snapshots for all other roles.
  - Chief/PM/UX/Architect/Reviewer/Security do not get raw `git commit`.
- Chief now delegates checkpoint commits to DevOps and provides explicit paths, task IDs, roles, and message.
- DevOps checkpoint procedure: explicit paths only, no `git add -A`, secret scan, redacted security reports, `Co-authored-by` attribution, push requires user approval.
- Updated `docs/GIT-POLICY.md`, `docs/WORKFLOW.md`, `docs/TEAM.md` RACI, and the Chief/DevOps/Engineer/Writer/QA/Security prompts.

### Notes

- No permission changes: commit remains `ask`; push remains `ask`.
- `.ai-team/work/**`, logs, screenshots, tmp and unredacted security reports are not committed.

## [1.2.2] - 2026-11-05

### Fixed

- Audited git permissions across all 10 agents and closed the gaps:
  - `git tag` is now `ask` for Engineer, QA, and Technical Writer (DevOps already had it).
  - `git branch -D` / `git branch -d` are `deny` for all write roles.
  - remote changes (`add`/`remove`/`set-url`) are `ask`.
  - `git init` is `ask` for Engineer/QA/Writer; DevOps remains the repository-bootstrap owner.
  - `git checkout --`, `git restore`, `checkout -f`, `switch -f`, `switch --discard-changes`, `reset --merge`, and `worktree remove` are `ask`.
  - `git stash clear`, `update-ref -d`, `reflog expire`, and `gc --prune` are `deny`; `stash drop` is `ask`.
  - `git config --global` is `ask`.
  - force push via `--force`/`-f`/refspec `+`, and `--mirror`, are `deny`; `--delete` is `ask`.
  - `git apply`/`git am` are `deny` for QA and Technical Writer to prevent bypassing edit ownership.
- Read-only roles remain read-only: no commit/push/tag/branch/remote/reset/clean.

### Added

- `scripts/audit-git-permissions.mjs`: checks all 10 agents against the expected git policy and exits non-zero on gaps.
- `docs/GIT-POLICY.md`: role matrix, command policy, repo-bootstrap ownership, break-glass and residual risks.
- README links to the git policy and audit command.

### Verified

- `node scripts/audit-git-permissions.mjs` → 10 agents checked, 0 failed.
- `node scripts/verify.mjs` → 179/179.
- Version check → up to date after publish.

## [1.2.1] - 2026-11-04

### Fixed

- DevOps Engineer can now edit root repository metadata: `.gitignore`, `.gitattributes`, `.editorconfig`, `.gitmodules`, `.git-blame-ignore-revs`. Previously it could run `git init` but would be blocked from writing the baseline files.

### Added

- DevOps Engineer owns repository initialization/maintenance: `git init`, default branch, initial commit, `.gitignore`, `.gitattributes`, `.editorconfig`, remote setup (user approval), branch protection, secret/dependency scanning, CI skeleton.
- G0.1 repository baseline checklist in `QUALITY-GATES.md`.
- README, TEAM, BEST-PRACTICES updated with the DevOps repo-bootstrap responsibility.

## [1.2.0] - 2026-11-04

### Added

- `/ai-handoff` command: writes `.ai-team/state/HANDOFF.md` and prints a ready-to-paste next-session prompt. It does **not** create a new primary session.
- Automatic checkpoint triggers for Chief:
  - context near 70% or after compaction;
  - stage-gate transitions;
  - every 10 tasks or at the end of a workstream;
  - long tasks that exceed the current session;
  - user pause/continue-later;
  - state-file/chat drift.
- HANDOFF template now includes a "新会话首条消息" block.
- `/ai-resume` remains the receiving side: a new session reads HANDOFF and continues.

### Notes

- No automatic primary-session creation was added. Main-session creation stays with the user or an external orchestrator/plugin, with explicit opt-in, a session ledger, and a max-one-active-session rule.
- Subagent sessions remain automatic for task-scoped work.
- Verifier now expects 12 commands: 179 structural checks / 189 installed checks with `--opencode`.

## [1.1.4] - 2026-11-04

### Added

- Team coding convention: new or modified code comments must be written in Chinese.
  - Applies to inline comments, block comments, doc comments (JSDoc/Javadoc/docstring/Rustdoc), `TODO`/`FIXME`/`XXX`, SQL/migration comments, and config-file comments.
  - Does not apply to identifiers, API names, file names, branch names, commit messages, logs, error codes, or user-facing copy; those remain English or follow project convention.
  - Comments should explain why/assumptions/edge cases, not restate code.
- Engineer prompt, Code Reviewer checklist, `ai-team-standards`, README, and BEST-PRACTICES now document and enforce the rule.
- Project-level override: if a project explicitly requires English comments, the Chief records a `DEC-*` in the task brief; otherwise Chinese is the default.

### Notes

- Existing English comments are not mass-translated; translate only comments in the changed scope to avoid unrelated churn.
- Generated/vendor code comments are not manually translated.

## [1.1.3] - 2026-11-04

### Added

- System Architect and Security Auditor can now run the same read-only toolchain diagnostics as Chief: Java, Maven, Node, npm, pnpm, yarn, Bun, Python, pip, Go, Cargo, .NET, Docker, kubectl, Terraform, and Git version commands, plus `Get-Command`, `where`, and `Select-Object -ExpandProperty`.
- This supports technology selection/compatibility checks (Architect) and CVE/runtime mapping (Security).

### Security notes

- No `Sort-Object`, `Measure-Object`, `Format-Table`, `Format-List`, or `Out-String` was added to these read-only roles; only `Select-Object -ExpandProperty` is allowed.
- No external-directory read, edit, build, test, install, or deploy permission was added.
- PM, UX, and Code Reviewer remain unchanged.

## [1.1.2] - 2026-11-04

### Fixed

- Chief now allows read-only pipeline cmdlets used for listing/inspection: `Select-Object`, `Sort-Object`, `Measure-Object`, `Format-Table`, `Format-List`, `Out-String`.
- `Get-ChildItem 'D:\Development' -Directory | Select-Object -ExpandProperty Name` now works under Chief; the actual blocker was `Select-Object`, not `Get-ChildItem` or external directory access.

### Notes

- No broad `external_directory` grant was added. Listing `D:\Development` was already permitted by the existing `Get-ChildItem *` shell rule; only the pipeline stage was denied.
- PowerShell `try { ... } catch { ... }` wrappers are still rejected because `try` is a compound keyword, not an allowlisted command. Run the command directly or put it in a script.

## [1.1.1] - 2026-11-04

### Fixed

- Chief no longer rejects common read-only toolchain diagnostics. Added a narrow shell allowlist for `Write-Output`, `Write-Host`, and version/doctor commands for Java, Maven, Node, npm, pnpm, yarn, Bun, Python, pip, Go, Cargo, .NET, Docker, kubectl, Terraform, and Git.
- Chief's prompt now states that read-only version checks are allowed, while build/test/install/deploy commands must still be delegated to the owning engineer/QA/DevOps role.
- Documented the permission model and the `Permission denied: shell` diagnosis in README and TROUBLESHOOTING.

### Verified

- Ran the exact compound command on the Chief permission profile: all six version checks completed.
- Observed environment: Java 1.8.0_421, Maven 3.9.15, Node v24.15.0, npm 11.12.1, Docker 29.9.2, Git 2.45.1.

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
