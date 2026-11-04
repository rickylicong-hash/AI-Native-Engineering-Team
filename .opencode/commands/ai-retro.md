---
description: 阶段复盘、团队改进提案与经验沉淀
agent: ai-team/chief
---

复盘范围：

$ARGUMENTS

执行复盘模式：

1. 读取 `.ai-team/state/RUN_LOG.md`、`TASKS.md`、`RISKS.md`、`reviews/**`、`qa/DEFECTS.md`、`security/**`。
2. 统计：一次验收通过率、返工原因、审查发现、交接缺失、跨职责事件、发布问题。
3. 按角色评估：产出完整性、范围遵守、证据质量、协作质量。
4. 写 `.ai-team/team/GROWTH.md`：
   - 做得好的（保留）；
   - 问题（证据 ≥2 次才立项）；
   - 改进提案（最小改动、可验收、不重复现有能力）；
   - 需要用户批准的事项。
5. 更新 `state/HANDOFF.md` 与 `state/STATUS.md`。

不要直接修改 `.opencode/**` 或全局团队配置；只写提案。
