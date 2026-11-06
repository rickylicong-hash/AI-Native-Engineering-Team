---
name: AI Team Workflow
description: AI Native 工程团队的共享操作系统：Track 分类、G0–G8 门禁、.ai-team 状态与证据协议、任务 brief、交接与复盘。Chief 与所有成员在开始任务前加载。
---

# AI Team Workflow

这是团队的共享流程与记忆协议。任何角色开始任务前先读本技能；Chief 在每次会话启动时加载。

## 1. 一条指令如何变成交付

```text
用户一句话
  → Chief intake（Track 分类 / 约束 / 成功指标 / 假设）
  → 产品定义（PRD / AC）
  → 体验与架构（UX / ADR / 契约 / 威胁模型 / 测试策略）
  → 任务 DAG（owner / 依赖 / 验收 / 证据）
  → 实现（engineer，多实例按模块并行）
  → 代码审查 + 安全审计（并行，只出报告）
  → QA 独立验证（覆盖矩阵 / 缺陷 / 回归）
  → 发布（CI / 部署 / 冒烟 / 回滚 / 监控）
  → 文档 + 复盘 + HANDOFF
```

Chief 不替任何角色执行专业工作；角色不替 Chief 做门禁决定。

## 2. Track 分类

| Track | 何时用 | 最小流程 | 最小产物 |
|---|---|---|---|
| **T0 Spike** | 调研、可行性、原型、回答“能不能” | Intake → Investigate → Peer Review → Report | `PROJECT.md`、调研 memo、结论/风险 |
| **T1 Patch** | Bug、小改动、单模块优化 | Intake → Fix → Code Review → Test → Done | `TASK-*`、diff、审查、测试证据 |
| **T2 Feature** | 现有产品加功能 | Intake → Product-lite → Design-lite → Build → Review → Test → Security check | PRD-lite、设计 note、任务、审查、测试 |
| **T3 Product** | 从零做产品/MVP/重大子系统 | G0–G8 | 全套 |
| **T4 Critical** | 生产关键/合规/多租户/支付/医疗/规模化 | G0–G8 + 威胁建模/合规/性能/容灾/UAT/灰度 | 全套 + 专项证据 |

判定不确定时取较低 Track；发现证据不足再升级。T0 不改生产代码。

## 3. 门禁 G0–G8

> T3/T4 在 G4→G5、G6→G7、G7→G8 前，以及每完成 10 个任务、P0/P1 事故后，先执行 3.1 的复盘检查。到期未做，门禁不算通过，也不开始新的功能任务。

### G0 Intake

**Owner:** Chief

出口：

- 用户原话、目标、Track、范围/非范围；
- 成功指标（可度量）；
- 约束（技术/合规/预算/时间/环境）；
- 假设与初始风险；
- 写入 `state/PROJECT.md`。

### G1 Product

**Owner:** Product Manager

出口：

- PRD：问题、用户、场景、FR/NFR（ID）、验收、优先级、开放问题；
- 用户故事 + Given/When/Then；
- 范围/非范围；
- 追踪矩阵初稿；
- Chief 接受（不是产品经理自批）。

### G2 Design

**Owner:** UX + System Architect

出口：

- UX：流程、IA、UI 规格、状态、设计 token、可访问性（如涉及界面）；
- 架构：模块边界、数据模型、API/事件契约、失败模式、部署拓扑；
- ADR：关键取舍；
- 安全：威胁模型草案、信任边界；
- QA：测试策略、可测试性评审；
- 跨角色评审结论：通过/修改后通过/不通过。

### G3 Plan

**Owner:** Chief

出口：

- 任务 DAG：`TASK-*`、owner、依赖、验收、证据要求；
- 每个 FR/NFR 至少映射到一个任务/测试；
- 文件所有权切分（并行任务不冲突）；
- 风险/阻塞/回退计划；
- 写入 `state/TASKS.md`。

### G4 Build

**Owner:** Engineer

出口：

- 代码 + 单元测试；
- lint/typecheck/build 通过；
- 契约一致、迁移安全；
- 无越权改动；
- 每个任务有证据（命令/退出码/输出）；
- 代码审查请求已提交。

### G5 Verify

**Owner:** Code Reviewer + QA

出口：

- 代码审查：通过/修改后通过/不通过；P0/P1 关闭；
- QA：覆盖矩阵、测试报告、缺陷关闭/接受；
- E2E/性能/可访问性按 Track；
- 无未关闭阻断缺陷；
- 证据齐全。

### G6 Secure

**Owner:** Security Auditor

出口：

- 威胁模型更新；
- 设计/代码/依赖/密钥/IaC/容器/发布安全检查；
- 无未关闭 Critical/High；
- Medium 有修复计划或用户书面接受；
- 供应链（lockfile/SBOM/许可证）结论。

### G7 Release

**Owner:** DevOps

出口：

- CI 全绿；
- 部署/升级/回滚命令可执行；
- staging 冒烟通过；
- 监控/告警/runbook 就绪；
- 数据迁移/备份/回滚验证；
- 生产发布有用户明确批准（L3）；
- `REL-*` 记录。

### G8 Operate & Retro

**Owner:** Chief

出口：

- 发布后健康检查/监控窗口；
- 事故/异常处理；
- 完整复盘（`team/GROWTH.md`）；
- 遗留项进入 backlog/风险；
- `HANDOFF.md` 更新。

### 3.1 复盘节奏（Retro Cadence，强制）

复盘不是发布后的可选项。满足任一条件即**到期**，产物统一追加到 `.ai-team/team/GROWTH.md`：

| 触发 | 时点 | 类型 |
|---|---|---|
| 首次 10 个 done | 第 10 个任务完成时 | 轻量 |
| 每新增 10 个 done | 第 20/30/40… 个任务完成时 | 轻量 |
| 门禁切换 | T3/T4 进入 G5、G7、G8 前 | 轻量；G8 为完整 |
| 事故/回滚 | P0/P1 事故、hotfix、rollback 后同一会话 | 轻量 |
| 重复问题 | 同类问题第 2 次出现 | 轻量 |
| 交接 | `/ai-handoff` 前，若上述任一到期 | 轻量 |
| 用户 | `/ai-retro` | 按范围 |

**计数口径：**

- 只数 `state/TASKS.md` 表格中状态列以 `done` 开头的行（含 `done（待确认）`）；
- `superseded` 不算；返工行（`-R1`/`-R2`）算，因为它们代表真实完成的工作；
- 同一 TASK-ID 只算一次；
- 最近一次复盘的任务数写入 `team/GROWTH.md` frontmatter 的 `tasks_at_last_retro`。

**硬规则：**

1. 到期未复盘 → **不得开始新的功能任务，不得把门禁标为通过**；先做轻量复盘（10–20 行即可）。
2. 首次到期时创建 `team/GROWTH.md`；未到期不创建空文件。
3. 复盘追加新条目，不覆盖历史；只更新 frontmatter 的 `last_retro`、`last_gate`、`tasks_at_last_retro`、`next_due_at`。
4. 改进提案必须有 ≥2 次证据；一次性问题写 `RISKS.md`，不写 GROWTH。
5. 只写提案，不改 `.opencode/**`；团队变更需用户批准。
6. 轻量复盘三段：保留什么 / 哪里疼（证据）/ 一个最小改动。完整复盘（G8）另加指标与 per-role 评估。
7. **每条提案必须登记到“提案处置索引”**：新增为 `proposed`；处置后同一轮回填 `done/rejected/superseded` + 落地版本/任务 + 证据 + 日期。未处置项保持 `proposed/accepted/in_progress/deferred/partial`。
8. 复盘、交接、门禁前运行 `growth-check`；有缺失状态不得交接。全部处置且非最近一轮的 RETRO 可用 `growth-check --archive --yes` 归档到 `team/archive/`。
9. 归档不删除历史：主文件保留索引和归档导航，完整原文进 `team/archive/GROWTH-<year>.md`。

**检查命令（随本 skill 安装）：**

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\retro-check.mjs" --project .
```

```bash
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/retro-check.mjs" --project .
```

退出码：`0` 未到期，`1` 到期，`2` 没有 `.ai-team`，`3` 解析失败。路径不存在时，按上面的计数口径手工统计 `TASKS.md`；设置了 `XDG_CONFIG_HOME` 时，把 `~/.config/opencode` 换成 `$XDG_CONFIG_HOME/opencode`。

### 3.2 Checkpoint 提交（强制委派）

Checkpoint 由 `ai-team/devops-engineer` 执行；Chief 只提供明确路径、TASK-ID、角色和 message。满足任一条件即到期：

| 触发 | 阈值 |
|---|---|
| 工作区未提交文件 | ≥20 个（默认，可用 `--max-files` 调整） |
| 门禁 | 进入 G5/G7/G8 前 |
| 交接 | 写 `HANDOFF.md` 前（`--handoff`） |
| 任务节奏 | 已有 `CHECKPOINT.json` 基线后，每 10 个 `done` |
| 用户 | 明确要求 |

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\checkpoint-check.mjs" --project .
```

提交成功后由 DevOps 运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\checkpoint-check.mjs" --project . --mark --sync-docs
```

规则：

1. 到期未提交 → 不进入门禁，不交接；先派 DevOps。
2. **Chief 不得自己 `git add`/`git commit`/`git push`**；`git add` 也是 DevOps 的职责。
3. 只提交精选路径，禁止 `git add -A` / `git add .`；不提交 `work/**`、日志、截图、tmp、未脱敏安全报告。
4. 用户要求暂不提交时，在 `HANDOFF.md` 写 `Checkpoint: WAIVED`、原因和 `RISK-*`。
5. 提交后更新 `state/CHECKPOINT.json`（`--mark`），push 仍需用户批准。
6. `checkpoint-check` 同时扫描根目录产物（`*.log`、`target-*`、`*.class` 等）和证据编码；有 error 时 `--mark` 拒绝。先把日志移到 `logs/` 或 `.ai-team/work/<TASK>-logs/`，不要用 `.gitignore` 掩盖。
7. **checkpoint 收口（P-18/P-26）**：优先用 `checkpoint-check --mark --sync-docs`；它会把 `HANDOFF.md` 的 `Git`/`Baseline` 和 `STATUS.md` 的 `Checkpoint` 同步到该 commit。随后提交纯文档同步并运行 `state-check`。`TASK-GIT-*` 证据必须包含 `state-check` PASS；未同步不算 checkpoint 完成。若本次包含 `GROWTH.md` 变更，先运行 `growth-check`，有缺失处置状态时退回 Chief。

### 3.3 状态一致性检查

在会话启动、交接和门禁前运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\state-check.mjs" --project .
```

检查：

- `PROJECT.md` 的 track/stage 与 `STATUS.md` 是否一致；
- `STATUS.md` 是否有 `Retro:` / `Checkpoint:` 行；
- `HANDOFF.md` 的 Git commit 是否等于当前 HEAD；
- `TASKS.md` 是否还在用 `done（...）` 旧状态；
- 根目录是否有 `*.log`、`target-*`、`*.tmp`、`*.class`、`io/org/com` 误落盘目录；
- `logs/**` 与 `.ai-team/work/**` 的证据日志是否为 UTF-16/不可解析编码。

`state-check` 已内置 artifact 检查；也可单独运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\artifact-check.mjs" --project .
```

有 error（stage/track 不一致、根目录产物、不可读证据等）时，**不得交接、不得把门禁标为通过**；先修正状态文件或清理产物。`--strict` 会把 warning 也变成失败。

### 3.4 成长档案处置与归档（1.3.0）

`team/GROWTH.md` 的“提案处置索引”是**唯一状态源**，每条提案必须有一行：

| 字段 | 说明 |
|---|---|
| `ID` | 项目提案 `P-*`；团队变更建议用 `T-*`，避免与历史编号冲突 |
| `RETRO` | 来源复盘 |
| `状态` | `proposed` / `accepted` / `in_progress` / `deferred` / `partial` / `done` / `rejected` / `superseded` |
| `落地版本/任务` | `done` 必填，如 `1.3.0` 或 `TASK-0048` |
| `证据` | `done`/`rejected` 必填，如 `CHANGELOG.md#130`、`TASK-*-EVIDENCE.md` |
| `更新日期` | `done`/`rejected` 必填 |

检查命令：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\growth-check.mjs" --project .
```

规则：

- 默认只把“索引缺失/状态非法/终端缺证据”视为 error；未处置提案只报 open；
- `--strict` 把未处置提案也算失败，可用于 G8 或用户要求；
- `--archive` 只输出归档计划；`--archive --yes` 才移动“全部提案已处置且非最近一轮”的 RETRO 到 `team/archive/GROWTH-<year>.md`；
- 归档后主文件保留索引与归档导航，不删除历史；
- 复盘、交接、门禁前运行 `growth-check`；本轮处置过的提案必须同一轮回填，不得留到下一次会话。

### 3.5 Shell 与 brief 预检（1.3.1；1.6.0 Shell-first strict）

**Shell 策略：**

- 所有角色 shell 默认允许所有普通命令，包括管道、`;`、`&&`、`||`、`2>&1`、多行命令、`git commit`/`git push`、发布/部署和 `git add -A`；
- 读单个文件优先用 `read`，列目录用 `glob`，搜内容用 `grep`；这是效率建议，不是权限要求；
- 只有破坏性命令 deny：`git reset --hard`、`git clean`、`git restore`/`checkout --`、force push/mirror/delete、history rewrite、删除分支/worktree、`rm -rf`、`Remove-Item -Recurse`、prune/destroy/delete；
- `.env`/密钥、commit/push、publish/deploy 不再由 shell 权限拦截；仍按 brief 和流程约束；
- 写日志/证据必须 UTF-8：PowerShell 5.1 下 `Tee-Object`、`*>` 可能生成 UTF-16；统一用 `Out-File -Encoding utf8`（或 `$PSDefaultParameterValues['Out-File:Encoding']='utf8'`）；
- 证据中的 `Set-Cookie`/`Authorization`/`Cookie`/口令/token 必须脱敏；提交前跑 `secret-check.mjs`；
- 收到 `Permission denied` 时：若命令不是破坏性操作，先检查是否旧会话/旧版本（`version.mjs`），新开会话；不要为了绕过它扩大 allow。

**Brief 生成 + 预检：**

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-new.mjs" `
  --task TASK-xxxx --agent ai-team/qa-engineer --out .ai-team/tasks/TASK-xxxx-BRIEF.md
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-lint.mjs" `
  --brief .ai-team/tasks/TASK-xxxx-BRIEF.md --agent ai-team/qa-engineer
```

缺 `脚本参数`、`契约影响`、`独立验证`、`证据位置`（含 UTF-8）、QA `测试路径`、Reviewer/Security `P2 处置` 或 `构建隔离` 时，不得派发 subagent。脚本参数一律写“以 `<script> --help` 实跑为准”，契约只引章节号/字段名，不复制定义。

**报告门禁：**

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\review-check.mjs" `
  --report .ai-team/reviews/REV-xxxx-TASK-xxxx.md --kind review --strict
```

Review/Security 报告必须有 `## 独立验证`、实际命令和退出码；只有 `RISK-*` 的报告不能关闭 P1/安全项。报告自身也不得含明文 Cookie/Authorization/口令/token；`review-check` 会调用 secret 扫描。

**证据脱敏：**

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\secret-check.mjs" --project .
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\secret-check.mjs" --project . --fix
```

`artifact-check` / `state-check` / `checkpoint-check --mark` 已内置同一扫描；明文凭据会阻断。

### 3.6 会话审计水位（1.3.1）

全量审计结束后，用 `audit-state.mjs --mark` 记录审计时间和已覆盖的最大会话/消息时间戳：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\audit-state.mjs" `
  --project . --mark --report .ai-team/team/TEAM-USAGE-AUDIT-YYYY-MM-DD.md `
  --scope <worktree> --session-count 152 `
  --last-session-created <ms> --last-session-updated <ms> --last-message-time <ms>
```

下次审计只处理：

- `session_v2.time_created > last_audited_session_created_ms`
- `session_v2.time_updated > last_audited_session_updated_ms`
- `session_message.time_created > last_audited_message_ms`

查看水位：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\audit-state.mjs" --project . --status
```

### 3.7 权限矩阵与诊断（1.6.0）

权限的单一事实源是 `skills/ai-team-workflow/permissions.json`；shell 默认 allow，新增安全边界时优先加到矩阵/agent 的 deny，而不是逐条补 allow。

```powershell
# 全量校验
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\permission-lint.mjs"

# 启动/恢复前只校验当前角色
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\permission-lint.mjs" --role ai-team/chief

# 遇到 permission.rejected 时定位
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\permission-doctor.mjs" `
  --agent ai-team/chief --command "<完整命令>"
```

规则：

- 新脚本/命令默认已由 shell-first 覆盖；只有破坏性命令需要 deny；
- `permission-lint` 必须 PASS，才允许安装或开始 `/ai` / `/ai-resume`；
- shell 不再使用 `ask`；出现 `ask` 说明配置过期；
- 不要为了绕过破坏性 deny 扩大 `node *`/`git *`；复合命令允许。

### 3.8 统一命令网关（1.4.0）

读取/构建/测试/扫描/团队脚本优先走 `team-shell.mjs`；它把“角色 + 动作”映射为参数数组，不经过 shell。

```powershell
# 团队脚本
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\team-shell.mjs" `
  --role chief --action script.growth-check --project .

# Reviewer 跑测试
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\team-shell.mjs" `
  --role code-reviewer --action build.test --project . --module server --test FooTest

# Security 跑依赖扫描
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\team-shell.mjs" `
  --role security-auditor --action scan.dependency --project .

# 只看将要执行的命令
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\team-shell.mjs" `
  --role chief --action build.test --project . --dry-run
```

规则：

- 角色只能使用 `permissions.json` 的 `gateway` 动作；
- 不支持任意脚本名/任意 shell 参数；测试类、模块、revision 有格式校验；
- `git add`/`commit`/`push` 等写操作不再由 shell 权限拦截；仍按 brief、ownership 和 checkpoint 流程执行；
- 每次调用写 `.ai-team/work/team-shell-logs/TEAM-SHELL.log`；
- 新增动作：先改 `permissions.json` 的 `gateway`，再改 `team-shell.mjs`，然后 `permission-lint`；
- 直接的 `node *script.mjs*` allow 为兼容保留；新命令/新脚本一律走 gateway，后续版本再移除直接 allow。

## 4. 目录与产物

```text
.ai-team/
  README.md
  .gitignore         # 从 templates/AI-TEAM-GITIGNORE 复制（跟踪 .ai-team 时）
  state/
    PROJECT.md
    STATUS.md
    TASKS.md
    DECISIONS.md
    RISKS.md
    HANDOFF.md
    RUN_LOG.md
    CHECKPOINT.json
  product/
    PRD.md
    USER-STORIES.md
    ACCEPTANCE.md
    TRACEABILITY.md
    CHANGELOG.md
  design/
    ux/
      UX-SPEC.md
      UI-SPEC.md
      DESIGN-SYSTEM.md
      A11Y.md
      PROTOTYPE.md
    architecture/
      ARCHITECTURE.md
      DATA-MODEL.md
      API-CONTRACTS.md
      SECURITY-DESIGN.md
      FAILURE-MODES.md
      OBSERVABILITY.md
      DEPLOYMENT.md
      CAPACITY.md
    adr/
      ADR-0001-<slug>.md
  tasks/
    TASK-0001.md
  work/
    TASK-0001-EVIDENCE.md
  reviews/
    REV-0001-TASK-0001.md
  security/
    THREAT-MODEL.md
    SEC-0001-<scope>.md
  qa/
    TEST-STRATEGY.md
    TEST-PLAN.md
    TEST-CASES.md
    TRACEABILITY.md
    TEST-REPORT.md
    DEFECTS.md
  release/
    RELEASE-PLAN.md
    DEPLOY.md
    ROLLBACK.md
    RUNBOOK.md
    RELEASE-NOTES.md
  docs/
    DOCS-PLAN.md
    DOCS-REVIEW.md
  team/
    GROWTH.md
    archive/
      GROWTH-<year>.md
```

项目根目录的原始日志统一放 `logs/<date>/TASK-<id>-<step>-<timestamp>.log`；该目录加入项目 `.gitignore`，不要写仓库根目录。

不是每个 Track 都创建全部文件；按需创建，避免空文件。

## 5. 状态协议

### 5.1 PROJECT.md frontmatter

```yaml
---
track: T3
stage: G4
updated: 2026-01-01
owner: ai-team/chief
---
```

### 5.2 STATUS.md 格式

```markdown
# Status

- Track: T3
- Stage: G4 Build
- Overall: 45%
- Last gate: G3 Plan — 通过（2026-01-01）
- Retro: not due (done 9, next 10) / due / done 2026-01-01

## In progress
| TASK | Owner | 状态 | 证据 |
|---|---|---|---|
| TASK-0001 | engineer | doing | work/TASK-0001-EVIDENCE.md |

## Done
...

## Blocked / Risks
...

## Next 3
1. ...
```

### 5.3 TASKS.md 格式

```markdown
| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |
|---|---|---|---|---|---|---|
| TASK-0001 | ... | engineer | TASK-0000 | todo/doing/blocked/changes_requested/review/qa/done/superseded | AC-1.. | path |
```

状态语义：

- `done` = 已通过审查/QA/门禁验收；`review`/`qa` 都还不算完成。
- `done（待确认）`/`done（待审查）` 是旧写法，新项目不得使用；存量项目迁移到 `review`/`qa`。
- 复盘节奏计数可用 `done` 前缀（含旧写法）衡量工作量；**门禁/验收只认 exact `done`**。
- `superseded` 不计入完成；返工行 `-R1`/`-R2` 计入复盘工作量。

### 5.4 ID 规范

- `TASK-0001` 任务
- `DEC-0001` 决策
- `RISK-0001` 风险
- `REV-0001` 代码审查
- `SEC-0001` 安全审查
- `DEF-0001` 缺陷
- `REL-0001` 发布
- `ADR-0001` 架构决策

### 5.5 HANDOFF.md 格式

```markdown
# Handoff

- 时间：
- Track/Stage：
- 目标：
- 已完成：
- 未完成：
- 关键决策：
- 阻塞/风险：
- Retro：not due / done YYYY-MM-DD / DUE — 先补
- Checkpoint：clean / done <commit> / DUE — 先派 DevOps / WAIVED
- Git：<last code checkpoint SHA>
- Baseline：<last code checkpoint SHA；默认同 Git>
- 下一条指令：
- 必读文件：

## 给下一次会话的最小上下文

## 新会话首条消息（可直接粘贴）
~~~text
读取 .ai-team/state/HANDOFF.md 继续项目。
当前 Track/Stage：<T? / G?>。
下一条指令：<一句话>。
先核对 STATUS/TASKS，禁止重复已完成任务；遇到 L3 决策再问我。
~~~
```

### 5.6 自动 checkpoint 触发条件

出现任一情况，Chief 主动写 HANDOFF，不需要用户要求：

- 上下文接近 70%，或已发生 compaction；
- 阶段门禁切换（G1→G2、G2→G3、G4→G5、G6→G7 等）；
- 每完成 10 个任务，或一个 workstream 结束；
- **复盘到期**（见 3.1）；先补复盘，再写 HANDOFF，不要把复盘债务交给下一个会话；
- 长任务超过当前会话可承载，需要拆到下一个会话；
- 用户说“先到这里/下次继续/暂停”；
- 状态文件与聊天/文件现状不一致。

写完 HANDOFF 后：

1. 更新 `STATUS.md`、`TASKS.md`、`RUN_LOG.md`；
2. 输出“新会话首条消息”；
3. 告诉用户可以继续当前会话，或复制首条消息到新会话 / 使用 `/ai-resume`；
4. **不要自动创建主会话**。主会话创建由用户或外部编排器控制。

## 6. 任务 brief 标准

每个 subagent 调用必须包含：

```text
角色：
技能：ai-team-workflow
任务 ID：
Track / 阶段：
目标：
背景与输入：
所有权：
约束：
契约影响：<必填；只引 API-CONTRACTS/ADR 章节号或字段名，不复制字段定义>
验收标准：
必须执行：
脚本参数：以 `<script> --help` 实跑为准；不手抄参数
独立验证：<reviewer/QA 必须实际执行的测试/扫描命令；无 shell 时写 RISK-* + 补偿证据>
证据位置：<logs/<date>/... 或 .ai-team/work/<TASK>-logs/；统一 UTF-8；失败日志 .failed.log>
测试路径：<owner=qa-engineer 时必填；必须在 QA owned paths + 构建 test source root，如 server/src/test/java/**/e2e/>
构建隔离：<共享工作区串行 / 独立 worktree <path>；并行构建或审查必填>
P2 处置：<修改后通过时必填；每个有实际风险的 P2 → TASK-* / RISK-* / 明确接受>
证据要求：命令 + 退出码 + 原始输出摘要 + 文件路径 + 未决问题；敏感值必须脱敏
禁止：
回报格式：
```

缺任何一项，Chief 先补 brief；角色发现 brief 不合格，回报 `BLOCKED: brief incomplete`。

## 7. 证据标准

每个任务证据写入 `.ai-team/work/TASK-xxxx-EVIDENCE.md`：

```markdown
# TASK-0001 Evidence

## 变更
- 文件：
- 行为：

## 命令与结果
| 命令 | 退出码 | 关键输出 |
|---|---|---|
| `npm test` | 0 | 42 passed |

## 验收对照
| AC | 结果 | 证据 |
|---|---|---|

## 未决/风险
- ...
```

规则：

- 命令必须是实际执行的完整命令；不能写“运行测试”；
- 退出码必须真实；失败就是失败；
- 输出摘要保留关键行，不粘贴整屏；
- 截图可补充，但不能替代命令；
- 环境不允许时写 `BLOCKED` + 原始错误 + 影响 + 建议；
- 原始日志写到 `logs/<date>/TASK-<id>-<step>-<timestamp>.log` 或 `.ai-team/work/<TASK>-logs/`，禁止写仓库根目录；
- 证据日志统一 UTF-8；PowerShell 5.1 下 `Tee-Object`、`*>` 可能生成 UTF-16，统一用 `Out-File -Encoding utf8`（或 `$PSDefaultParameterValues['Out-File:Encoding']='utf8'`）；
- 证据中的 `Set-Cookie`、`Authorization`、`Cookie`、口令、一次性 token 必须脱敏为 `<redacted len=.. sha256=..>`；提交前跑 `secret-check.mjs`，发现明文先 `--fix`；不得把原始凭据贴进聊天/报告；
- `logs/**` 下的 UTF-16 是 error（审查工具会拒绝读取）；用 `artifact-check --fix` 转换；`.ai-team/work/**` 的历史 UTF-16 是 warning，可用 `--fix-all` 批量迁移；`artifact-check` / `state-check` / `checkpoint-check --mark` 也会阻断明文凭据；
- 失败日志命名为 `*.failed.log`，并在 EVIDENCE 中写失败原因、是否已修复、后续通过证据；
- T0/spike 的 `target/` 构建产物在任务收口清理；根目录 `io/org/com` 等只有 `.class` 的目录视为误落盘；
- 非确定性测试失败（deadlock/timeout/网络/顺序）先登记 `RISK-*`/`DEF-*`，写明 owner 与关闭条件；重跑通过不能单独关闭 P1/安全项；
- QA 的 Java/Maven/Gradle E2E 放在 `**/src/test/java/**/e2e/**`，资源放 `**/src/test/resources/**/e2e/**`；必须用标准构建命令从干净 checkout 执行，禁止手工 `javac`/复制 class 作为最终证据；
- 同一工作区同一时刻只允许一个会写 `target/`/`build/`/`coverage/` 的构建；并行审查/实现必须串行构建或使用独立 worktree；
- 审查“修改后通过”的 P2 必须有 `TASK-*`/`RISK-*`/书面接受；S1/S2 缺陷只能由 QA 在独立回归后关单；
- 审查员必须能解析证据；UTF-16/二进制日志不能作为 P1/安全项的唯一依据，需提供 UTF-8 副本或文本摘要。

## 8. 角色交接契约

| 从 → 到 | 必须交付 | 接收方检查 |
|---|---|---|
| Chief → PM | 目标、Track、约束、用户原话、成功指标 | 是否可产品化 |
| PM → UX | PRD、旅程、优先级、内容/状态 | 是否覆盖异常/权限 |
| PM → Architect | PRD、NFR、约束、数据要求 | 是否可实现/可度量 |
| UX → Engineer | UI-SPEC、token、状态、a11y、验收清单 | 是否可实现 |
| Architect → Engineer | 架构、契约、数据模型、失败模式 | 是否无歧义 |
| Engineer → Reviewer | diff、证据、风险、审查重点 | 是否可复现 |
| Reviewer → Engineer | P0/P1/P2/P3 + 关闭条件 | 是否可执行 |
| Engineer → QA | 可运行版本、测试入口、已知限制 | 是否可独立验证 |
| QA → DevOps | 测试报告、放行结论、环境要求 | 是否可发布 |
| Security → Chief | 放行结论、阻断项、风险接受 | 是否可发布 |
| DevOps → Chief | 部署证据、健康检查、回滚结论 | 是否可运维 |
| All → Writer | 事实、命令、截图、限制 | 是否可验证 |

## 9. 反模式

- 先写代码再补需求/设计；
- 用“行业最佳实践”代替验收标准；
- 审查者替 owner 修代码；
- QA 只跑 happy path；
- 安全只跑工具不看攻击路径；
- 部署没有回滚；
- 文档命令未验证；
- 状态只存在聊天里；
- 为了流程而流程（T1 强行全套 PRD）；
- 为了速度跳过审查/测试；
- 多个 agent 同时改同一文件；
- 把“没有报错”当“通过”；
- 把日志/临时文件写在仓库根目录；
- 用 UTF-16 或不可解析日志作为唯一证据；
- 用“重跑通过”关闭 flake；
- 多个 agent 在同一工作区并行 `mvn clean/test`；
- P2 只写报告不建单；
- 成长提案没有处置状态，或处置后不回填 GROWTH；
- 归档时删除历史而不是移动到 `team/archive/`。

## 10. 模板

本技能 `templates/` 下提供：

- `PROJECT.md`
- `STATUS.md`
- `TASKS.md`
- `HANDOFF.md`
- `PRD.md`
- `ARCHITECTURE.md`
- `ADR.md`
- `REVIEW.md`
- `TEST-REPORT.md`
- `DEFECTS.md`
- `SECURITY-REPORT.md`
- `RELEASE-PLAN.md`

使用方式：读取模板 → 复制到 `.ai-team/` 对应路径 → 填入项目事实；不要保留占位符。
