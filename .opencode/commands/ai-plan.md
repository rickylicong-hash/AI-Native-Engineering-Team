---
description: 只做产品规划、UX/架构设计与任务计划，不写代码
agent: ai-team/chief
---

目标：

$ARGUMENTS

执行规划模式：

1. 读取/初始化 `.ai-team/`。
2. 调度 `ai-team/product-manager` 产出 PRD-lite（目标、用户、范围、FR/NFR、验收、优先级）。
3. 如涉及界面，调度 `ai-team/ux-designer` 产出 UX-SPEC/UI-SPEC/设计系统要点。
4. 调度 `ai-team/system-architect` 产出架构草案、ADR、数据/API 契约、失败模式。
5. 调度 `ai-team/qa-engineer` 产出测试策略；调度 `ai-team/security-auditor` 产出威胁模型草案。
6. 汇总任务 DAG（ID、owner、依赖、验收、证据要求）到 `state/TASKS.md`。
7. 停在 G3 Plan，不写生产代码；给出可执行计划与风险。

除非 L3 决策，不要反问；假设记录到 `state/DECISIONS.md`。
