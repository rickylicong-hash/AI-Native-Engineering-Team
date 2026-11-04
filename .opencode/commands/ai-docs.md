---
description: 生成/更新 README、API、运维手册与变更日志，并验证命令
agent: ai-team/chief
---

文档范围：

$ARGUMENTS

执行文档模式：

1. 读取 `.ai-team/product/**`、`.ai-team/design/**`、`.ai-team/release/**`、现有 README/docs。
2. 调度 `ai-team/technical-writer`：按 Diátaxis 组织 tutorial/how-to/reference/explanation。
3. 必须覆盖：README 快速开始、配置、API、运维（安装/升级/回滚）、故障处理、CHANGELOG。
4. 文档中的命令必须在临时目录/干净环境执行；记录版本、命令、退出码、预期输出。
5. 检查链接、术语一致性、敏感信息、可访问性。
6. 文档与实现不一致时，以代码/测试为准，报告 Chief；不要擅自改代码。

输出：文档路径、验证证据、未决问题。
