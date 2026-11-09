---
workstream: WS-01
program: <program-name>
owner: ai-team/engineer
stage: G4
updated: YYYY-MM-DD
---

# Workstream WS-01 — <name>

## 1. 范围

- 目标：
- 范围内：
- 非范围：
- 成功指标：

## 2. 文件所有权

- 允许修改：`<glob>`、`<glob>`
- 禁止修改：`<glob>`、`<glob>`
- 与其他 workstream 的共享文件/接口：

## 3. 契约与依赖

- 依赖的契约：`API-CONTRACTS.md` §x、`DATA-MODEL.md` §y、`ADR-____`
- 依赖的 workstream：WS-__（原因/接口）
- 对下游的契约承诺：
- 契约变更必须同提交更新契约与契约测试。

## 4. 任务

| TASK | Owner | 状态 | 验收 | 证据 |
|---|---|---|---|---|
| TASK-____ | ai-team/engineer | todo/doing/review/done | AC-1.. | <路径> |

## 5. 验证与基线

- V0/V1 命令：
- 全量基线：`baseline_id = <TASK>-<commit>-<run>` / pending
- 候选提交：
- 已知 flaky/skipped：
- 独立验证负责人：ai-team/code-reviewer / ai-team/qa-engineer

## 6. 证据与状态

- 证据目录：`.ai-team/work/TASK-*-EVIDENCE.md`
- 日志：`logs/<date>/` 或 `.ai-team/work/<TASK>-logs/`（UTF-8）
- 当前状态：planning / doing / review / blocked / done
- 阻塞/风险：
