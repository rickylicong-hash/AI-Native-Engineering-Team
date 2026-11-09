---
program: <program-name>
owner: ai-team/chief
track: T4
updated: YYYY-MM-DD
---

# Program — <program-name>

## 1. 目标与成功指标

- 目标：
- 成功指标（可度量）：
- 非目标：
- 约束（预算/时间/合规/环境）：

## 2. Workstreams

| ID | Owner | 范围 | 依赖 | 状态 | 契约 | 基线 |
|---|---|---|---|---|---|---|
| WS-01 | ai-team/engineer | <模块/目录> | - | planning / doing / review / done | API-CONTRACTS §x | pending / `<baseline_id>` |
| WS-02 | ai-team/engineer | <模块/目录> | WS-01 | planning / doing / review / done | API-CONTRACTS §y | pending / `<baseline_id>` |

规则：

- 每个 workstream 一个 lead owner；同一文件同一时间只有一个 writer。
- 跨 workstream 依赖必须写 ID；`program-check.mjs` 会检查未知依赖/自依赖/循环依赖。
- 每个 workstream 的详细范围写 `WORKSTREAM-<ID>.md`。

## 3. 里程碑

| 里程碑 | 日期 | 门禁 | 负责 | 验收 | 证据 |
|---|---|---|---|---|---|
| M1 | YYYY-MM-DD | G5 | ai-team/chief | <可检查条件> | <路径> |
| M2 | YYYY-MM-DD | G7 | ai-team/chief | <可检查条件> | <路径> |

## 4. 集成节奏

- 集成频率：每周 / 每里程碑 / 每 N 个 done。
- 集成候选：冻结 commit；每个候选只跑 1 条全量基线（`INTEGRATION.md`）。
- 合并顺序：按依赖拓扑，不按完成时间。
- 冲突处理：rebase/merge 后重跑受影响 V1；改变候选则基线失效。

## 5. 成本/容量观察（默认不设硬预算）

| Workstream | token 趋势 | 耗时趋势 | 全量测试次数 | 备注 |
|---|---|---|---|---|
| WS-01 | 观察 | 观察 | 0 | 仅观察；T4 预算需用户批准 |

## 6. 风险与决策

| ID | 风险/决策 | 影响 | Owner | 关闭条件/复查 |
|---|---|---|---|---|
| RISK-____ | ... | ... | ... | ... |

## 7. 当前状态

- 当前里程碑：
- 当前集成候选：
- 阻塞：
- 下一步：
