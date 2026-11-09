---
description: 写入 HANDOFF 并生成新会话首条指令（不自动创建会话）
agent: ai-team/chief
---

执行一次完整交接，不自动创建任何会话：

1. 读取 `.ai-team/state/PROJECT.md`、`STATUS.md`、`TASKS.md`、`DECISIONS.md`、`RISKS.md`、`RUN_LOG.md`。
2. 更新 `STATUS.md`、`TASKS.md`、`RUN_LOG.md`：当前 Track/Stage、完成项、未完成项、阻塞、证据路径。
3. **统一交接预检**：运行 `node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\gate-check.mjs" --project . --mode handoff --json`（artifact/secret 一次，state/checkpoint 复用）。按失败项处理：
   - `retro` 到期 → 先按 `/ai-retro` 轻量流程写 `team/GROWTH.md`，不要把复盘债务交给下一个会话；
   - `checkpoint` 到期 → 先调度 `ai-team/devops-engineer` 做精选 checkpoint；你不得自己 `git add`/`git commit`；用户明确要求暂不提交时，在 HANDOFF 写 `Checkpoint: WAIVED`、原因和 `RISK-*`；
   - `state` error → 先修正 `PROJECT.md`/`STATUS.md`；HANDOFF 的 Git/Baseline 必须等于最近代码 checkpoint，纯文档提交允许落后；
   - `growth` error → 先补提案处置索引/净零；同一批次重复 TASK-ID 不得交接。
   只有定位时才单独运行 `retro-check`/`checkpoint-check`/`state-check`/`growth-check`，不要重复扫描。STATUS 的 `Retro`/`Growth`/`远程` 行由 checkpoint 脚本生成，不手写。
6. 按 skill `ai-team-workflow` 的 `templates/HANDOFF.md` 重写 `.ai-team/state/HANDOFF.md`，至少包含：
   - 时间、Track/Stage、目标；
   - 已完成（含证据路径）；
   - 未完成（TASK-ID、owner、下一步）；
   - 关键决策/风险；
   - Retro 状态（not due / done / DUE）；
   - Checkpoint 状态（clean / done / DUE / WAIVED）；
   - Growth 状态（open N / done M / 最近处置日期）；
   - Git / Baseline（最近代码 checkpoint；Baseline 默认同 Git）；
   - 必读文件；
   - 下一条指令；
   - 新会话首条消息（可直接粘贴）。
7. 在回复中输出一个新会话首条消息，放在 `~~~text` 代码块里，内容格式：

~~~text
读取 .ai-team/state/HANDOFF.md 继续项目。
当前 Track/Stage：<T? / G?>。
下一条指令：<一句话>。
先核对 STATUS/TASKS，禁止重复已完成任务；遇到 L3 决策再问我。
~~~

8. 不要自动创建主会话。告诉用户：复制上面的消息到新会话，或在新会话使用 `/ai-resume`。
9. 如果上下文未接近上限、当前阶段也未结束，说明“可以继续在当前会话”，但仍然写 checkpoint。
10. 交接完成后，用 5 行以内汇报：当前阶段、已完成、未完成、下一条指令、HANDOFF 路径。
