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
7. **每条提案必须登记到“提案处置索引”**：新增为 `proposed`，并写 `scope`（`team`/`project`）；处置后同一轮回填 `done/rejected/superseded` + 落地版本/任务 + 证据 + 日期。未处置项保持 `proposed/accepted/in_progress/deferred/partial`。
8. 复盘、交接、门禁前运行 `growth-check --debt`；有缺失状态或净零违规不得交接。全部处置且非最近一轮的 RETRO 可用 `growth-check --archive --yes` 归档到 `team/archive/`。
9. 归档不删除历史：主文件保留索引和归档导航，完整原文进 `team/archive/GROWTH-<year>.md`。
10. **三层入口（1.9.0，1.9.1 真值校验）**：`TEAM-CORE` 只收跨项目复用、通用脚本/模板缺陷、≥2 项目或 ≥3 任务证据；单项目策略归 `PROJECT-PROFILE`（项目 `.ai-team/tasks` 或 `profiles/`）；一次性现象归 `OBSERVE`（`RISKS.md` + 复查日期）。只有 `scope: team` 计入团队 open。
11. **净零（1.9.0，1.9.1 真值校验）**：每轮新增 `TEAM-CORE` 提案 ≤5，且 ≤ 本轮关闭/合并数；`last_retro_new` 必须等于最新 RETRO 的 team 新增数（含同轮合并/关闭），历史 6+ 新增只能通过显式 `net_zero_exception` 记录 RETRO 号/原因/批准日期；`growth-check` 从最新 RETRO/索引校验 frontmatter，陈旧即 error；团队 open 连续两轮上升时停止新增，先清债。`PROJECT-PROFILE` 不占团队 open，但必须写 owner、验收、复查日期。
12. `deferred` 必须写复查日期/触发点；长期停在 `proposed` 的提案由 `--debt` 的年龄视图暴露，不得用新增提案掩盖。

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
| 证据文件扫描 | 默认 2000 起步，截断时自动升限到 20000（可用 `--max-evidence-files` 调整起点；到硬上限仍截断才失败） |
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
7. **checkpoint 收口（P-18/P-26/P-35/P-39/P-51）**：优先用 `checkpoint-check --mark --sync-docs`；它会把 `HANDOFF.md` 的 `远程`/`Git`/`Baseline` 和 `STATUS.md` 的 `Retro`/`Growth`/`Checkpoint`/`远程`/`HEAD` 同步到该 commit。`远程` 行由脚本用 `git ls-remote` 读取远端 SHA 计算 ahead（失败时回退本地并标记 `local`），并剥离 userinfo；`Retro` 取 `GROWTH.md` frontmatter，`Growth` 取 `growth-check --json`，不要手写。随后提交纯文档同步并运行 `state-check`。`TASK-GIT-*` 证据必须包含 `state-check` PASS；未同步不算 checkpoint 完成。若本次包含 `GROWTH.md` 变更，先运行 `growth-check`，有缺失处置状态时退回 Chief。

### 3.3 状态一致性检查

在会话启动、交接和门禁前运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\state-check.mjs" --project .
# 500+ 证据文件项目：默认 2000 起步，截断时自动升限到 20000
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\state-check.mjs" --project . --max-evidence-files 4000
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

1.13.0 起优先用统一预检，避免 state/checkpoint 各自重复扫描：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\gate-check.mjs" `
  --project . --mode start   # 或 handoff / gate / release
```

`gate-check` 只跑一次 artifact+secret；state-check/checkpoint-check 通过 `--artifacts-ok` 复用结果；只有定位时才单独跑子脚本。

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
| `更新日期` | `done`/`rejected` 必填；open 项的年龄按此字段计算 |
| `scope` | `team`（默认）/ `project`；`project` 不计入团队 open |
| `复查日期` | `deferred` 必填；或证据列写复查触发点 |

检查命令：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\growth-check.mjs" --project .
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\growth-check.mjs" --project . --debt
```

规则：

- 默认只把“索引缺失/状态非法/scope 非法/终端缺证据/净零违规”视为 error；未处置提案只报 open；
- `--debt` 输出 team/project open、年龄、重复簇和净零字段；
- `--strict` 把 team 未处置提案也算失败，可用于 G8 或用户要求；
- `--archive` 只输出归档计划；`--archive --yes` 才移动“全部提案已处置且非最近一轮”的 RETRO 到 `team/archive/GROWTH-<year>.md`；
- 归档后主文件保留索引与归档导航，不删除历史；
- 复盘、交接、门禁前运行 `growth-check --debt`；本轮处置过的提案必须同一轮回填，不得留到下一次会话。

### 3.4.1 项目 Profile（1.9.0）

单项目策略（迁移号、worktree、CI/BOM、状态格式、VEX 例外）不进团队核心；放到项目 `.ai-team/tasks` 或本 skill 的 `profiles/` 示例层。初始化新项目时：

1. 读 `profiles/README.md`，选择 `java-spring` / `vue` / `strict-security` 或组合；
2. 在项目 `PROJECT.md`/`DECISIONS.md` 记录 profile、覆盖项、owner、复查日期；
3. brief 引用 profile 条目，不复制团队 core 规则；
4. 同一策略在 ≥2 个项目出现后，才按 `TEAM-CORE` 提提案。

Profile 文件：

- `profiles/README.md`
- `profiles/java-spring.md`
- `profiles/vue.md`
- `profiles/strict-security.md`

### 3.5 Shell 与 brief 预检（1.3.1；1.6.0 Shell-first strict）

**Shell 策略：**

- 所有角色 shell 默认允许所有普通命令，包括管道、`;`、`&&`、`||`、`2>&1`、多行命令、`git commit`/`git push`、发布/部署和 `git add -A`；
- 读单个文件优先用 `read`，列目录用 `glob`，搜内容用 `grep`；这是效率建议，不是权限要求；
- 只有破坏性命令 deny：`git reset --hard`、`git clean`、`git restore`/`checkout --`、force push/mirror/delete、history rewrite、删除分支/tag/stash、强制删除 worktree（`--force`/`-f`）、`rm -rf`、`Remove-Item -Recurse`、prune/destroy/delete；非 force 的 `git worktree remove` 允许，但只清理自己任务 brief 中的 worktree，不得删除他人工作区；
- `.env`/密钥、commit/push、publish/deploy 不再由 shell 权限拦截；仍按 brief 和流程约束；
- 写日志/证据必须 UTF-8：PowerShell 5.1 下 `Tee-Object`、`*>` 可能生成 UTF-16；统一用 `Out-File -Encoding utf8`（或 `$PSDefaultParameterValues['Out-File:Encoding']='utf8'`）；
- 证据中的 `Set-Cookie`/`Authorization`/`Cookie`/口令/token 必须脱敏；提交前跑 `secret-check.mjs` 或统一的 `gate-check.mjs`（artifact+secret 只扫一次）；
- 角色化证据门禁：Engineer/QA/DevOps/Reviewer/Security 在产出或报告收口时运行 `gate-check.mjs --mode gate`；PM/UX/Architect/Writer 不运行 artifact/secret，除非 brief 明确要求；
- 收到 `Permission denied` 时：若命令不是破坏性操作，先检查是否旧会话/旧版本（`version.mjs`），新开会话；不要为了绕过它扩大 allow。

**Brief 生成 + 预检：**

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-new.mjs" `
  --task TASK-xxxx --agent ai-team/qa-engineer --out .ai-team/tasks/TASK-xxxx-BRIEF.md
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-lint.mjs" `
  --brief .ai-team/tasks/TASK-xxxx-BRIEF.md --agent ai-team/qa-engineer
```

缺 `脚本参数`、`契约影响`、`验证预算`（engineer/reviewer/QA 必填；devops 运行构建/冒烟时必填）、`独立验证`、`证据位置`（含 UTF-8）、`证据门禁`（`artifact-check --strict --max-files 2000` + 允许的日志路径）、`运行时取证`（runtime 任务）、QA `测试路径`、Reviewer/Security `P2 处置` 或 `Done gate`、`构建隔离` 时，不得派发 subagent。engineer brief 还必须填 `Review-entry 自检`（语义源对照 + P1 场景）、`门禁面`（≤2）、`必然受影响测试/脚本`，涉及查询/幂等/筛选时填 `请求参数断言`；`所有权` 必须含测试路径 glob/清单（或显式 `无测试：<理由>`），并写 `ownership-check --diff`，否则 brief-lint FAIL。脚本参数一律写“以 `<script> --help` 实跑为准”，契约只引章节号/字段名，不复制定义。

P-32/P-34 起，涉及重试/幂等/事务/并发/回滚/迁移的 engineer brief 还必须填 `事务边界与部分提交` 与 `旧行为反证`；reviewer/QA brief 必须填 `边界四问`（组件故障 / 事务回滚或部分提交 / 导出或依赖链不可用 / 拒绝顺序与豁免）。字段值必须与字段名同行；写“不适用/N/A/无”视为未填。

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

`artifact-check` / `state-check` / `checkpoint-check --mark` 已内置同一扫描；明文凭据会阻断。`secret-check` 默认从 2000 文件起步，截断时自动升限到 20000；到上限仍截断才输出 `PARTIAL (truncated at ceiling)` 并以 exit 3 失败；UTF-16 证据先解码再扫描，无 BOM 的二进制/不可读文本计 `skipped` 并按 PARTIAL 处理，不能当作 PASS。findings 只打印 `kind/file/line/len/sha256`，不打印明文；`artifact-check` 对 `secrets.truncated` 报 `secret-scan-truncated`，对 `secrets.skipped` 报 `credential-scan-skipped`。

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

### 3.8 可选结构化执行器（1.4.0；1.8.0 从统一网关降级）

`team-shell.mjs` 是可选的：把常用构建/测试/扫描/团队脚本调用映射为参数数组，不经过 shell；提供参数校验、跨平台映射和结构化日志。它不是权限边界，简单命令直接执行即可。

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

- 通过 `team-shell` 调用时，只能使用 `permissions.json` 的 `gateway` 动作；直接 shell 不受此限制；
- 不支持任意脚本名/任意 shell 参数；测试类、模块、revision 有格式校验；
- `git add`/`commit`/`push` 等写操作不再由 shell 权限拦截；仍按 brief、ownership 和 checkpoint 流程执行；
- 每次调用写 `.ai-team/work/team-shell-logs/TEAM-SHELL.log`；
- 新脚本默认直接可执行；只有需要参数校验/统一日志/跨平台映射时，才在 `permissions.json` 的 `gateway` 注册并修改 `team-shell.mjs`，然后跑 `permission-lint`；
- Shell-first 下普通 `node *script.mjs*` 已由 `shell * -> allow` 覆盖；简单命令不要为了“走网关”而多一层封装。

### 3.9 跨项目团队优化（1.7.0）

`/ai-improve <project>` 由 `build` 维护者运行，用真实项目证据优化团队本身：

1. 读取项目 `team/GROWTH.md`、`AUDIT.json`、最近 `TEAM-USAGE-AUDIT-*.md` 和交付证据；
2. **五项强制检查**：目标偏移、流程与智能体效率、定义冲突/臃肿/重复/过期、大型项目能力（按 `docs/LARGE-PROJECTS.md`）、交付面覆盖与骨架闭环（`page-coverage-check.mjs`/`endpoint-coverage-check.mjs`）；每项给证据，缺证据写“数据缺口”；
3. **历史成长曲线 + 上一轮达成**：运行 `improve-metrics.mjs --write` 比较最近 6–8 轮指标；运行 `improve-previous.mjs` 检查最新 `TEAM-IMPROVEMENT-*.md` 的任务 done/partial/missed/unverified；负成长必须当轮加优化任务，未达成项必须结转；
4. 运行 `improve-scan.mjs --project <project>` 汇总会话、工具、权限拒绝、token 与角色分布；优先用 `gate-check.mjs --mode handoff` 做一次证据预检；
5. 按 `NO-OP / DOCS-ONLY / PATCH / FEATURE / ROLE-GAP / DEFER` 决策，写项目侧报告；
6. **默认停止并等待用户授权**；授权后用 `--apply` 实施，不能在同一轮自动修改团队源；
7. 实施按风险调用子智能体：`DOCS-ONLY` 由 build 自己改；`PATCH` 加 code-reviewer；涉及脚本/权限/安全加 security-auditor；`FEATURE` 才用完整团队链；
8. 回填项目 `GROWTH.md` 的提案处置索引，运行 `growth-check`；完成后清理本地 `.ai-team` 证据。

硬规则：

- 单次现象写 `RISK-*`，≥2 次证据才写 GROWTH 提案；`ROLE-GAP` 需 ≥3 次、跨 ≥2 任务/项目且现有角色无法覆盖；
- 负成长不得 `NO-OP`：本轮至少 1 个任务直接改善恶化指标；上一轮 `partial/missed` 必须结转或写 `RISK-*`；
- 默认不新增角色；每轮最多 10 个改动，按主题分批；优先改 prompt/命令/模板，再考虑脚本；
- 优化必须写清基线、验收、回滚和观察窗口；无改善就标记 `rejected`/`superseded`；
- 文档、命令、计数、版本必须同轮同步，文档不一致视为未完成；
- token/成本只观察，不建立预算机制，除非用户另行批准。

完整策略与行业映射见 `docs/IMPROVEMENT.md`。

### 3.10 验证预算与全量基线复用（1.9.4）

目标：消除“同一候选提交反复跑全量测试”的无效等待，同时保持独立验证、证据完整和门禁不可跳过。这里约束的是**全量基线的数量与证据指纹**，不是模型 token/耗时预算。

**验证阶梯（V0–V3）**

| 级别 | 内容 | 何时用 | 最低证据 |
|---|---|---|---|
| V0 静态 | lint / typecheck / 编译 / 静态扫描 | 每次编辑后 | 完整命令 + 退出码 |
| V1 定向 | 变更模块 + 变更点 / P1 场景测试（如 `mvn -pl <module> -am -Dtest=...`） | 实现迭代、审查首轮、回归复查 | 命令 + 退出码 + 用例清单 |
| V2 全量基线 | 完整测试套件（如 `mvn -B clean test`） | 给出 review 结论前、G5/G7 门禁、发布候选 | 绑定候选提交指纹的唯一日志 |
| V3 稳定性 | 只对失败/flaky/并发/P0/P1 安全项重复运行 | 触发条件满足时 | 首次失败日志 + 重试策略 + 结果（≥3 次或固定种子） |

**全量基线合同（每个候选提交最多 1 条）**

- 基线必须绑定**候选提交指纹**：`git rev-parse HEAD`、`git status --porcelain`（运行基线时必须为空）、`git diff HEAD | git hash-object --stdin`（覆盖 staged + unstaged）；未跟踪文件必须先 `git add -N` 或提交后再算指纹。日志同时记录 commit、命令、退出码、`Tests run/Failures/Errors/Skipped`、日期、日志路径。
- 任务证据登记 `baseline_id = <TASK>-<commit>-<run>`；没有 `baseline_id` 的全量日志不算基线。
- 同一候选提交只允许 1 条全量基线；同一任务默认 ≤2 条（实现完成 1 条 + 修复后最终候选 1 条）；第 3 条必须 Chief 书面批准并写 `RISK-*`/`DEC-*`，说明前两条为何不能复用。
- 基线后发生任何代码/测试/配置/契约/依赖变更（含 `git status` 非空）→ 基线失效，必须重跑；不得“复用过时基线”。工作区不干净时跑的日志只能标记 `provisional`，不能关闭 G5/G7。

**复用与独立验证（Reviewer / QA）**

- 可以复用同一候选提交的全量基线，但必须同时满足：
  1. 校验 `baseline_id` 的 commit 与工作区指纹和当前候选一致；
  2. 读取并核对日志的退出码、总数、skipped 与失败项，日志必须 UTF-8 可读；
  3. 独立执行受影响模块的定向测试（V1）和至少 1 条关键路径/集成验证；
  4. 在报告写“复用基线 ID + 未复跑原因 + 独立执行的命令/退出码”。
- 复用不等于“只看工程师日志”。没有独立执行任何测试/扫描的 Reviewer/QA 不得给通过。
- 必须重跑全量的情况：基线缺失/不可读/指纹不符；基线后有变更；P0/P1 修复的最终候选；T3/T4 的 G5/G7 或发布候选没有同一候选提交的有效基线；flaky/skipped 未解释；Reviewer/QA 新增或修改测试；覆盖矩阵显示基线未覆盖变更面。

**审查时序（不牺牲质量）**

- Reviewer 可以先做只读静态审查（diff / 契约 / 测试质量），与工程师跑全量基线并行；独立测试执行必须等构建互斥释放，且只对已冻结的候选提交下结论。
- “进入 review 前跑全量”指在给出 review 结论前完成，不要求静态审查等待基线；静态审查与基线可并行，但两者都必须指向同一冻结候选提交。
- 静态审查发现 P1 时先退回修复，不必等待或触发全量；修复后的最终候选再生产成本基线。
- 回归审查只跑原 P1 + 受影响范围（V1），复用最终候选基线做全量结论。

**禁止**

- 同一未变更提交重复跑全量；
- 用“重跑通过”关闭 flaky / P1 / 安全项；
- 复用基线但不校验指纹、不读计数；
- Reviewer/QA 以“工程师已跑”为由完全不执行独立验证；
- 把 T3/T4 当作“必须无条件重跑全量”；有有效基线时只做指纹校验 + V1；
- 为省时间跳过 G5/G7 要求的全量。

### 3.11 大型项目 P0 编排（1.13.0）

大型项目先补“状态/集成/影响面/队列”，不先加角色：

| 能力 | 文件/脚本 | 用法 |
|---|---|---|
| Program/Workstream | `templates/PROGRAM.md`、`templates/WORKSTREAM.md`、`program-check.mjs` | `node program-check.mjs --project . --strict`；检查 owner/依赖/循环/缺 workstream 文件 |
| 持久队列 | `templates/QUEUE.json`、`next-task.mjs` | `node next-task.mjs --project . --claim`；只选依赖已 done 的 ready 任务 |
| 影响面 | `impact-scan.mjs` | `node impact-scan.mjs --project . --base HEAD~1 --json`；输出 changed→module→affected tests，供 V1 |
| 集成列车 | `templates/INTEGRATION.md`、`integration-check.mjs` | `node integration-check.mjs --project . --strict`；校验候选/baseline/命令/退出码/merge order/冒烟/回滚 |
| 统一预检 | `gate-check.mjs` | `--mode start|handoff|gate|release`；artifact/secret 只扫一次 |

规则：

- 一个 workstream 一个 lead owner；同一文件同一时间只有一个 writer。
- 契约先冻结，再并行；跨 workstream 依赖写 ID，`program-check` 校验循环。
- 每个集成候选只跑 1 条全量；workstream 内部用 V1，不各自跑全量。
- 成本/容量默认只观察；T4/workstream 预算需用户批准。
- 不新增 Program Manager 角色，除非满足 `ROLE-GAP` 门槛并获得用户批准。

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
- Growth: open 0 / done 0 / last YYYY-MM-DD
- Checkpoint: `<commit>`（done N）
- 远程：`origin <url>`，`<branch>` ahead N（`<upstream>=<sha>`，实测 `git ls-remote`）
- HEAD: `<short sha>`

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
- 远程：<origin url>，<branch> ahead N（<upstream>=<sha>）
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
变更面：<FE | BE | full-stack | infra；决定验证矩阵，不新增角色>
交付面：<页面 ID（P-XXX-01）和/或端点（/v1/...）；无页面/端点写“不适用（无页面/端点）”；BE 无端点写“无端点：<理由>”>
交付状态：<完整 | 骨架；骨架必须填下一行>
骨架延期：<DEC-*/RISK-* + 复查日期 + 接线触发条件；非骨架写“不适用（完整交付）”>
验收标准：
必须执行：
脚本参数：以 `<script> --help` 实跑为准；不手抄参数
验证预算：<V0/V1 迭代用定向测试；V2 全量只对冻结候选提交跑 1 条并登记 baseline_id；Reviewer/QA 复用需校验 commit+工作区指纹并独立跑受影响模块；同一任务第 3 条全量需 Chief 批准>
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
- `PAGE-MAP.json`（页面覆盖账本）
- `ENDPOINT-MAP.json`（端点覆盖账本）

使用方式：读取模板 → 复制到 `.ai-team/` 对应路径 → 填入项目事实；不要保留占位符。
