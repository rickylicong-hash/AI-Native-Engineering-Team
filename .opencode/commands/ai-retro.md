---
description: 阶段复盘、团队改进提案与经验沉淀（每 10 个 done、门禁前、事故后）
agent: ai-team/chief
---

复盘范围：

$ARGUMENTS

执行复盘模式：

1. 读取 `.ai-team/state/TASKS.md`、`RUN_LOG.md`、`RISKS.md`、`STATUS.md`、`reviews/**`、`qa/DEFECTS.md`、`security/**`；已有 `team/GROWTH.md` 时先读它的 frontmatter 和历史条目。
2. 计数：`TASKS.md` 中状态以 `done` 开头的行（含 `done（待确认）`）；`superseded` 不算，返工 `-R1`/`-R2` 算；同一 TASK-ID 只算一次。与 `tasks_at_last_retro` 比较，得出本次覆盖任务数。
3. 统计：一次验收通过率、返工原因、审查轮次/重复 P1、测试基线变化、交接缺失、未提交改动、跨职责事件。
4. 按角色评估：产出完整性、范围遵守、证据质量、协作质量；只评价有证据的行为，不评价“感觉”。
5. 首次到期时创建 `.ai-team/team/GROWTH.md`（使用 `ai-team-workflow` 的 `templates/GROWTH.md`）；否则追加 `RETRO-000N`，不覆盖历史。内容：
   - 本周期指标与覆盖任务；
   - 做得好（保留）；
   - 问题（每条 ≥2 次证据；一次性问题写 `RISKS.md`）；
   - 改进提案（最小改动、可验收、不与现有角色重复）；
   - 需要用户批准的事项。
6. 更新 frontmatter：`last_retro`、`last_gate`、`tasks_at_last_retro`、`next_due_at`（= 当前 done + 10）、`last_trigger`。
7. 更新 `state/STATUS.md` 的 `Retro:` 行、`state/HANDOFF.md` 和 `state/RUN_LOG.md`。
8. 若项目跟踪 `.ai-team`，写完后调度 `ai-team/devops-engineer` 做一次 checkpoint；你不得自己 `git add`/`git commit`，push 需用户批准。
9. 汇报：覆盖任务数、3 个主要问题、3 个提案、到期状态和下一次触发点。

不要直接修改 `.opencode/**` 或全局团队配置；只写提案。到期未做复盘时，不要开始新的功能任务，也不要把门禁标为通过。
