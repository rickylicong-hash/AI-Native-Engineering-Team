---
schema: 2
project: <project-name>
track: T3
last_retro: YYYY-MM-DD
last_gate: G4
tasks_at_last_retro: 0
next_due_at: 10
last_trigger: first-10
open_proposals: 0
last_disposition: YYYY-MM-DD
---

# GROWTH — 复盘与团队改进提案

> 本文件只写**提案**，不直接修改 `.opencode/**` 或团队配置。
> 改进提案必须有 ≥2 次证据；一次性问题写 `state/RISKS.md`。
> 新复盘追加新条目，不覆盖历史；只更新 frontmatter 的计数与日期。

## 提案处置索引

> **唯一状态源。** 每条提案新增时登记 `proposed`；处置后必须在同一轮回填状态、落地版本/任务、证据和日期。
> 状态：`proposed` / `accepted` / `in_progress` / `deferred` / `partial` / `done` / `rejected` / `superseded`。
> `done` / `rejected` / `superseded` 为已处置；其余为未处置。检查命令：`growth-check.mjs`。

| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 |
|---|---|---|---|---|---|---|
| P-0001 | RETRO-0001 | ... | proposed | - | - | YYYY-MM-DD |

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

| ID | 提案 | 对应问题 | 最小改动 | 验收方式 | 需要谁批准 |
|---|---|---|---|---|---|
| P-0001 | ... | G-01 | ... | ... | 用户 |

### 5. 结论

- 本周期结论：<保持 / 调整>
- 下一周期重点：P-____
- 下次复盘：第 __ 个 `done` 任务，或进入 G__ 前
