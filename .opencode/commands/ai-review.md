---
description: 对指定范围做独立代码审查与安全审计，只出报告
agent: ai-team/chief
---

审查范围：

$ARGUMENTS

执行审查模式：

1. 读取 `.ai-team/product/ACCEPTANCE.md`、`.ai-team/design/**`、`state/TASKS.md`。
2. 确定 diff/变更文件/commit 范围；若参数为空，审查当前工作区未提交改动。
3. 调度 `ai-team/code-reviewer`：正确性、契约、测试质量、可维护性、越权检查。
4. 调度 `ai-team/security-auditor`：威胁面、鉴权、输入/输出、密钥、依赖、配置。
5. 两份报告分别写入 `.ai-team/reviews/**` 与 `.ai-team/security/**`。
6. 汇总阻断项（P0/P1、Critical/High）、非阻断项、修复 owner 与关闭条件；每个有实际风险的 P2 必须给出 `TASK-*`/`RISK-*`/书面接受处置；同一任务第 3 轮仍不通过时给 Chief 拆分/降级/接受风险建议。

不要修改代码；修复由原 owner 执行。若发现 P0/Critical，明确阻断发布。
