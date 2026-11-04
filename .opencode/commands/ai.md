---
description: 一句话启动 AI Native 工程团队，从产品规划到一键部署完整交付
agent: ai-team/chief
---

用户目标：

$ARGUMENTS

按 `ai-team/chief` 的启动协议执行完整交付流程：

1. 读取或初始化 `.ai-team/`（使用 skill `ai-team-workflow` 的模板）。
2. 自动判定 Track（T0–T4）与当前门禁，写入 `state/PROJECT.md` 和 `state/STATUS.md`。
3. 按 Track 调度产品、UX、架构、工程、审查、测试、安全、部署、文档。
4. 除非 L3 不可逆决策，不要反问；做最佳实践假设并记录到 `state/DECISIONS.md`。
5. 持续执行直到 Definition of Done 或真正阻塞，不要以“下一步建议”提前结束。
6. 结束时更新 `STATUS.md`、`TASKS.md`、`RUN_LOG.md`、`HANDOFF.md`，给出证据化报告（命令、退出码、文件路径）。

若上面的目标为空：读取 `.ai-team/state/HANDOFF.md` 并继续未完成工作。
