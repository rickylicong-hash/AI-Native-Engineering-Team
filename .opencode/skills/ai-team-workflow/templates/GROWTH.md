---
schema: 3
project: <project-name>
track: T3
last_retro: YYYY-MM-DD
last_gate: G4
tasks_at_last_retro: 0
next_due_at: 10
last_trigger: first-10
open_proposals: 0
last_disposition: YYYY-MM-DD
scope_model: three-tier
net_zero: enforced
last_retro_new: 0
last_retro_closed: 0
team_open_at_last_retro: 0
team_open_at_prev_retro: 0
team_open_at_prev2_retro: 0
---

# GROWTH — 复盘与团队改进提案

> 本文件只写**提案**，不直接修改 `.opencode/**` 或团队配置。
> 改进提案必须有 ≥2 次证据；一次性问题写 `state/RISKS.md`。
> 新复盘追加新条目，不覆盖历史；只更新 frontmatter 的计数与日期。
> **三层入口（1.9.0）**：`TEAM-CORE` / `PROJECT-PROFILE` / `OBSERVE`；只有 `scope: team` 计入团队 open。
> **净零（1.9.0，1.9.1 真值校验）**：每轮新增团队提案 ≤ min(5, 本轮关闭/合并数)；`last_retro_new` 必须等于最新 RETRO 的 team 新增数，`team_open_at_last_retro` 必须等于实际 team open；frontmatter 陈旧即 error。历史违规只能通过显式 `net_zero_exception` 记录 RETRO 号、原因和批准日期。团队 open 连续两轮上升时停止新增，先清债。

## 三层入口

| 层 | 适用 | 落地位置 | scope | 计入团队 open |
|---|---|---|---|---|
| `TEAM-CORE` | 跨项目复用；通用脚本/模板缺陷；≥2 个项目或 ≥3 个任务证据 | 本文件 | `team` | 是 |
| `PROJECT-PROFILE` | 单项目策略：迁移号、worktree、CI/BOM、状态格式、VEX 例外 | 项目 `.ai-team/tasks` 或 `profiles/`；本文件可保留追踪行 | `project` | 否 |
| `OBSERVE` | 一次性现象 | `state/RISKS.md` + 复查日期 | — | 否 |

## 提案处置索引

> **唯一状态源。** 每条提案新增时登记 `proposed`；处置后必须在同一轮回填状态、落地版本/任务、证据和日期。
> 状态：`proposed` / `accepted` / `in_progress` / `deferred` / `partial` / `done` / `rejected` / `superseded`。
> `done` / `rejected` / `superseded` 为已处置；其余为未处置。检查命令：`growth-check.mjs`。
> `scope` 缺省按 `team` 读取；`PROJECT-PROFILE` 提案用 `scope: project` + `deferred`（或落地后 `done`），不计入团队 open。
> `deferred` 必须写复查日期和复查触发点；不得无限期停在 `proposed`。

| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 | scope | 复查日期 |
|---|---|---|---|---|---|---|---|---|
| P-0001 | RETRO-0001 | ... | proposed | - | - | YYYY-MM-DD | team | YYYY-MM-DD |

## 已归档复盘

> 全部提案已处置且不是最近一轮的 RETRO，可用 `growth-check --archive --yes` 移入 `team/archive/GROWTH-<year>.md`；主文件保留一行导航。

## RETRO-0001 — YYYY-MM-DD — G4 — first-10

### 1. 范围与指标

- 覆盖任务：TASK-____ .. TASK-____（共 __ 个 `done`）
- 本周期新增完成：__
- 返工任务：__ / __（__%）
- 审查轮次：REV-____ .. REV-____
- 未关闭 P0/P1：__
- 证据：`state/TASKS.md`、`state/RUN_LOG.md`、`reviews/**`、`qa/**`、`security/**`

### 2. 做得好（保留）

- ...

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-01 | ... | ... | ... | ... |

### 4. 改进提案（最小改动、可验收）

> 先处置 open，再新增。每条必须分类 `TEAM-CORE` / `PROJECT-PROFILE` / `OBSERVE`，并写复查日期。
> 新增 `TEAM-CORE` ≤ 5，且 ≤ 本轮关闭/合并数；`PROJECT-PROFILE` 不占团队 open；一次性现象写 `RISKS.md`。

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| P-0001 | team | ... | G-01 | ... | ... | YYYY-MM-DD | 用户 |

### 5. 结论

- 本周期结论：<保持 / 调整>
- 下一周期重点：P-____
- 下次复盘：第 __ 个 `done` 任务，或进入 G__ 前
