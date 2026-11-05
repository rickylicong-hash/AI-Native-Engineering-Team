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
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\checkpoint-check.mjs" --project . --mark
```

规则：

1. 到期未提交 → 不进入门禁，不交接；先派 DevOps。
2. **Chief 不得自己 `git add`/`git commit`/`git push`**；`git add` 也是 DevOps 的职责。
3. 只提交精选路径，禁止 `git add -A` / `git add .`；不提交 `work/**`、日志、截图、tmp、未脱敏安全报告。
4. 用户要求暂不提交时，在 `HANDOFF.md` 写 `Checkpoint: WAIVED`、原因和 `RISK-*`。
5. 提交后更新 `state/CHECKPOINT.json`（`--mark`），push 仍需用户批准。

## 4. 目录与产物

```text
.ai-team/
  README.md
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
```

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
| TASK-0001 | ... | engineer | TASK-0000 | todo/doing/review/qa/done/done（待确认）/blocked/changes_requested/superseded | AC-1.. | path |
```

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
任务 ID：
Track / 阶段：
目标：
背景与输入：
所有权：
约束：
验收标准：
必须执行：
证据要求：
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
- 环境不允许时写 `BLOCKED` + 原始错误 + 影响 + 建议。

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
- 把“没有报错”当“通过”。

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
- `SECURITY-REPORT.md`
- `RELEASE-PLAN.md`

使用方式：读取模板 → 复制到 `.ai-team/` 对应路径 → 填入项目事实；不要保留占位符。
