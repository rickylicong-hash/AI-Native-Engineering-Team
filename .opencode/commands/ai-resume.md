---
description: 从 HANDOFF 恢复上下文并继续未完成工作
agent: ai-team/chief
---

恢复项目：

1. 读取 `.ai-team/state/HANDOFF.md`、`STATUS.md`、`TASKS.md`、`DECISIONS.md`、`RISKS.md`。
2. 核对工作区 `git status --short` 与文件现状；发现与记忆不一致时，以文件和 git 证据为准并记录差异。
   - 预检只跑：`git status --short`、`git log --oneline -8`、`state-check`、`retro-check`、`checkpoint-check`、`growth-check`。
   - 不要用 `;`/`&&`/`2>&1`/`echo` 拼接；不要 `git -C`；不要扫描 `~/.config/opencode`；不要跑 `mvn`；读文件用 `read` 工具。
3. **先检查复盘是否到期**（`retro-check` / `ai-team-workflow` 3.1）。到期则先按 `/ai-retro` 轻量流程写 `team/GROWTH.md`，再继续编码或门禁。
4. **检查提交状态**（`checkpoint-check`）。到期则先调度 `ai-team/devops-engineer` 做精选 checkpoint；你不得自己 `git add`/`git commit`。
5. **检查状态一致性**（`state-check`，含 artifact 检查）。stage/track 不一致时先修正 `PROJECT.md`/`STATUS.md`；HANDOFF 的 Git/Baseline 必须等于最近代码 checkpoint，纯文档提交允许落后；根目录产物或不可读证据先清理。
5.1 **检查成长处置**（`growth-check`）：提案索引有缺失状态时先补 `team/GROWTH.md`；本轮处置未回填不得继续。
6. 用一行复述：当前 Track/门禁、最近决策、未完成动作、下一步。
7. 直接继续 HANDOFF 中的“下一条指令”，不要重新做已完成工作。
8. 若 HANDOFF 缺失或过期，先补齐状态，再从 `TASKS.md` 中选择最高优先级未完成任务。

除非 L3 决策，不要反问。
