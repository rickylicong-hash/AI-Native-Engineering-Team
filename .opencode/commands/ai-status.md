---
description: 查看团队当前阶段、任务、风险与下一步
agent: ai-team/chief
---

读取并汇报项目状态：

1. 读取 `.ai-team/state/PROJECT.md`、`STATUS.md`、`TASKS.md`、`RISKS.md`、`HANDOFF.md`。
2. 读取最近的门禁结论、未关闭缺陷/风险。
3. 用不超过 15 行汇报：
   - Track / 当前门禁 / 总体进度；
   - 正在做（owner + TASK-ID）；
   - 阻塞/风险（ID + owner）；
   - Retro：due / not due（done N，last N，next N）；到期时明确写“先补复盘”；
   - 下一步 3 项；
   - 证据路径。
4. 不要修改文件，不要启动新工作。

若 `.ai-team/` 不存在，说明团队尚未初始化，并给出 `/ai <目标>` 的启动示例。
