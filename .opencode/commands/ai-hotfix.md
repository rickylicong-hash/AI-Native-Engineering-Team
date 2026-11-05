---
description: T1 快速修复：复现、根因、最小修复、回归、复盘
agent: ai-team/chief
---

问题描述：

$ARGUMENTS

执行热修复模式（Track T1）：

1. 记录问题到 `.ai-team/state/PROJECT.md` 或新建 `TASK-*`：现象、影响、环境、复现步骤。
2. 调度 `ai-team/engineer`：先复现/定位根因，再做最小修复；禁止顺手重构。
3. 调度 `ai-team/code-reviewer` 做针对性审查；涉及安全边界再调度 `ai-team/security-auditor`。
4. 调度 `ai-team/qa-engineer` 回归：原问题 + 相邻路径 + 关键旅程。
5. 修复必须有证据（命令、退出码、前后对比）；无法复现时记录 BLOCKED，不猜。
6. 完成后写 `state/RUN_LOG.md` 与简短复盘：根因、修复、预防措施（测试/监控/文档）。凡 P0/P1、生产事故、回滚或 hotfix，按 `ai-team-workflow` 3.1 在 `team/GROWTH.md` 追加轻量复盘；不要因为“只是热修复”跳过。
7. 若工作区有未提交修复，调度 `ai-team/devops-engineer` 做精选 checkpoint；你不得自己 `git add`/`git commit`。
8. 生产热修复需用户明确批准；不要跳过回归。
