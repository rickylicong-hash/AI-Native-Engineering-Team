---
schema: 3
project: AI Native Engineering Team
track: T3
last_retro: 2026-11-09
last_gate: G5
tasks_at_last_retro: 20
next_due_at: 30
last_trigger: audit-remediation-1.13.0
open_proposals: 0
last_disposition: 2026-11-09
scope_model: three-tier
net_zero: enforced
last_retro_new: 0
last_retro_closed: 6
team_open_at_last_retro: 0
team_open_at_prev_retro: 0
team_open_at_prev2_retro: 0
---

# GROWTH — AI Native 团队源自我改进台账

> 本文件是**团队源**（不是目标项目）的改进台账，用于让团队对自己的规则/脚本/文档执行同一套 RETRO、净零与债务治理。
> 历史细节仍在 `CHANGELOG.md`、`docs/VERIFICATION.md`、`.ai-team/reviews/**`；本文件只保留团队级提案与处置索引。
> 一次性问题写 `.ai-team/state/RISKS.md`；只有 `scope: team` 计入团队 open。
> 本台账为 2026-11-09 全量审计后的补登（RETRO-0001..0005），后续按每 10 个 `done` 或版本发布追加。

## 三层入口

| 层 | 适用 | 落地位置 | scope | 计入团队 open |
|---|---|---|---|---|
| `TEAM-CORE` | 跨项目复用；通用脚本/模板缺陷；≥2 个项目或 ≥3 个任务证据 | 本文件 | `team` | 是 |
| `PROJECT-PROFILE` | 单项目策略 | 项目 `.ai-team/tasks` 或 `profiles/` | `project` | 否 |
| `OBSERVE` | 一次性现象 | `.ai-team/state/RISKS.md` + 复查日期 | — | 否 |

## 提案处置索引

| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 | scope | 复查日期 |
|---|---|---|---|---|---|---|---|---|
| T-01 | RETRO-0001 | 三层入口、净零与项目 profile | done | 1.9.0 / TASK-IMPROVE-2026-11-07-R4 | `CHANGELOG.md` 1.9.0 | 2026-11-07 | team | 2026-11-21 |
| T-02 | RETRO-0002 | 净零真值与证据扫描自适应 | done | 1.9.1 / TASK-IMPROVE-2026-11-08-R6 | `CHANGELOG.md` 1.9.1 | 2026-11-08 | team | 2026-11-22 |
| T-03 | RETRO-0003 | 团队质量目标与 `/ai-improve` 目标校准 | done | 1.9.2 / commit `c484f74` | `CHANGELOG.md` 1.9.2 | 2026-11-08 | team | 2026-11-22 |
| T-04 | RETRO-0004 | Review-entry 合同与首轮横向面 | done | 1.9.3 / commit `2de7bb0` | `CHANGELOG.md` 1.9.3 | 2026-11-08 | team | 2026-11-22 |
| T-05 | RETRO-0005 | 验证预算与全量基线复用 | done | 1.9.4 / commit `ec6738c` | `CHANGELOG.md` 1.9.4；`TASK-IMPROVE-2026-11-08-R8-EVIDENCE.md` | 2026-11-08 | team | 2026-11-23 |
| T-06 | RETRO-0006 | 质量报告 `quality-report.mjs` | done | 1.10.0 / TASK-IMPROVE-2026-11-09-R9 | `TASK-IMPROVE-2026-11-09-R9-EVIDENCE.md`；`test-gates` 46/46 | 2026-11-09 | team | 2026-11-23 |
| T-07 | RETRO-0006 | CI 门禁 `.github/workflows/verify.yml` | done | 1.10.0 / TASK-IMPROVE-2026-11-09-R9 | `.github/workflows/verify.yml`；`CHANGELOG.md` 1.10.0 | 2026-11-09 | team | 2026-11-23 |
| T-08 | RETRO-0007 | 所有权机器校验 `ownership-check.mjs` | done | 1.11.0 / TASK-IMPROVE-2026-11-09-R10 | `TASK-IMPROVE-2026-11-09-R10-EVIDENCE.md`；`test-gates` 60/60 | 2026-11-09 | team | 2026-11-23 |
| T-09 | RETRO-0007 | 离线端到端冒烟 | done | 1.11.0 / TASK-IMPROVE-2026-11-09-R10 | `test-gates` e2e 6 checks；`CHANGELOG.md` 1.11.0 | 2026-11-09 | team | 2026-11-23 |
| T-10 | RETRO-0008 | R7 P3 债务修复（archive/GBK/列数/大小/多表） | done | 1.11.1 / TASK-IMPROVE-2026-11-09-R11 | `TASK-IMPROVE-2026-11-09-R11-EVIDENCE.md`；`test-gates` 68/68 | 2026-11-09 | team | 2026-11-23 |
| T-11 | RETRO-0008 | CI action SHA pin + Node 24.15.0 | done | 1.11.1 / TASK-IMPROVE-2026-11-09-R11 | `.github/workflows/verify.yml`；`RISK-R9-04` 关闭 | 2026-11-09 | team | 2026-11-23 |

## 已归档复盘

> 暂无归档；全部提案已处置且不是最近一轮的 RETRO 可用 `growth-check --archive --yes` 归档。
- RETRO-0001 — `team/archive/GROWTH-2026.md`
- RETRO-0002 — `team/archive/GROWTH-2026.md`
- RETRO-0003 — `team/archive/GROWTH-2026.md`
- RETRO-0004 — `team/archive/GROWTH-2026.md`
- RETRO-0005 — `team/archive/GROWTH-2026.md`
- RETRO-0006 — `team/archive/GROWTH-2026.md`
- RETRO-0007 — `team/archive/GROWTH-2026.md`

## RETRO-0001 — archived

- 归档：`team/archive/GROWTH-2026.md`
- 提案：T-01（全部已处置）

## RETRO-0002 — archived

- 归档：`team/archive/GROWTH-2026.md`
- 提案：T-02（全部已处置）

## RETRO-0003 — archived

- 归档：`team/archive/GROWTH-2026.md`
- 提案：T-03（全部已处置）

## RETRO-0004 — archived

- 归档：`team/archive/GROWTH-2026.md`
- 提案：T-04（全部已处置）

## RETRO-0005 — archived

- 归档：`team/archive/GROWTH-2026.md`
- 提案：T-05（全部已处置）

## RETRO-0006 — archived

- 归档：`team/archive/GROWTH-2026.md`
- 提案：T-06, T-07（全部已处置）

## RETRO-0007 — archived

- 归档：`team/archive/GROWTH-2026.md`
- 提案：T-08, T-09（全部已处置）

## RETRO-0008 — 2026-11-09 — G5 — release-1.11.1

### 1. 范围与指标

- 覆盖：R7-01..R7-06、CI action SHA pin
- 新增完成：2
- 返工任务：2 / 2（code/security 首轮均不通过，R1/R2 修复后通过）
- 审查轮次：REV-...-R11 → R11-R1 → R11-R2；SEC-...-R11 → R11-R1 → R11-R2
- 首轮未关闭 P0/P1：code P1=1、security P1=1（artifact-check 未传播 oversized/timedOut）
- 最终未关闭 P0/P1：0
- 证据：`TASK-IMPROVE-2026-11-09-R11-EVIDENCE.md`、`REV-...-R11-R2.md`、`SEC-...-R11-R2.md`

### 2. 做得好（保留）

- 把“大文件/超时跳过”从 fail-open 改成阻断，并让 state/checkpoint 继承。
- R7 债务有 fixture 闭环，不再只靠人工记忆。
- CI action 固定到 40 位 SHA，减少可移动 tag 供应链风险。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-12 | 扫描上限引入新的 fail-open | R11 code P1-01 | R11 security P1-01 | 大证据凭据漏扫 |
| G-13 | R7 P3 债务长期挂起 | R7 task | 2026-11-09 审计 | 证据/扫描可信度下降 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-10 | team | R7 P3 债务修复 | G-13 | archive/GBK/列数/size/timeout/多表 | `test-gates` 68/68 | 2026-11-23 | 用户 |
| T-11 | team | CI action SHA pin | G-12 | checkout/setup-node v4.4.0 SHA + Node 24.15.0 | CI run；RISK-R9-04 关闭 | 2026-11-23 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：`RISK-R7-06` 第三方 SCA、`RISK-R11-01..03` 观察；处理剩余 P3
- 下次复盘：第 15 个 `done` 任务或 1.11.2 发布前

## RETRO-0009 — 2026-11-09 — G5 — audit-remediation-1.13.0

### 1. 范围与指标

- 覆盖：审计整改 A1–A6、B1–B6、LP-P0-1..4、1.13.0 文档/版本
- 新增完成：15（A1–A6、B1–B3、B5–B6、LP-P0-1..4；B4 为 partial）
- 返工任务：0 / 15
- 审查轮次：审计 + 本地验证；本轮无独立 code-reviewer/security 复审（已登记限制）
- 首轮未关闭 P0/P1：0
- 最终未关闭 P0/P1：0
- 证据：`.ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md`、`CHANGELOG.md` 1.13.0、`docs/VERIFICATION.md` §5.47

### 2. 做得好（保留）

- 1.9.4 验证预算后，全量测试密度明显下降；本次进一步把 T3/T4 的“无条件重跑”改为条件式。
- `gate-check` 把 artifact/secret/state/checkpoint 的重复扫描合并为一次，并保留失败阻断。
- 所有权从“口头边界”升级为 manifest `excludes`/`ownershipPolicy` + `ownership-lint`。
- 大型项目 P0 先补 Program/Workstream、集成列车、影响面、队列，而不是新增角色。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-14 | 审计整改缺独立 reviewer/security 复审 | 本轮由 build 自验 | 无 REV/SEC 报告 | 结论独立性不足 |
| G-15 | 目标项目 team open 债务仍高 | `riccon-ai` team open 9 | `growth-check --debt` | 项目侧流程债务未清 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|

本轮无新增 `TEAM-CORE` 提案（净零）；P1/P2 已登记为 `TASK-AUDIT-2026-11-09-LP-*`，不进入团队 open。

### 5. 结论

- 本周期结论：保持
- 下一周期重点：LP-P1 成本/容量、专家 profile、CI 质量门禁；B4 目标项目债务处置；补独立 review
- 下次复盘：第 30 个 `done` 任务或 1.14.0 发布前

## 观察项（不计入团队 open）

- `R7-01..R7-06`：1.9.1 复审残余 P3；见 `TASK-IMPROVE-2026-11-08-R7.md`，复查日期 2026-11-23。
- `RISK-2026-11-08-R8-01`：1.9.4 证据已由 `ec6738c` 正式基线关闭。
- `RISK-2026-11-08-R8-02`：`review-check` 白名单缺 `node`；复查日期 2026-11-23。
- `RISK-2026-11-08-R8-03`：`验证预算` 关键词匹配可堆词；复查日期 2026-11-23。
- `RISK-2026-11-08-R8-04`：省略号 fail-closed 误伤；复查日期 2026-11-23。
