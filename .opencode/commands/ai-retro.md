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
5.1 **先处置、再新增（三层入口 + 净零，1.9.0）**：
   - 把每条提案分类为 `TEAM-CORE` / `PROJECT-PROFILE` / `OBSERVE`：`TEAM-CORE` 只收跨项目复用、通用脚本/模板缺陷、≥2 项目或 ≥3 任务证据；单项目策略（迁移号、worktree、CI/BOM、状态格式、VEX 例外）归 `PROJECT-PROFILE`，落到项目 `.ai-team/tasks` 或 `profiles/`；一次性现象归 `OBSERVE`，写 `RISKS.md` + 复查日期；
   - 只有 `scope: team` 计入团队 open；`PROJECT-PROFILE` 在索引中保留 `scope: project` 追踪，但不占团队 open；
   - team open ≥3 时，本轮至少关闭/合并/延期 2 条；
   - 新增 `TEAM-CORE` 提案 ≤2，且 ≤ 本轮关闭/合并数（净零）；
   - 团队 open 连续两轮上升时不得新增，先清债；
   - 每条提案必须写 scope、owner、验收方式、复查日期；`deferred` 必须写复查触发点。
6. 更新 frontmatter：`last_retro`、`last_gate`、`tasks_at_last_retro`、`next_due_at`（= 当前 done + 10）、`last_trigger`、`last_retro_new`、`last_retro_closed`；把上一轮的 `team_open_at_last_retro` 前移到 `team_open_at_prev_retro`，上一轮 `prev` 前移到 `prev2`，本轮团队 open 写入 `last`。
6.1 在“提案处置索引”为每条新提案登记 `proposed` 和 `scope`；本轮已处置的提案同一轮回填 `done/rejected/superseded` + 落地版本/任务 + 证据 + 日期。`PROJECT-PROFILE` 用 `scope: project`，不计入团队 open。
7. 先运行 `state-check`（重复 TASK-ID、非标准 done、artifact/编码问题直接失败），再运行 `growth-check --debt`；检查 team/project open、年龄、重复簇和净零；有缺失状态或净零违规先补/先清债，不得用新增提案掩盖。输出 open/done 数量。全部处置且非最近一轮的 RETRO，给出 `growth-check --archive` 归档计划（需 `--yes` 才移动）。
8. 更新 `state/STATUS.md` 的当前状态、`state/HANDOFF.md` 和 `state/RUN_LOG.md`；STATUS 的 `Retro`/`Growth`/`远程`/`Checkpoint` 行以 checkpoint 脚本生成为准，不要长期手写；更新后再跑一次 `state-check`。
9. 若项目跟踪 `.ai-team`，写完后调度 `ai-team/devops-engineer` 做一次 checkpoint；你不得自己 `git add`/`git commit`，push 需用户批准。
10. 汇报：覆盖任务数、3 个主要问题、3 个提案、处置状态（open/done）、到期状态和下一次触发点。

不要直接修改 `.opencode/**` 或全局团队配置；只写提案。到期未做复盘时，不要开始新的功能任务，也不要把门禁标为通过。
