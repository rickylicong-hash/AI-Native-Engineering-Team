---
description: 只做 UI/UX、架构与契约设计，不写实现
agent: ai-team/chief
---

设计目标：

$ARGUMENTS

执行设计模式：

1. 读取 `.ai-team/product/**` 与 `state/PROJECT.md`。
2. 调度 `ai-team/ux-designer`：用户流程、信息架构、线框/UI 规格、设计 token、可访问性、状态清单。
3. 调度 `ai-team/system-architect`：架构、模块边界、数据模型、API/事件契约、失败模式、部署拓扑、ADR。
4. 调度 `ai-team/security-auditor`：威胁模型与安全设计输入（只写 `.ai-team/security/**`）。
5. 调度 `ai-team/qa-engineer`：测试策略与可测试性评审（只写 `.ai-team/qa/**`）。
6. 组织跨角色设计评审，结论写入 `state/STATUS.md`；未通过则回到 owner 修改。

停在 G2 Design，不写生产代码。除非 L3 决策，不要反问。
