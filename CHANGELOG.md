# Changelog

All notable changes to the AI Native Engineering Team are documented here.
Format based on Keep a Changelog; versioning follows SemVer.

## [1.3.3] - 2026-11-06

### Added

- **Permission matrix**: `.opencode/skills/ai-team-workflow/permissions.json` is now the single source of required/forbidden permissions for all 10 roles. New scripts and commands must be declared there before changing agent frontmatter.
- **`permission-lint.mjs`**: validates every role's required permissions are `allow`/`ask` and forbidden ones are not `allow`. It covers 191 role/permission checks across Chief, PM, UX, Architect, Engineer, Reviewer, QA, Security, DevOps, and Writer.
- **`permission-doctor.mjs`**: given an agent and a rejected command, lists matching rules, final effect, and the minimal missing allow (or tells the caller to split a compound shell command).
- **Startup preflight**: `/ai` and `/ai-resume` now run `permission-lint --role ai-team/chief` before restoring state or dispatching work.
- **Consistency checks**: `audit-team-consistency` now verifies the matrix exists, covers all manifest roles, and that Chief can run `permission-lint`/`permission-doctor`.

### Changed

- Documented the matrix as the single source of truth in `SKILL.md`, `WORKFLOW.md`, `TEAM.md`, and `QUALITY-GATES.md`.
- Added `permission-lint` to G3 planning and checkpoint gates.

### Verified

- `node scripts/verify.mjs` → 200/200.
- installed verify → 192/192; installed + OpenCode → 202/202.
- `node scripts/audit-team-consistency.mjs` → 243 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 191 checks, 0 failed; `--role chief` → 29 checks, 0 failed.
- `permission-doctor` fixture: `growth-check` → allow; compound shell → deny + split advice.

## [1.3.2] - 2026-11-06

### Fixed

- **Chief could not run the new 1.3.1 scripts**: `/ai-resume` called `growth-check` but the Chief shell allowlist only covered `retro-check` / `checkpoint-check` / `state-check` / `artifact-check`. Added allow rules for `growth-check`, `brief-lint`, `review-check`, and `audit-state`.
- **Reviewer/Security could not validate their own reports**: added `node *review-check.mjs*` to both roles.
- **DevOps could not run the GROWTH pre-checkpoint check**: added `node *growth-check.mjs*` explicitly.
- **Chief absolute-path state reads**: added `Get-Content */.ai-team/{state,tasks,team}/*` while keeping the `read` tool as the default.

### Verified

- `node scripts/verify.mjs` → 197/197.
- installed verify → 189/189; installed + OpenCode → 199/199.
- `node scripts/audit-team-consistency.mjs` → 237 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- Fixture: Chief effective config contains the four new script allows; reviewer/security contain `review-check`; DevOps contains `growth-check`.

## [1.3.1] - 2026-11-06

### Added

- **T-30 brief preflight**: `brief-lint.mjs` validates the brief file before any subagent dispatch. All roles need role, skill, task, track, goal, background, ownership, constraints, acceptance, must-execute, evidence location, evidence requirements, forbidden actions, report format, and build isolation. Reviewer/security additionally need `独立验证` and `P2 处置`; QA needs `测试路径`.
- **T-31 shell single-command**: shell permission now denies `;`, `&&`, `||`, `2>&1`, and `git add -A` / `git add .` patterns for the writing/verification roles. Compound commands must be split; `git add` must use explicit paths.
- **T-32 review report gate**: `review-check.mjs` requires `## 独立验证`, actual command evidence, and an exit code. A risk-only report can be recorded but cannot close a P1/security item. Security report template now has an independent-verification section.
- **T-33 session audit watermark**: `audit-state.mjs --mark` records the audit timestamp and the maximum session/message timestamps in `.ai-team/team/AUDIT.json`; the next audit starts after that watermark instead of rescanning all history.
- **Skill loading in briefs**: the brief now records `技能：ai-team-workflow` (plus `ai-team-ai-native` for AI work), and `brief-lint` rejects a missing skill field.

### Verified

- `node scripts/verify.mjs` → 197/197.
- installed verify → 189/189; installed + OpenCode → 199/199.
- `node scripts/audit-team-consistency.mjs` → 230 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `brief-lint` fixture: QA pass; reviewer missing `独立验证`/`P2 处置` fails.
- `review-check` fixture: strict command + exit code passes.
- `audit-state`: riccon-ai 152 sessions, watermark written to `.ai-team/team/AUDIT.json`.
- `git add -A` and compound-shell deny rules present in effective config.

## [1.3.0] - 2026-11-06

### Added

- **T-20 build mutex**: only one subagent may run a command that writes `target/`, `build/`, or `coverage/` in a workspace at a time; parallel tasks must be read-only or use a separate worktree. Briefs now carry `构建隔离`.
- **T-21 independent verification enforcement**: reviewer/security briefs must contain an executable verification command. “No shell” is no longer a default; it requires a `RISK-*` and Chief approval, and cannot close a P1/security item.
- **T-22 defect lifecycle**: new `templates/DEFECTS.md`; owners may only set `fixed`, and only QA may set `verified`/`closed` after independent regression. TASK-0035's project practice is now reusable.
- **T-23 state self-check**: `state-check` rejects duplicate TASK-IDs; Chief must run it after every batch of `state/**` edits and before handoff.
- **T-24 P2 debt**: every P2 with real risk in a “changes requested / approved with P2” review needs a `TASK-*`, `RISK-*`, or written acceptance before the gate can pass.
- **T-25 permission/audit hardening**: engineer is explicitly denied QA-owned Java E2E paths; DevOps may only write `TASK-GIT-*EVIDENCE.md`; consistency audit covers both boundaries.
- **T-26 growth disposition and archive**: `GROWTH.md` now has a single `提案处置索引` with `proposed/accepted/in_progress/deferred/partial/done/rejected/superseded`; `growth-check.mjs` validates it and can archive fully closed old retrospectives to `team/archive/`.
- **T-27 review/evidence closeout**: third-round review deadlock requires a Chief decision (split/downgrade/accept risk); R rounds must update affected evidence in the same batch; security-semantic changes need a fail-open counterexample; large slices use `checkpoint-check --max-files`.

### Changed

- Documentation and command preflight now include `growth-check`; `docs/WORKFLOW.md` and `docs/TEAM.md` match the current reviewer shell, QA Java E2E paths, build mutex, and brief fields.
- Team proposal IDs from 1.3.0 onward use `T-*` to avoid collision with project GROWTH `P-*` IDs.

### Verified

- `node scripts/verify.mjs` → 194/194.
- installed verify → 186/186; installed + OpenCode → 196/196.
- `node scripts/audit-team-consistency.mjs` → 168 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `state-check` fixture: duplicate TASK-ID fails with exit 1.
- `growth-check` fixture: 22 proposals, done 22, open 0, strict PASS; fully closed RETRO-0001..0004 archived to `team/archive/GROWTH-2026.md`.

## [1.2.19] - 2026-11-05

### Added

- **Java/Maven QA test ownership**: QA can now edit `**/src/test/java/**/e2e/**` and `**/src/test/java/**/qa/**` (plus `src/test/resources` equivalents), while the broad deny keeps engineer unit tests out of QA scope.
- **QA test path preflight**: task briefs now have a `测试路径` field; for QA tasks it must be QA-owned and inside a build-recognized test source root.
- **Build-integrated E2E rule**: E2E/integration tests must run from a clean checkout via the project’s standard build command. Manual `javac`, `Copy-Item` into `target/test-classes`, or a temporary classpath cannot be final evidence.
- **QA permission-denial rule**: denied edit/write returns BLOCKED with the full path; QA must not probe alternate paths or overwrite `TASK-*-EVIDENCE.md` with probe content.

### Verified

- `node scripts/verify.mjs` → 193/193.
- installed verify → 185/185; installed + OpenCode → 195/195.
- `node scripts/audit-team-consistency.mjs` → 144 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- riccon-ai TASK-0035 E2E moved to `server/src/test/java/io/riccon/e2e/M1HappyPathE2ETest.java`; `mvn -B -o -pl server -Dtest=M1HappyPathE2ETest test` → 5/5, BUILD SUCCESS.

## [1.2.18] - 2026-11-05

### Added

- **UTF-16 evidence is now blocking for new logs**: `artifact-check` treats UTF-16 `.log`/`.txt` under `logs/**` as an error (reviewers cannot read it); historical `.ai-team/work/**` evidence remains a warning.
- **`artifact-check --fix` / `--fix-all`**: converts UTF-16LE/BE evidence to UTF-8 while preserving text; `--fix` handles `logs/**`, `--fix-all` also migrates `.ai-team/work/**`.
- **Reviewer binary handling**: `code-reviewer` now maps `Cannot read binary file` to “unreadable/unverified”; it must request a UTF-8 copy/summary and cannot close P1/security items on unreadable evidence.

### Verified

- `node scripts/verify.mjs` → 193/193.
- installed verify → 185/185; installed + OpenCode → 195/195.
- `node scripts/audit-team-consistency.mjs` → 140 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- fixture: `logs/**` UTF-16 fails; `--fix` converts and passes; `.ai-team/work` UTF-16 warns; `--fix-all` converts history.
- riccon-ai: 25 logs under `logs/2026-11-05/` converted to UTF-8, including all 8 TASK-0039 logs; `artifact-check` reports 0 errors and 55 historical `.ai-team/work` warnings; TASK-0039 logs are now readable.

## [1.2.17] - 2026-11-05

### Added

- **P-18 checkpoint closeout**: `checkpoint-check --mark` now prints the required `HANDOFF Git/Baseline` and `STATUS Checkpoint` values. `state-check` compares both against `CHECKPOINT.json` and reports the suggested commit when they lag; `TASK-GIT-*` evidence must include `state-check` PASS before a checkpoint is considered complete.

### Verified

- `node scripts/verify.mjs` → 193/193.
- installed verify → 185/185; installed + OpenCode → 195/195.
- `node scripts/audit-team-consistency.mjs` → 138 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `state-check` fixture: HANDOFF baseline behind `CHECKPOINT.json` fails with the suggested SHA; after sync, doc-only commit passes.
- `checkpoint-check --mark` fixture: prints `NEXT` with HANDOFF/STATUS values.

## [1.2.16] - 2026-11-05

### Added

Closed the evidence-quality and test-reliability gaps found during the TASK-0038 log cleanup:

- **P-15 artifact hygiene**: new `artifact-check.mjs` flags root-level `*.log`, `target-*`, temp files, stray `.class` dirs and unreadable evidence. `state-check` and `checkpoint-check` run it; artifact errors make checkpoints due and `--mark` refuses. Logs must live in `logs/<date>/TASK-<id>-<step>-<timestamp>.log` or `.ai-team/work/<TASK>-logs/`; failed logs use `.failed.log`; T0/spike `target/` is cleaned at task close.
- **P-16 flake governance**: non-deterministic failures require a `RISK-*`/`DEF-*`, owner and closure criteria. A rerun alone cannot close a P1/security item; QA reports must list skipped/flaky tests; G5/G6 and the test-report template enforce this.
- **P-17 reviewer independence**: task brief now has `独立验证` and `证据位置` fields. Reviewers must run the project’s tests/scans by default; a no-shell brief must carry a `RISK-*` plus compensating evidence. UTF-16/binary logs cannot be the sole basis for closing a P1/security item; the review template records commands actually executed and evidence readability.

### Verified

- `node scripts/verify.mjs` → 193/193.
- installed verify → 185/185; installed + OpenCode → 195/195.
- `node scripts/audit-team-consistency.mjs` → 135 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `artifact-check` fixture: root log and stray class dir fail; archived `TASK-*` log passes; UTF-16 evidence warns and fails `--strict`.
- `state-check` fixture: root log is an error; `checkpoint-check` fixture: root log makes checkpoint due and blocks `--mark`.

## [1.2.15] - 2026-11-05

### Added

Implemented the remaining team-level proposals from riccon-ai `GROWTH.md` RETRO-0002/0003:

- **P-07 assembly checklist**: task brief now requires Bean registration point, persistence repository, external dependency/artifact, config keys and migration; missing → BLOCKED. G3/G4 check wiring, not just “implemented”.
- **P-08 review throttle**: same module may have at most 2 unreviewed slices; the 3rd slice cannot start before review.
- **P-09 checkpoint hard gate**: `checkpoint-check` runs before any new implementation task, not only gates/handoff.
- **P-10 status backfill**: task reports must include a suggested `TASKS.md` update; Chief writes it in the same round.
- **P-12 HANDOFF baseline**: `HANDOFF.md` has `Git` and `Baseline` lines; `state-check` allows doc-only/`.ai-team` commits after the baseline and **fails** on code commits after it. No more self-referential Git warning.
- **P-13 design pre-review**: credential/migration/transport/tenant-boundary designs require `SEC-*` review before G4; Security/Architect prompts and G2 cross-review updated.
- **P-14 contract same commit**: contract changes must be in the same commit as implementation; reviewer template and G4/G5 gates enforce it.
- **P-11 legacy statuses**: `state-check` now lists every `done（...）` task ID for migration.

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 124 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `state-check` on riccon-ai → PASS, 0 warnings (baseline `89ced79`, HEAD `8f0fd5b`, doc-only commit).
- state-check fixture: doc-only commit after baseline passes; code commit after baseline fails.

## [1.2.14] - 2026-11-05

### Added

- `audit-team-consistency.mjs` now fails on duplicate exact `(action, resource)` rules for every agent. This makes the “duplicate permission” class a permanent regression check (117 checks).

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 117 checks, 0 failed.

## [1.2.13] - 2026-11-05

### Fixed

Full permission audit across all 10 agents:

- **Engineer over-permission**: because Engineer keeps a broad `edit` allow for source code, it could also edit docs, README/CHANGELOG, deploy/ops/infra/terraform/k8s/helm/docker, `.github`, Dockerfile/compose/Makefile, `.ai-team/tasks`, `.ai-team/docs`, `.ai-team/README`, `design`, `mockups`, `prototypes`, `qa`, `e2e`. Added explicit denies for all non-owned paths.
- **Agent instruction files**: every agent could edit `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `opencode.jsonc` through the base allow. Added edit denies to all 10 agents.
- **QA could stage changes**: QA was non-committing but could `git add`/`git rm`/`git mv`/`git stage`. Added deny rules; QA now truly cannot stage.
- **Writer could edit ADRs**: `docs/*` allowed Writer to edit `docs/adr/*`; added deny so ADRs remain Architect-owned.
- **Non-DevOps release permissions**: Engineer/QA/Writer could run `npm publish`, `docker push`, `kubectl apply`, `helm upgrade`, `terraform apply` with `ask`. They are now `deny`; only DevOps keeps `ask`.
- **Chief V1 compatibility**: added `task` deny/allow rules mirroring `subagent`, so `task` cannot bypass the read-only subagent policy.
- **Duplicates removed**: Security had duplicate `npm ls *` and `pnpm list *`; release ask/deny duplicates in Engineer/QA/Writer cleaned up.
- **Security output checks**: added `Select-Object`/`Out-String` for read-only scan output.

### Added

- `audit-team-consistency.mjs` now checks Engineer edit scope, Writer ADR ownership, Chief `task` rules, and release-command denials (107 checks).

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 107 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.

## [1.2.12] - 2026-11-05

### Fixed

- `REV-0010` showed the reviewer tried `mvn -v`, `java -version`, and `Get-ChildItem/Select-String`, then concluded it could not run `mvn -B clean test` or `mvn -B -DskipTests package` — even though those actual test/package commands were allowed. The blocker was the toolchain/search commands, plus a behavioral stop.
- Added `Select-String`, `rg`, and `Test-Path` to code-reviewer/security-auditor read-only search rules.
- Reviewer prompt now says: **`mvn -v`/`java -version` being denied does not mean `mvn test` is denied**; try `mvn -B test`/`verify`/`package` before declaring BLOCKED.
- `audit-team-consistency` now checks `Select-String` too (96 checks).

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 96 checks, 0 failed.

## [1.2.11] - 2026-11-05

### Fixed

- `code-reviewer` could not run toolchain checks or inspect build output:
  - added `java -version`/`java --version`, `mvn -v`/`-version`/`--version`;
  - added `mvn *compile*` and `mvn *dependency:analyze*`;
  - added `Get-ChildItem`, `Test-Path`, `Get-Command`, `Select-Object`, `Out-String`, `Write-Output`, `Write-Host`.
- Reviewer prompt now says: check `java -version` and `mvn -v` first; use `mvn -f <pom>`/`-pl <module> -am` instead of `cd`; run one command at a time; read `target/surefire-reports/**` with the `read` tool, not `Get-Content`.
- `audit-team-consistency` now checks these reviewer capabilities (95 checks).

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 95 checks, 0 failed.

## [1.2.10] - 2026-11-05

### Fixed

- Broadened reviewer Maven permission patterns so fully qualified plugin goals match:
  - `mvn *test*`, `mvn *verify*`, `mvn *package*`;
  - `mvn *dependency:tree*`, `mvn *dependency-check*`;
  - `mvn *spotbugs*`, `mvn *pmd*`, `mvn *checkstyle*`;
  - `mvn *cyclonedx*`, `mvn *versions:display-dependency-updates*`, `mvn *dependency:analyze*`.
- The previous `mvn * dependency-check*` pattern required a space before the plugin name, so `mvn org.owasp:dependency-check-maven:check` would still be denied. This release closes that gap.

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 91 checks, 0 failed.

## [1.2.9] - 2026-11-05

### Fixed

- **RISK-0040: reviewers could not independently verify.** `code-reviewer` and `security-auditor` are read-only for edits, but their shell allowlist had no build/test/scan commands, so `mvn` was denied and they could only rely on engineer self-reports.
- Added a read-only verification allowlist to both reviewers:
  - `git -C` status/diff/log/show/rev-parse/blame/ls-files;
  - Maven (`test`/`verify`/`package`/`dependency:tree`/`dependency-check`/`spotbugs`/`pmd`/`checkstyle`), Maven Wrapper, Gradle;
  - npm/pnpm/yarn test/lint/typecheck, pytest, go test/vet, cargo test/clippy, dotnet test/build.
- Security additionally gets Maven CycloneDX/versions/dependency-analyze and Gradle dependency reports.
- Reviewer/security prompts now require independent reproduction (command + exit code + output), forbid relying solely on engineer evidence, forbid deploy/release/install/publish/commit, and require `BLOCKED` on permission denial instead of shell bypass.
- `audit-team-consistency.mjs` now checks reviewer/security Maven and `git -C` capabilities (91 checks).

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 91 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.

## [1.2.8] - 2026-11-05

### Fixed

- DevOps was denied `edit` on `.ai-team/work/TASK-GIT-*-EVIDENCE.md` even though the checkpoint policy requires DevOps to write that evidence. Added `edit .ai-team/work/*EVIDENCE.md -> allow`.
- The denied DevOps agent worked around the edit permission with a PowerShell here-string/`Set-Content` via shell. That bypass is now explicitly forbidden in the DevOps/QA/Writer prompts (“edit/write 被拒时返回 BLOCKED，不要用 shell 绕过”), and documented as a residual risk in `GIT-POLICY.md`.
- `audit-team-consistency.mjs` now checks that DevOps can write `work/*EVIDENCE.md` without shell bypass (87 checks).
- **Installer no longer moves `agents/ai-team` or skill directories**: on Windows, a running OpenCode service holds read handles and `Move-Item` fails with `MoveDirectoryItemIOError`. The installer now copies a backup and syncs files one by one, so `publish` can run while OpenCode is open.

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/verify.mjs --installed` → 184/184.
- `node scripts/audit-team-consistency.mjs` → 87 checks, 0 failed.
- `node scripts/version.mjs --update` succeeded while OpenCode was running.

## [1.2.7] - 2026-11-05

### Fixed

- `/ai-resume` under Chief produced a burst of `Permission denied: shell` on riccon-ai:
  - `git status --short 2>&1; echo ...` failed because compound commands split and `echo` was not allowlisted;
  - `git -C <project> status --short` failed because only `git status *` was allowed;
  - `Get-Content .ai-team\state\RUN_LOG.md` failed because shell file reads were not allowlisted;
  - `mvn -v` failed because only `mvn -version`/`mvn --version` were allowed;
  - scanning `~/.config/opencode` triggered external-directory approval.
- Chief allowlist now includes `mvn -v *`, `git -C * status/diff/log *`, `Get-Content .ai-team/{state,tasks,team}/*`, `Get-Content .ai-team/*.md`, and `echo *` (harmless).
- Added Chief §11.1 “只读 shell 命令风格”: one command per call, no `;`/`&&`/`2>&1`/`echo` chaining, use `read` for files, no `git -C` unless needed, do not scan `~/.config/opencode`, do not run `mvn`, use known script paths.
- `/ai-resume` now lists the exact preflight commands and the “do not run” list.
- `TROUBLESHOOTING.md` 3.4 documents the symptom, cause and fix.

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 86 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.

## [1.2.6] - 2026-11-05

### Reviewed

Riccon-ai `GROWTH.md` RETRO-0001 (29 done, 17 review reports) produced six proposals. Verdict: P-01/P-02/P-04/P-05 are team-level capability gaps and were implemented; P-03 was already implemented in 1.2.5 but the project has not executed it; P-06 is project cleanup plus a reusable template.

### Added

- **P-01 P1 closure**: `REVIEW.md` now has a P1 closure table (original P1, fix, reproduction command, regression result) and a “new same-class P1” check. Reviewer prompt and G5 checklist require it for fix/regression reviews.
- **P-02 state consistency**: `state-check.mjs` compares `PROJECT.md`/`STATUS.md` track and stage, checks `HANDOFF.md` Git commit against HEAD, and flags legacy `done（...）` statuses. Wired into `/ai`, `/ai-resume`, `/ai-status`, `/ai-handoff`, Chief startup/handoff and the gates.
- **P-04 unique test baseline**: `TEST-REPORT.md` has a canonical baseline block (command, pass/fail/skipped, exclusions, delta, evidence); QA prompt and G4/G5 gates forbid “excluding stale baseline” as a pass criterion.
- **P-05 contract freeze**: task brief now has `契约影响` and `回归范围`; `REVIEW.md` has a contract comparison section; reviewer checks contract diff before implementation; G4/G5 gates require ADR/DEC records for contract changes.
- **P-06 raw-log guard**: `templates/AI-TEAM-GITIGNORE` for `.ai-team/.gitignore`; GIT-POLICY tells projects to copy it before tracking `.ai-team`.
- **G-03 status vocabulary**: `done` means accepted; `review`/`qa` are not done; `done（...）` is legacy. Retro cadence counts `done` prefix for workload, but gates/acceptance count exact `done` only.

### Verified

- `node scripts/verify.mjs` → 192/192.
- `node scripts/audit-team-consistency.mjs` → 82 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `state-check` on riccon-ai after fixing `PROJECT.md` stage → PASS (1 warning: 7 legacy `done（...）` statuses).

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
