# 示例

## 1. 从零做一个产品（T3）

```text
/ai 做一个面向小团队的 OKR 管理 SaaS，Web 端，支持多租户、SSO、审计日志，先做 MVP
```

预期：Chief 判 T3，走 G0–G8，产出 PRD、UX、架构/ADR、任务 DAG、实现、审查、测试、安全、部署、文档、复盘。

## 2. 给现有项目加功能（T2）

```text
/ai 给现有后台加一个“批量导出 CSV”功能，支持筛选和权限，注意大数据量
```

预期：PRD-lite → 设计 note → 实现 → 代码审查 → QA → 安全检查；不会强行套完整产品流程。

## 3. 修 Bug（T1）

```text
/ai-hotfix 登录后偶发 401，刷新后又正常
```

预期：复现 → 根因 → 最小修复 → 代码审查 → 回归测试 → 简短复盘。

## 4. 只做规划（不写代码）

```text
/ai-plan 做一个内部知识库问答机器人，支持权限和引用
```

预期：产品/UX/架构/测试策略/威胁模型 + 任务 DAG，停在 G3 Plan。

## 5. 审查

```text
/ai-review 当前未提交改动
```

预期：代码审查 + 安全审计两份报告，列出 P0–P3 / Critical–Low、关闭条件与 owner。

## 6. 查看状态

```text
/ai-status
```

预期：15 行内汇报 Track、门禁、进行中、阻塞、下一步。

## 7. 恢复

```text
/ai-resume
```

预期：读 `.ai-team/state/HANDOFF.md`，从上次中断处继续。

## 8. 产物在哪

```text
.ai-team/state/       # 目标、状态、任务、决策、风险、交接
.ai-team/product/     # PRD、故事、验收
.ai-team/design/      # UX、架构、ADR
.ai-team/work/        # 任务证据
.ai-team/reviews/     # 代码审查
.ai-team/qa/          # 测试报告、缺陷
.ai-team/security/    # 威胁模型、安全审查
.ai-team/release/     # 发布、部署、回滚
```

先看 `.ai-team/state/STATUS.md` 和 `.ai-team/state/HANDOFF.md`。

## 9. 真实输出样例

`examples/smoke/SPIKE-0001.md` 是一次受控端到端测试中 Technical Writer 产出的 T0 评审报告（192 行，含文件:行号证据）。它展示了：

- 如何用证据而不是“感觉”下结论；
- 如何按严重度列问题并给修复建议；
- 如何在报告中声明未执行项与限制。

该报告指出的 5 个问题已在当前版本修复，详见 `docs/VERIFICATION.md`。
