---
description: 一句话启动 AI Native 工程团队，从产品规划到一键部署完整交付
agent: ai-team/chief
---

用户目标：

$ARGUMENTS

按 `ai-team/chief` 的启动协议执行完整交付流程：

0. **版本/会话一致性**：如果本次安装/更新过团队（`node scripts/version.mjs --update`），必须新开 OpenCode 会话后再继续；旧会话可能仍使用旧权限缓存。出现非破坏性命令被 `Permission denied` 时，先查 `version.mjs` 并新开会话，不要扩大 allow。
1. 读取或初始化 `.ai-team/`（使用 skill `ai-team-workflow` 的模板）。
1.1 **权限预检**：运行 `node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\permission-lint.mjs" --role chief`；失败时用 `permission-doctor.mjs` 定位，不要带病启动。
2. 自动判定 Track（T0–T4）与当前门禁，写入 `state/PROJECT.md` 和 `state/STATUS.md`。
3. **统一预检**：运行 `gate-check.mjs --project . --mode start --json`（artifact/secret 只扫一次，state/checkpoint 复用结果）。按失败项处理：
   - `retro` 到期 → 先用 `/ai-retro` 轻量流程写 `team/GROWTH.md`，再开始新功能任务；
   - `checkpoint` 到期（≥20 个未提交文件、门禁/交接、或 10 个任务未 checkpoint）→ 先调度 `ai-team/devops-engineer` 做精选提交；DevOps 提交后用 `--mark --sync-docs` 同步 HANDOFF/STATUS；你不得自己 `git add`/`git commit`；
   - `state` error → 先修正 `PROJECT.md`/`STATUS.md`；根目录日志/临时产物或 UTF-16 证据先清理；
   - `growth` error → 先补齐提案处置索引/净零；本轮处置过的提案必须回填状态/落地/证据/日期。
   只有需要定位时才单独运行 `retro-check`/`checkpoint-check`/`state-check`/`growth-check`，不要重复扫描。
6. 按 Track 调度产品、UX、架构、工程、审查、测试、安全、部署、文档。
7. 除非 L3 不可逆决策，不要反问；做最佳实践假设并记录到 `state/DECISIONS.md`。
8. 持续执行直到 Definition of Done 或真正阻塞，不要以“下一步建议”提前结束。
9. 结束时更新 `STATUS.md`、`TASKS.md`、`RUN_LOG.md`、`HANDOFF.md`，给出证据化报告（命令、退出码、文件路径）。

若上面的目标为空：读取 `.ai-team/state/HANDOFF.md` 并继续未完成工作。
