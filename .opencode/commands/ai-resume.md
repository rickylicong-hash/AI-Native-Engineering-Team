---
description: 从 HANDOFF 恢复上下文并继续未完成工作
agent: ai-team/chief
---

恢复项目：

1. 读取 `.ai-team/state/HANDOFF.md`、`STATUS.md`、`TASKS.md`、`DECISIONS.md`、`RISKS.md`。
2. 核对工作区 `git status --short` 与文件现状；发现与记忆不一致时，以文件和 git 证据为准并记录差异。
3. **先检查复盘是否到期**（`retro-check` / `ai-team-workflow` 3.1）。到期则先按 `/ai-retro` 轻量流程写 `team/GROWTH.md`，再继续编码或门禁。
4. 用一行复述：当前 Track/门禁、最近决策、未完成动作、下一步。
5. 直接继续 HANDOFF 中的“下一条指令”，不要重新做已完成工作。
6. 若 HANDOFF 缺失或过期，先补齐状态，再从 `TASKS.md` 中选择最高优先级未完成任务。

除非 L3 决策，不要反问。
