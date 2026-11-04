---
description: 写入 HANDOFF 并生成新会话首条指令（不自动创建会话）
agent: ai-team/chief
---

执行一次完整交接，不自动创建任何会话：

1. 读取 `.ai-team/state/PROJECT.md`、`STATUS.md`、`TASKS.md`、`DECISIONS.md`、`RISKS.md`、`RUN_LOG.md`。
2. 更新 `STATUS.md`、`TASKS.md`、`RUN_LOG.md`：当前 Track/Stage、完成项、未完成项、阻塞、证据路径。
3. 按 skill `ai-team-workflow` 的 `templates/HANDOFF.md` 重写 `.ai-team/state/HANDOFF.md`，至少包含：
   - 时间、Track/Stage、目标；
   - 已完成（含证据路径）；
   - 未完成（TASK-ID、owner、下一步）；
   - 关键决策/风险；
   - 必读文件；
   - 下一条指令；
   - 新会话首条消息（可直接粘贴）。
4. 在回复中输出一个新会话首条消息，放在 `~~~text` 代码块里，内容格式：

~~~text
读取 .ai-team/state/HANDOFF.md 继续项目。
当前 Track/Stage：<T? / G?>。
下一条指令：<一句话>。
先核对 STATUS/TASKS，禁止重复已完成任务；遇到 L3 决策再问我。
~~~

5. 不要自动创建主会话。告诉用户：复制上面的消息到新会话，或在新会话使用 `/ai-resume`。
6. 如果上下文未接近上限、当前阶段也未结束，说明“可以继续在当前会话”，但仍然写 checkpoint。
7. 交接完成后，用 5 行以内汇报：当前阶段、已完成、未完成、下一条指令、HANDOFF 路径。
