# Changelog

All notable changes to the AI Native Engineering Team are documented here.
Format based on Keep a Changelog; versioning follows SemVer.

## [1.10.0] - 2026-11-09

### Added

- **Quality report (`quality-report.mjs`)**: computes the team quality goal from `.ai-team/state/TASKS.md`, `reviews/**`, `security/**` and `qa/**`: first-pass rate, review-ready rate, review rounds, P1 findings and P1 escapes. Outputs Markdown/JSON with data-quality warnings. It is a trend/proxy metric, not a hard gate; a team-source repo without product tasks is reported as `team-source-mode`.
- **CI gate (`.github/workflows/verify.yml`)**: runs on push/PR with `verify`, `test-gates`, `permission-lint`, `artifact-check --strict`, `secret-check`, `review-check` for available reports and `quality-report`; failures block merge. Local and CI use the same commands.

### Changed

- `scripts/test-gates.mjs` adds 10 quality-report fixtures (JSON output, first-pass rate, review-ready rate, review rounds, P1 escape, Markdown escaping, out-of-tree `--out`, strict no-review failure, max-files truncation, strict empty-project failure) → 46/46.
- `docs/TEAM.md` §0.1, `docs/IMPROVEMENT.md` §3.1/§5, `docs/WORKFLOW.md` T-40, `README.md`, `INSTALL.md` and `docs/VERIFICATION.md` §5.43 document the quality report and CI gate.
- Version `1.10.0`; source verify count is now 207 (new script syntax check), installed 197, installed+OpenCode 207.

### Verified

- `node scripts/verify.mjs` → 207/207.
- `node scripts/verify.mjs --root ~/.config/opencode --installed` → 197/197.
- `node scripts/verify.mjs --root ~/.config/opencode --installed --opencode` → 207/207.
- `scripts/test-gates.mjs` → 46/46.
- `audit-team-consistency.mjs` → 195 checks, 0 failed.
- `audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint.mjs` → 570 checks, PASS.
- `artifact-check.mjs --strict --max-files 2000` → 0 error / 0 warning.
- `sourceHash === installedHash` (`a23ece05...`), version `1.10.0`.

## [1.9.4] - 2026-11-08

### Added

- **Verification budget & full-baseline reuse (T-39)**: task briefs now require `验证预算`. Iteration runs V0 static + V1 targeted tests; a V2 full suite runs only once per frozen candidate commit and records `baseline_id = <TASK>-<commit>-<run>` with commit, clean `git status --porcelain`, command, exit code, pass/fail/skip counts and log path. Same candidate commit → 1 baseline; same task → ≤2 by default; a 3rd needs written Chief approval plus `RISK-*`/`DEC-*`.
- **Independent verification without duplicate full runs**: reviewer/QA may reuse a baseline only after checking commit + workspace fingerprint and reading counts, and must independently execute affected-module targeted tests (V1) plus at least one critical-path/integration check. Reports record reused `baseline_id`, reason for not rerunning, and independent commands/exit codes. No independent execution → no pass.
- **Parallel static review**: reviewer may start read-only static review (diff/contracts/test quality) while the engineer runs the final full baseline; independent test execution still waits for the build mutex and only concludes on the frozen candidate. A P1 found statically returns to fix before any full run.

### Changed

- `ai-team-workflow` SKILL §3.10 defines V0–V3, the baseline contract, reuse/rerun triggers and prohibited patterns; §3.5/§6 brief rules add `验证预算`.
- `engineer` §5 adds the verification ladder and baseline registration; `code-reviewer` §3.1/§5/§6 and `qa-engineer` baseline rules define independent execution and reuse; `chief` adds dispatch rules 23/24 and the G5 exit criterion.
- `brief-new.mjs` template and `brief-lint.mjs` value check enforce `验证预算` (targeted + full + commit/fingerprint + reuse/one run) for engineer/reviewer/QA.
- `templates/REVIEW.md`, `templates/TEST-REPORT.md`, `QUALITY-GATES.md` G4/G5/QA, `docs/WORKFLOW.md` (T-21/T-30/T-39) and `README.md` document the baseline contract.

### Verified

- `node scripts/verify.mjs` → 206/206.
- `audit-team-consistency.mjs` → 195 checks, 0 failed.
- `scripts/test-gates.mjs` → 36/36.
- `audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint.mjs` → 570 checks, PASS.
- `sourceHash === installedHash` (`34f78b3c...`), version `1.9.4`.

## [1.9.3] - 2026-11-08

### Added

- **Review-entry contract (P-58/P-57/P-65/P-40)**: engineer briefs now require `Review-entry 自检` (semantic source table ADR/contract → implementation → tests, plus P1 scenarios), `门禁面` (≤2; split if more), `必然受影响测试/脚本` whitelist, and `请求参数断言` for server query/idempotency/filter tasks. `brief-lint` enforces these fields; missing or placeholder values block dispatch.
- **First-review scope (P-61/P-64/P-62)**: `templates/REVIEW.md` adds a Review-entry checklist and a first-round horizontal-surface checklist (production wiring, exception classification, preflight/parsing, permissions, migration, config defaults). `code-reviewer` returns the task without full review when the review-entry table is missing; slice >2 or unapproved cross-role test edits are P1.

### Verified

- `node scripts/verify.mjs` → 206/206.
- `audit-team-consistency.mjs` → 195 checks, 0 failed.
- `scripts/test-gates.mjs` → 32/32.
- `audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint.mjs` → 570 checks, PASS.
- `sourceHash === installedHash` (`9610a87c...`), version `1.9.3`.

## [1.9.2] - 2026-11-08

### Added

- **Team-level quality goal (`docs/TEAM.md` §0/§0.1)**: continuously improve first-pass acceptance while keeping P1 escapes flat, review rounds ≤2 and security coverage unchanged. Definition: only implementation tasks entering review; no R1/R2, reviewer P0/P1=0, no cross-role rework, no checkpoint block. Baseline 56.8%; overall 10-task ≥70%, 30-task ≥80%, long-term ~85%; T1/T2 long-term ≥90%; review-ready 10-task ≥90%. Not a hard gate.
- **`/ai-improve` goal calibration**: every run must first restate the team mission, six goals and the tiered first-pass target from `docs/TEAM.md` §0/§0.1, then proceed; stop only if the request conflicts with a goal. This prevents goal drift without adding a new role or command.

### Changed

- `README.md`, `docs/TEAM.md`, `docs/IMPROVEMENT.md` document the goal, metric definition, targets and guardrails.
- `scripts/audit-team-consistency.mjs` checks that `/ai-improve` restates the goals and that the tiered targets remain documented.

### Verified

- `node scripts/verify.mjs` → 206/206.
- `audit-team-consistency.mjs` → 193 checks, 0 failed.
- `audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint.mjs` → 570 checks, PASS.
- `sourceHash === installedHash` (`486bab87...`), version `1.9.2`.

## [1.9.1] - 2026-11-08

### Fixed

- **Net-zero truth (R5 P2-02, P2-01)**: `growth-check` now derives `last_retro_new` and `team_open_at_last_retro` from the latest RETRO table and the index instead of trusting frontmatter. Stale values are errors, not passes; `last_retro_new` counts raw team additions (including same-round merges/closes); raw new >2 requires an explicit `net_zero_exception` with RETRO id, approval date and reason, and the overage must be closed/merged. `improve-scan` compares `open_proposals` with total open (`openAll`), not team open, removing the false `16 vs 14` mismatch.
- **Evidence scan adaptation (P-44 follow-up, R5 P2-06)**: `artifact-check` and `secret-check` start at 2000 files and auto-escalate to a hard ceiling of 20000 when truncated. `--max-files` is clamped to 20000; `PARTIAL`/exit 3 is used for “still truncated at the ceiling” or “binary/unreadable text skipped”. A project with 2159 text files now passes by default instead of failing with a suggestion to use the default 2000. UTF-16 evidence is decoded before scanning; binary/unreadable text is reported as `credential-scan-skipped`, not a silent pass.
- **Fixtures**: `scripts/test-gates.mjs` covers stale frontmatter, raw new>2, new>closed, same-round merges (with/without exception), missing team-open/closed, malformed exception, carried-over, project scope, `T-*`, archive, auto-escalation, ceiling, UTF-16, binary skip and `--fix`. `verify.mjs` runs it and fails if the fixture file is missing.

### Changed

- `ai-retro`, `SKILL.md`, `docs/IMPROVEMENT.md`, `docs/WORKFLOW.md`, `docs/TEAM.md`, `docs/TROUBLESHOOTING.md`, `README.md` and `INSTALL.md` document the 1.9.1 semantics and 20000 ceiling.
- `checkpoint-check --mark --sync-docs` writes STATUS `Growth` using total open (`openAll`) so “team + project” stays 13, not team-only 11.
- `team-manifest.json` version is `1.9.1`; source verify is `206/206`.

### Verified

- `node scripts/verify.mjs` → 206/206.
- `scripts/test-gates.mjs` → 28/28.
- Review: `REV-IMPROVE-2026-11-08-R6`（含 R1 复审）**通过** (P0=0/P1=0/P2=0; P3 -> `TASK-IMPROVE-2026-11-08-R7`); `SEC-IMPROVE-2026-11-08-R6`（含 R1 复审）**通过** (P0=0/P1=0/P2=0; P3 -> R7).
- `sourceHash === installedHash` (`219f1408...`), version `1.9.1`.

## [1.9.0] - 2026-11-07

### Added

- **Three-tier intake (P-54)**: `ai-retro` now classifies every proposal as `TEAM-CORE`, `PROJECT-PROFILE` or `OBSERVE`. Only `TEAM-CORE` enters the team ledger/open count; project policies go to project `.ai-team/tasks` or the new `profiles/` examples; one-off observations go to `RISKS.md` with a review date.
- **Net-zero rule (P-54)**: each retro may add at most 2 `TEAM-CORE` proposals and no more than it closes/merges. If team open rises two retros in a row, no new proposals are accepted until debt is triaged. `GROWTH.md` frontmatter records `last_retro_new`, `last_retro_closed` and `team_open_at_{last,prev,prev2}_retro`.
- **Scope-aware ledger**: `templates/GROWTH.md` adds a trailing `scope` column (`team`/`project`); missing scope defaults to `team` for backward compatibility. `growth-check` validates scope and reports `teamOpen`/`projectOpen` separately; `open` now means team-core open, with `openAll` for all open rows.
- **Debt dashboard (P-42 absorbs P-30)**: `growth-check --debt` reports team/project open, open-proposal age (average/oldest), duplicate-title clusters and net-zero violations. JSON output includes a `debt` object.
- **Project profile examples**: `skills/ai-team-workflow/profiles/` with `README.md`, `java-spring.md`, `vue.md`, `strict-security.md`; examples are project-agnostic and contain no riccon-specific paths/values.
- **Docs**: `docs/IMPROVEMENT.md` (three-tier/net-zero/debt), `docs/WORKFLOW.md` T-26, `SKILL.md` §3.1/§3.4, README and INSTALL profile guidance.

### Changed

- `ai-retro` and `ai-handoff` now require triage-before-new, scope/owner/acceptance/review date, and `growth-check --debt`; net-zero violations block handoff.
- `improve-scan` now reports team/project open separately (`teamOpen`/`projectOpen`/`openAll`) and no longer flags project-scope debt as a team-index mismatch.
- `GROWTH.md` index adds a trailing `复查日期` column; `growth-check --debt` treats index-only proposals and deferred items without a review date/trigger as errors.
- `scripts/verify.mjs` checks the four profile examples and the GROWTH template's scope/net-zero fields.
- `scripts/audit-team-consistency.mjs` checks three-tier intake, `--debt`, profile examples and project-agnostic profile content; the Windows-path guard now catches both `D:\Development` and `D:\\Development`.
- P-30 is merged into P-42; P-37 is merged into P-50; P-28/P-38/P-48 are routed to project profile.

### Verified

- `node scripts/verify.mjs` → 204/204.
- `audit-team-consistency.mjs` → 191 checks, 0 failed.
- `audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint.mjs` → 570 checks, PASS.
- Fixtures: `scope: project` excluded from team open; duplicate cluster detected; net-zero `new > closed`, `new > 2`, two consecutive rises → FAIL; legacy `schema: 2` ledger still passes.
- Review: `REV-IMPROVE-2026-11-07-R4` + `REV-IMPROVE-2026-11-07-R4-R1` modified pass (P0=0/P1=0; P2-01..05 → `TASK-IMPROVE-2026-11-07-R5`).
- `sourceHash === installedHash` (`4ca6cbe0...`), version `1.9.0`.

## [1.8.7] - 2026-11-07

### Fixed

- **Checkpoint remote truth (P-39)**: `checkpoint-check` now computes `ahead` from `git ls-remote --heads origin <branch>` instead of the local `origin/*` ref. When the remote is unreachable or the remote SHA is not in the local object database, it falls back to the local upstream and prints `local` explicitly; it never reports an inferred value as `git ls-remote`.
- **STATUS state lines (P-51)**: `checkpoint-check --mark --sync-docs` now also generates/refreshes `STATUS.md` `Retro`/`Growth`/`远程` lines (plus the existing `Checkpoint`/`HEAD`), using `GROWTH.md` frontmatter and `growth-check --json`. `ai-retro`/`ai-handoff` require `state-check` after ledger edits; duplicate TASK-ID must not be handed off.
- **Evidence gate (P-46/P-33)**: `brief-new`/`brief-lint` require a `证据门禁` field that names `artifact-check --strict --max-files 2000` and the allowed log paths (`logs/<date>/` or `.ai-team/work/<TASK>-logs/`); root `logs/*.log` and UTF-16 remain hard failures.
- **Runtime evidence and done gate (P-49/P-53)**: briefs for runtime/container/external-dependency tasks must include a `运行时取证` section; single-unit-test green is not accepted as runtime proof. Reviewer/security briefs and `REVIEW.md` add a `Done gate`: P0/P1=0 and every risk-bearing P2 has a `TASK-*`/`RISK-*` owner and close condition, otherwise the task stays in review and cannot be written as done.

### Verified

- `node scripts/verify.mjs` → 195/195.
- `audit-team-consistency.mjs` → 183 checks, 0 failed.
- `audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint.mjs` → 570 checks, PASS.
- Fixtures: checkpoint remote SHA vs stale local ref (remote wins; offline fallback marked `local`); `brief-lint` runtime task without real evidence fails, non-runtime `不适用（无容器/外部依赖）` passes; reviewer brief without Done gate fails.
- Reviews: `REV-IMPROVE-2026-11-07-R2-R1` (modified pass, P0=0/P1=0; P2-07/P2-08 → `TASK-IMPROVE-2026-11-07-R3`).
- `sourceHash === installedHash` (`f85f7995...`), version `1.8.7`.

## [1.8.6] - 2026-11-07

### Changed

- **`/ai-improve` is now analysis-first**: default mode audits GROWTH, AUDIT and sessions, writes a project-side report and stops for explicit user authorization. It does not modify the AI Native source or target-project GROWTH.
- **`--apply` is the authorization/implementation mode**: it reads the latest `TEAM-IMPROVEMENT-*.md`, validates it, and only then updates GROWTH and team source.
- **Risk-based subagents**: `DOCS-ONLY` is build-only; `PATCH` adds code-reviewer; script/permission/security changes add security-auditor; only `FEATURE` uses the full team chain. Analysis mode never calls subagents.
- **Artifact policy**: analysis does not create an AI Native `.ai-team/` directory; implementation may create it locally and must archive/clean it after.
- Updated README, WORKFLOW, TEAM, SKILL and IMPROVEMENT docs for the authorization gate and execution matrix.

### Verified

- `node scripts/verify.mjs` → 195/195.
- installed verify → 187/187; installed + OpenCode → 197/197.
- `node scripts/audit-team-consistency.mjs` → 183 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed.
- `sourceHash === installedHash` (`a652d5f8...`), version `1.8.6`.

## [1.8.5] - 2026-11-07

### Fixed

- **`improve-scan` tool telemetry (P-43)**: when `session_part`/`part` has no tool rows, parse `session_message.data.content` tool items; count `state.status="error"` and `state.error.type="permission.rejected"`; emit `no-tool-data` only when both sources are empty; deduplicate by call id and report the data source. riccon-ai now reports 25,728 tools / 445 errors / 174 permission denials across 231 sessions instead of 0/0/0.
- **`secret-check` coverage and output (P-44 / security P1-01)**: default scan cap 500 → 2000; truncation prints `PARTIAL (truncated)` and exits 3 instead of PASS; invalid `--max-files` exits 2; findings export only `kind/file/line/len/sha256` (no raw `value`), so `--json` and evidence logs cannot re-leak plaintext. `--fix` keeps its internal redaction path.
- **`artifact-check` secret-truncation gate (security P1-02)**: default cap 500 → 2000; a truncated `scanSecrets` result now adds error `secret-scan-truncated` and fails the gate; `state-check`/`checkpoint-check` inherit the error through `checkArtifacts`; invalid `--max-files` exits 2.

### Verified

- `node scripts/verify.mjs` — 195/195; installed verify — 197/197.
- `audit-team-consistency` — 183 checks / 0 failed; `audit-git-permissions` — 10 agents / 0 failed; `permission-lint` — 570 PASS.
- riccon-ai: `artifact-check` 802 evidence / 1,035 secrets / 0 error / 0 warning; `secret-check` 1,035 / 0 findings / PASS; `--max-files 500` → PARTIAL / exit 3; `improve-scan` 25,728 / 445 / 174.
- `sourceHash === installedHash` (`1d45b794...`), version `1.8.5`.
- Reviews: `REV-IMPROVE-2026-11-07` (R2, modified pass, P0=0/P1=0), `SEC-IMPROVE-2026-11-07` (R1, modified pass, P1-01/P1-02 closed).

### Known issues

- `improve-scan` selects the tool source globally: any `session_part` tool row suppresses the message fallback for the whole database; mixed/partial parts can undercount (`RISK-TEAM-003`). Current riccon-ai has 0 `session_part` rows, so the real count is unaffected.
- `secret-check` still silently skips UTF-16/binary/unreadable files, `.jsonl`, and overlong lines; line/value exemptions can miss some forms; `--fix` may over-redact non-findings (`TASK-IMPROVE-2026-11-07-FU3/FU4`, P3 accepted).
- `secret-check` still does not scan `.ai-team/state|tasks|reviews|team` (P3 accepted).
- `improve-scan` has no `--help`; invoking `--help` runs a full scan (P3 accepted).

## [1.8.4] - 2026-11-06

### Fixed

- **`/ai-improve` commit ownership**: corrected the command to say the `build` maintainer commits AI Native team-source changes, while target-project `.ai-team`/GROWTH changes follow that project's checkpoint policy (DevOps when applicable). Push still requires user approval; no `git add -A`.
- **Submit policy wording**: README, WORKFLOW, GIT-POLICY and the `checkpoint-check` action message now distinguish the AI Native maintainer (`build`) from project Chief/read-only roles and DevOps checkpoint ownership.
- **Historical audit refs**: VERIFICATION now marks removed local `.ai-team` evidence as archived outside the repo.
- **Self-modification wording**: README/TEAM now clarify that team agents cannot edit `.opencode/**`; the `build` maintainer implements approved improvements.

### Verified

- `node scripts/verify.mjs` → 195/195.
- installed verify → 187/187; installed + OpenCode → 197/197.
- `node scripts/audit-team-consistency.mjs` → 183 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed.
- `sourceHash === installedHash` (`1d571aae...`), version `1.8.4`.

## [1.8.3] - 2026-11-06

### Changed

- **`/ai-improve` now runs under `build`**: the command is a maintainer workflow for auditing projects and evolving the team, not a project-delivery workflow. `ai-team/chief` remains the runtime orchestrator for `/ai` and `/ai-resume` inside target projects.
- `verify.mjs` and `audit-team-consistency.mjs` now allow the built-in `build` agent as an external command agent.
- README, WORKFLOW, TEAM, SKILL and IMPROVEMENT docs clarify the maintainer vs delivery split.

### Verified

- `node scripts/verify.mjs` → 195/195.
- installed verify → 187/187; installed + OpenCode → 197/197.
- `node scripts/audit-team-consistency.mjs` → 183 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed.
- `sourceHash === installedHash` (`19caa476...`), version `1.8.3`.

## [1.8.2] - 2026-11-06

### Fixed

- **`state-check.mjs` evidence scan cap**: added `--max-evidence-files` (default 2000) and passed it to `checkArtifacts`, matching `checkpoint-check`. Projects with 500+ evidence files no longer get a permanent `scan-truncated` warning from `state-check`; `--strict` semantics are unchanged. Invalid values (`0`, negative, non-numeric) exit 2.

### Verified

- `node scripts/verify.mjs` → 195/195; installed verify → 187/187; installed + OpenCode → 197/197.
- `state-check --project D:\Development\riccon-ai` → 0 warnings (528 files scanned); `--max-evidence-files 5` → truncated warning; `0/-5/abc` → exit 2.
- `node scripts/audit-team-consistency.mjs` → 183/0/0; `audit-git-permissions` → 10/0; `permission-lint` → 570 PASS.
- `sourceHash === installedHash` (`cedf4665...`), version `1.8.2`.

### Known issues

- `artifact-check` itself still defaults to 500 files; use `--max-files 2000` in 500+ evidence projects. The `scan-truncated` suggestion text still points to `--max-files`; tracked as a follow-up.

## [1.8.1] - 2026-11-06

### Added

- **Brief 边界/事务门禁 (P-32/P-34)**: `brief-new.mjs` engineer template now includes `事务边界与部分提交`, `旧行为反证` and `边界四问`; reviewer/QA templates include `边界四问`. `brief-lint.mjs` validates the field **value** (not just the label) and rejects empty/`<...>`/`N/A`/`不适用` values for transaction tasks and reviewer/QA boundary checks.
- **Checkpoint 远程行 (P-35)**: `checkpoint-check --mark --sync-docs` now writes `HANDOFF.md` `- 远程：` from `origin`, branch, upstream, ahead and upstream SHA; it strips URL userinfo and query/fragment before writing.
- **Evidence scan cap (P-36)**: `checkpoint-check` now accepts `--max-evidence-files` (default 2000), aligned with `artifact-check --strict --max-files 2000`; 500+ evidence projects no longer get a permanent `scan-truncated` warning.

### Fixed

- **P1 (security)**: origin URL userinfo (e.g. `https://user:token@host/...`) is no longer written into the tracked `HANDOFF.md`; CR/LF and backticks are sanitized to keep the Markdown line intact.
- **Atomic checkpoint sync**: `--mark --sync-docs` validates and computes HANDOFF/STATUS content before writing; preflight failure exits 3 with zero writes; apply failure rolls back `CHECKPOINT.json` and cleans temp files.
- **Duplicate remote lines**: existing duplicate `- 远程：` lines are collapsed to one.
- **Invalid `--max-evidence-files`**: `0`, negative or non-numeric values exit 2 instead of silently disabling evidence scanning.

### Known issues

- `secret-check` still does not scan `.ai-team/state/**` for URL userinfo; the remaining gap and narrow no-scheme/whitespace URL forms are tracked in `TASK-IMPROVE-2026-11-06-SEC-R1` and `RISK-TEAM-001/002`. 1.8.1 closes the common scheme/protocol-relative/query leak path but does not claim full coverage.
- Fixtures live under `.ai-team/work/**` (gitignored) and are not shipped with the package; CI cannot run them yet.

### Verified

- `node scripts/verify.mjs` → 195/195.
- installed verify → 187/187; installed + OpenCode → 197/197.
- `node scripts/audit-team-consistency.mjs` → 183 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed.
- `run-fixtures.mjs` → 148 PASS / 0 FAIL (sequential 2× and parallel 2×).
- `sourceHash === installedHash` (`b6919825...`), version `1.8.1`.

## [1.8.0] - 2026-11-06

### Changed

- **`team-shell.mjs` downgraded from mandatory gateway to optional structured runner**: it provides parameter validation, cross-platform build mapping and structured logs, but is not a permission boundary. Direct shell commands are allowed under Shell-first; `permissions.json.gateway` only applies when calling `team-shell`.
- `/ai` and `/ai-resume` now run `permission-lint.mjs` directly instead of validating the gateway through the gateway.
- New scripts are directly executable by default; gateway registration is only needed when parameter validation, unified logging or cross-platform mapping is required.
- README, SKILL, TEAM, WORKFLOW, QUALITY-GATES, `permissions.json`, `permission-lint` and `audit-team-consistency` wording updated to remove mandatory-gateway language.

### Verified

- `node scripts/verify.mjs` → 195/195.
- installed verify → 187/187; installed + OpenCode → 197/197.
- `node scripts/audit-team-consistency.mjs` → 183 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed.
- `sourceHash === installedHash` (`c14718e2...`), version `1.8.0`.

## [1.7.0] - 2026-11-06

### Added

- **`/ai-improve <project>`**: cross-project continuous optimization command. Reads the project's `GROWTH.md`, `AUDIT.json`, latest session audit and delivery evidence; runs `improve-scan.mjs`; decides `NO-OP / DOCS-ONLY / PATCH / FEATURE / ROLE-GAP / DEFER`; asks for approval before changing the team source; syncs version, commands, docs and verification after implementation.
- **`improve-scan.mjs`**: read-only evidence scanner for project GROWTH/TASKS/AUDIT and OpenCode sessions. Supports current `session`/`part` and legacy `session_v2`/`session_part` schemas; reports sessions, messages, tokens, tool calls/errors, permission denials, role distribution and signals.
- **`docs/IMPROVEMENT.md`**: continuous-improvement strategy based on PDCA/Kaizen, DORA, SRE postmortems, Diátaxis and SemVer, with cadence, thresholds, proposal lifecycle, rollback/observation windows and anti-patterns.

### Changed

- Command count is now 13; manifest, README, INSTALL, WORKFLOW, TEAM, BEST-PRACTICES and verification counts updated.
- `audit-team-consistency` now checks the improve command, scanner script and strategy doc.

### Verified

- `node scripts/verify.mjs` → 195/195.
- installed verify → 187/187; installed + OpenCode → 197/197.
- `node scripts/audit-team-consistency.mjs` → 183 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed.
- `improve-scan` against riccon-ai → 31 proposals (3 open) and 185 sessions scanned.
- `sourceHash === installedHash` (`cca06fd0...`), version `1.7.0`.

## [1.6.1] - 2026-11-06

### Fixed

- **Documentation consistency**: replaced stale 1.4.x/1.5.x instructions that told readers to add `edit`/`subagent`/`task` permission rules or expect `ask`; current model is Shell-first with only destructive shell `deny` and process-level role boundaries.
- Corrected verification counts in README/INSTALL/VERIFICATION (`189/189` source, `181/181` installed, `191/191` installed + OpenCode).
- Replaced maintainer-specific paths with `<path-to-this-repo>`; clarified `.env`/`.env.*` read allow versus `.ssh`/`.aws` platform/OS permissions.
- Documented `RESTART REQUIRED` after `version.mjs --update`, `checkpoint-check --mark --sync-docs`, and `secret-check` in the checkpoint/evidence paths.
- Removed stale "one command at a time" guidance; compound shell is allowed under Shell-first.

### Verified

- `node scripts/verify.mjs` → 189/189.
- installed verify → 181/181; installed + OpenCode → 191/191.
- `node scripts/audit-team-consistency.mjs` → 177 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed.
- `sourceHash === installedHash`, version `1.6.1` (recorded in VERIFICATION.md).

## [1.6.0] - 2026-11-06

### Added

- **Brief generator (`brief-new.mjs`, P-24)**: produces the standard brief skeleton with `脚本参数` ("以 `<script> --help` 实跑为准") and `契约影响` (section/field references only), so Chief no longer hand-copies CLI flags or contract definitions.
- **Brief lint hardening (P-24/P-25)**: `brief-lint` now requires `脚本参数`, `契约影响`, `证据位置` with UTF-8, and all existing role-specific fields.
- **Checkpoint doc sync (`checkpoint-check --sync-docs`, P-26)**: after `--mark`, updates HANDOFF `Git`/`Baseline` and STATUS `Checkpoint` automatically; `--mark --sync-docs` does both in one step.
- **Evidence redaction (`secret-check.mjs`, P-27)**: scans `qa/**`, `work/**`, `release/**`, `security/**` and `logs/**` for plaintext `Set-Cookie`/`Authorization`/Cookie/password/token; `--fix` replaces values with `<redacted len=NN sha256=...>`. `artifact-check`, `state-check`, `checkpoint-check --mark`, and `review-check` now block plaintext credentials.
- **Version handshake (P-29)**: `version.mjs --update` prints `RESTART REQUIRED`; `/ai` and `/ai-resume` warn that old sessions may still use cached permissions.

### Changed

- All agent shell guidance now requires UTF-8 logs and evidence redaction; non-destructive `Permission denied` should be investigated as an old-session/version issue, not bypassed by widening allows.
- Test/review/security templates now include a redaction check.
- Documentation updated for brief generation, checkpoint sync, secret scan, and restart-after-update.

### Risk

- Same as 1.5.1: agents can edit files, commit, publish, and read secrets; only destructive shell commands are denied. Role boundaries remain process conventions.

### Verified

- `node scripts/verify.mjs` → 189/189.
- installed verify → 181/181; installed + OpenCode → 191/191.
- `node scripts/audit-team-consistency.mjs` → 177 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed; `--role chief` → 57 checks, 0 failed.
- `brief-new` + `brief-lint` fixture → PASS (QA and reviewer).
- `secret-check` fixture → 3 findings → 0 after `--fix`; riccon-ai 360 files → 0 findings.
- `checkpoint-check --mark --sync-docs` fixture → HANDOFF/STATUS synced; `state-check` PASS.
- `version.mjs --update` printed `RESTART REQUIRED`.
- `sourceHash === installedHash` (`af44686d...`), version `1.6.0`.

## [1.5.1] - 2026-11-06

### Changed

- **Minimal agent permissions**: every agent now has exactly 44 rules: 42 shell rules (1 `* -> allow` + 41 destructive `deny`) and 2 `.env` `read` allow rules.
- Removed all non-shell agent rules: 15 `read` rules per role, 10–61 `edit` rules per role, and `task`/`subagent`/`question`/`external_directory` rules.
- `read`/`edit`/`task`/`subagent`/`external_directory` are no longer restricted at agent level; role boundaries remain prompt/process conventions.
- `.env`/`.ssh`/`.aws` reads are allowed; the agent `.env` allow overrides the base `ask`.

### Risk

- Same as 1.5.0, expanded: agents can edit any file, spawn subagents, ask questions, and read secrets. Only destructive shell commands are denied. Use OS ACL/container isolation for hard boundaries.

### Verified

- `node scripts/verify.mjs` → 187/187.
- installed verify → 179/179; installed + OpenCode → 189/189.
- `node scripts/audit-team-consistency.mjs` → 158 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 570 checks, 0 failed; `--role chief` → 57 checks, 0 failed.
- `permission-doctor` matrix → 20/20 cases.
- Every agent: 44 permission rules (42 shell + 2 `.env` read allow).
- `sourceHash === installedHash` (`6429010b...`), version `1.5.1`.

## [1.5.0] - 2026-11-06

### Changed

- **Shell-first strict**: all 10 roles now have exactly one `shell * -> allow` plus 41 destructive-command `deny` rules. `ask = 0`.
- Removed all non-destructive shell restrictions: read-only role Git guards, `git add -A`/`git add .`, publish/deploy deny/ask, `.env`/`.ssh`/`.aws` shell reads, remote/restore/worktree `ask`.
- Only destructive commands remain denied: reset/clean/restore/checkout discard, force push/mirror/delete, history rewrite, branch/tag/stash/worktree deletion, `rm -rf`/`Remove-Item -Recurse`, prune/destroy/delete.
- `permission-lint` now checks default allow, 41 destructive denies, non-destructive allow, and the strict guidance block; 687 checks.
- `audit-git-permissions` now enforces “no non-destructive shell restriction” per agent.
- `permission-doctor` only recommends against widening destructive-command denies.

### Risk

- Shell can now commit/push/publish and read `.env`/keys. Role boundaries are process-only and no longer permission-enforced. Use OS ACL/container isolation if hard boundaries are required.

### Verified

- `node scripts/verify.mjs` → 201/201.
- installed verify → 193/193; installed + OpenCode → 203/203.
- `node scripts/audit-team-consistency.mjs` → 183 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 687 checks, 0 failed; `--role chief` → 78 checks, 0 failed.
- `permission-doctor` matrix → 20/20 cases (commit/push/publish/.env/add -A allow; destructive deny).
- `sourceHash === installedHash` (`8a1e0dc3...`), version `1.5.0`.

## [1.4.2] - 2026-11-06

### Changed

- **Shell-first permissions**: every role now defaults to `shell: allow`; compound commands (`;`, `&&`, `||`, `2>&1`), pipelines, and multi-line commands are no longer denied by policy. This removes the 60 compound-command rejections and the 26 `Get-ChildItem` rejections observed in recent riccon-ai sessions.
- **Safety boundary kept**: destructive history/workspace commands, publish/deploy actions, common `.env`/secret reads, and `git add -A`/`git add .` remain denied. `git commit`/`git push` remain `ask` for Engineer/DevOps/Writer and `deny` for read-only roles.
- **Read-only role guards**: Chief, PM, UX, Architect, Reviewer, and Security cannot use shell to `git add`/`commit`/`push`/`tag`.
- **`permission-lint`**: now checks default shell allow, the safety deny set, read-only git guards, bulk-add protection, and the Shell-first guidance block; 398 checks.
- **`permission-doctor`**: compound-command advice replaced with Shell-first diagnostics that distinguish safety, read-only, and secret denials.

### Verified

- `node scripts/verify.mjs` → 201/201.
- installed verify → 193/193; installed + OpenCode → 203/203.
- `node scripts/audit-team-consistency.mjs` → 250 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 398 checks, 0 failed; `--role chief` → 52 checks, 0 failed.
- `permission-doctor` matrix → 24/24 cases (compound/npm/Get-ChildItem allow; secret/destructive/bulk-add deny; publish deploy ask for DevOps).
- `sourceHash === installedHash` (`a0c1dca3...`), version `1.4.2`.

## [1.4.1] - 2026-11-06

### Fixed

- **P-23 / RISK-0062**: `team-shell` audit logs now go to `.ai-team/work/team-shell-logs/TEAM-SHELL.log` instead of the work root, so `artifact-check` no longer reports `raw-log-location` and T4 `--strict` can pass. The fixed gateway was installed before moving the existing log, preventing recreation at the old path.
- riccon-ai also converted the remaining UTF-16 `TASK-0023-logs/01-install-arco.log`; `artifact-check --strict` now reports 0 errors / 0 warnings.

### Verified

- `node scripts/verify.mjs` → 201/201.
- installed verify → 193/193; installed + OpenCode → 203/203.
- `node scripts/audit-team-consistency.mjs` → 264 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- riccon-ai `artifact-check --strict` → 0 error / 0 warning.
- riccon-ai `growth-check --strict` → 23 proposals, done 23, open 0.
- riccon-ai `state-check` → PASS, 0 error / 0 warning.

## [1.4.0] - 2026-11-06

### Added

- **T-35 `team-shell` gateway**: a single structured command entry for git reads, build/test/package/verify, dependency/secret/SAST scans, and team scripts. Actions are declared per role in `permissions.json.gateway`; the gateway uses argument arrays and never invokes a shell for its own actions. `git add`/`commit`/`push` remain direct role permissions because they require `ask`.
- **Per-role gateway allow**: every agent can only invoke `node *team-shell.mjs --role <its-role> *`; a Chief cannot invoke the QA/DevOps gateway role, and vice versa.
- **Gateway audit log**: every call appends role/action/command/exit/duration to `.ai-team/work/TEAM-SHELL.log`.
- **Gateway preflight adoption**: `/ai` and `/ai-resume` now run `script.permission-lint` and `script.growth-check` through the Chief gateway.
- **Safety guards**: action allowlist from the matrix, safe module/test/revision formats, `--dry-run`, 30-minute timeout, and no arbitrary script names.

### Verified

- `node scripts/verify.mjs` → 201/201.
- installed verify → 193/193; installed + OpenCode → 203/203.
- `node scripts/audit-team-consistency.mjs` → 264 checks, 0 failed.
- `node scripts/audit-git-permissions.mjs` → 10 agents, 0 failed.
- `permission-lint` → 211 checks, 0 failed; `--role chief` → 31 checks, 0 failed.
- `team-shell` actual: riccon-ai `build.compile` → BUILD SUCCESS, exit 0, 8.0s.
- `team-shell` dry-run: QA `build.test` → `mvn.cmd -B -pl server -am test -Dtest=M1HappyPathE2ETest`.
- `team-shell` deny: Chief `build.test` → `action not allowed for chief`.

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
