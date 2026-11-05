---
description: 制定并执行测试，输出覆盖矩阵、缺陷与测试报告
agent: ai-team/chief
---

测试范围：

$ARGUMENTS

执行测试模式：

1. 读取 `.ai-team/product/ACCEPTANCE.md`、`.ai-team/design/**`、`.ai-team/qa/**`。
2. 调度 `ai-team/qa-engineer`：更新测试策略/计划/用例/追踪矩阵。
2.1 QA brief 必须先通过 `brief-lint.mjs --agent ai-team/qa-engineer`；缺 `测试路径` 或路径不在 test source root 时不得派发。
3. 执行单元/集成/契约/E2E/性能/可访问性中适用的层次；记录命令、退出码、结果。
4. 缺陷写入 `.ai-team/qa/DEFECTS.md`（DEF-ID、严重级别、复现、证据）。
5. 输出 `.ai-team/qa/TEST-REPORT.md`：覆盖、通过/失败、未覆盖风险、结论。
6. 缺陷转对应 owner 修复；owner 只能置 `fixed`；**QA 独立回归后置 `verified`/`closed`**，不由工程师自判通过；S1/S2 必须有关闭证据。

不要修改生产代码；不要用 mock 冒充集成验证。环境不允许时记录 BLOCKED + 原始错误。
