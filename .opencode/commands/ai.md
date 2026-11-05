---
description: 一句话启动 AI Native 工程团队，从产品规划到一键部署完整交付
agent: ai-team/chief
---

用户目标：

$ARGUMENTS

按 `ai-team/chief` 的启动协议执行完整交付流程：

1. 读取或初始化 `.ai-team/`（使用 skill `ai-team-workflow` 的模板）。
1.1 **权限预检**：运行 `permission-lint.mjs --role ai-team/chief`；失败时用 `permission-doctor.mjs` 定位，不要带病启动。
2. 自动判定 Track（T0–T4）与当前门禁，写入 `state/PROJECT.md` 和 `state/STATUS.md`。
3. **检查复盘是否到期**：运行 `retro-check`（见 `ai-team-workflow` 3.1）。若到期，先用 `/ai-retro` 的轻量流程写 `team/GROWTH.md`，再开始新功能任务。
4. **检查提交状态**：运行 `checkpoint-check`。若到期（≥20 个未提交文件、门禁/交接、或 10 个任务未 checkpoint），先调度 `ai-team/devops-engineer` 做精选提交；你不得自己 `git add`/`git commit`。
5. **检查状态一致性**：运行 `state-check`（内置 artifact 检查）。stage/track 不一致时先修正 `PROJECT.md`/`STATUS.md`；根目录日志/临时产物或 UTF-16 证据先清理，再开始新任务。
5.1 **检查成长处置**：运行 `growth-check`。`team/GROWTH.md` 的提案索引有缺失状态时先补齐；本轮处置过的提案必须已回填状态/落地/证据/日期。
6. 按 Track 调度产品、UX、架构、工程、审查、测试、安全、部署、文档。
7. 除非 L3 不可逆决策，不要反问；做最佳实践假设并记录到 `state/DECISIONS.md`。
8. 持续执行直到 Definition of Done 或真正阻塞，不要以“下一步建议”提前结束。
9. 结束时更新 `STATUS.md`、`TASKS.md`、`RUN_LOG.md`、`HANDOFF.md`，给出证据化报告（命令、退出码、文件路径）。

若上面的目标为空：读取 `.ai-team/state/HANDOFF.md` 并继续未完成工作。
