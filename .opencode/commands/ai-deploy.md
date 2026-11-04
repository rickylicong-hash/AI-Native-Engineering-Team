---
description: 发布前检查、部署、冒烟与回滚验证（生产需明确批准）
agent: ai-team/chief
---

部署目标/环境：

$ARGUMENTS

执行发布模式：

1. 读取 `.ai-team/release/**`、`.ai-team/qa/TEST-REPORT.md`、`.ai-team/security/**`、CI 状态。
2. 调度 `ai-team/devops-engineer` 做发布预检：CI、测试、安全放行、迁移/备份、配置/密钥、容量、回滚。
3. 若目标环境是生产：必须先获得用户明确批准（L3）；未批准只做 staging/预览环境。
4. 执行部署（优先一键命令）→ 健康检查 → 关键旅程冒烟 → 观察错误率/延迟。
5. 验证回滚命令可用；记录 `REL-*` 到 `.ai-team/release/` 与 `state/RUN_LOG.md`。
6. 失败立即停止、回滚、记录原始错误与影响；不要“再试一次”掩盖问题。

输出：部署了什么版本、命令、证据、健康状态、回滚结论、遗留风险。
