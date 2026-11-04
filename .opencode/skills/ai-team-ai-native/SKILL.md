---
name: AI Native Engineering
description: AI 功能工程手册：eval-driven development、prompt/模型版本化、RAG 评测、agent 工具权限、guardrails、成本/延迟、隐私与红队。项目含 LLM/AI 能力时使用。
---

# AI Native Engineering

AI 功能不是“接一个模型 API”，而是**可评测、可回滚、可控制、可负担**的软件系统。

## 1. 适用场景

- LLM 对话/助手/Agent；
- RAG 知识库问答；
- 文本分类/抽取/摘要/翻译；
- 图像/语音/多模态；
- 推荐/排序/预测；
- 任何“输出不确定、需要质量评估”的功能。

## 2. 核心原则

1. **Eval-first。** 先定义任务、数据、指标、基线，再接模型/写 prompt。
2. **版本化。** prompt、模型、参数、检索索引、工具定义都可版本化、可回滚。
3. **契约化。** 输入/输出 schema、错误/降级、超时、重试、幂等。
4. **最小权限。** Agent 工具白名单、租户隔离、高风险动作人工确认。
5. **可观测。** 质量、延迟、成本、错误率、用户反馈线上可见。
6. **隐私默认。** 数据最小化、脱敏、保留期、供应商数据使用审查。
7. **人类兜底。** 高风险/低置信度转人工；可解释、可纠正。
8. **成本可控。** token/调用预算、缓存、批处理、模型分级。

## 3. 开发流程

```text
任务定义
  → 数据/评测集（golden set + 边界/对抗）
  → 基线（规则/旧模型/人工）
  → prompt/模型/检索方案
  → 离线 eval（质量/延迟/成本/安全）
  → 集成（契约/超时/降级/缓存）
  → 线上灰度 + 监控
  → 反馈闭环 + 回归 eval
```

没有 eval 的 AI 功能视为未完成。

## 4. 任务定义

必须写清：

- 用户任务与成功标准；
- 输入（文本/文件/图片/结构化）；
- 输出 schema（字段/类型/必填/范围）；
- 失败模式（无答案/歧义/超长/多语言/恶意输入）；
- 延迟/成本预算；
- 隐私/合规约束；
- 人工介入点。

## 5. 评测集

- **Golden set**：代表真实分布的 50–500 条（按任务）；
- **边界集**：空/超长/多语言/格式错误/冲突信息；
- **对抗集**：prompt injection、越权、诱导泄露、幻觉诱导；
- **回归集**：历史失败案例；
- **分层**：按用户/场景/难度分层，避免平均分掩盖短板；
- 标注：双人/仲裁（高风险）；记录标注指南与一致性。

## 6. 指标

| 任务 | 指标 |
|---|---|
| 分类/抽取 | accuracy、precision/recall/F1、schema valid rate |
| 生成/摘要 | 人工评分、LLM-judge（需校准）、ROUGE/BERTScore（辅助） |
| RAG | faithfulness、answer relevance、context precision/recall、citation accuracy |
| Agent | task success、tool call accuracy、steps、cost、unsafe action rate |
| 对话 | helpfulness、coherence、safety、resolution rate |
| 系统 | p50/p95 latency、tokens/request、cost/request、error rate |

LLM-as-judge 必须：固定 judge 模型/版本、盲评/随机顺序、人工校准、报告一致性；不能单独作为高风险放行依据。

## 7. Prompt 工程

- 明确角色/任务/输入/输出/约束/示例；
- 输出 schema（JSON Schema/函数调用），少用自由文本；
- 指令与数据隔离（分隔符/标签）；不把用户内容当指令；
- 少样本示例覆盖边界；
- 版本化：`prompt_id@version`，变更记录；
- 回归：每次 prompt/模型变更跑 eval；
- 不把密钥/内部规则放 prompt；
- 多语言/长度/格式兼容。

## 8. RAG

- 切分：按语义/结构；记录 chunk size/overlap；
- 嵌入：模型版本、维度、归一化；
- 检索：hybrid（BM25+向量）、过滤（租户/权限/时间）、rerank；
- 生成：引用来源、无答案策略、冲突处理；
- 评测：context recall/precision、faithfulness、citation；
- 更新：索引版本、删除传播、权限变更；
- 安全：租户隔离、文档级权限、prompt injection 防护。

## 9. Agent / 工具

- 工具白名单；每个工具最小权限；
- 参数 schema 校验；超时/重试/幂等；
- 高风险动作（付款/删除/发送/部署）人工确认；
- 步骤/成本上限；循环检测；
- 工具输出视为不可信数据，不当指令；
- 审计：谁、何时、调了什么、结果；
- 沙箱/网络隔离（代码执行/浏览器）。

## 10. Guardrails

- 输入：长度/格式/注入检测/敏感内容；
- 输出：schema 校验、敏感信息/PII、引用/置信度；
- 工具：权限/参数/速率；
- 业务：价格/库存/权限等规则校验；
- 失败：安全拒答/转人工/降级；
- 红队：越狱、数据外传、工具滥用、间接注入。

## 11. 成本/延迟

- 模型分级：小模型路由/大模型兜底；
- 缓存：精确/语义缓存（注意权限/时效）；
- 批处理/流式；
- token 预算：输入截断/摘要/检索 top-k；
- 超时/重试/熔断；
- 成本监控：按用户/租户/功能；
- 容量：QPS/并发/token 配额。

## 12. 线上监控

- 质量：抽样人工/LLM-judge、用户反馈（赞/踩/纠正）；
- 延迟/错误/成本；
- 安全：拒答率、注入尝试、异常工具调用；
- 数据：分布漂移、空答案、检索命中率；
- 告警：SLO/预算/异常；
- 灰度：按用户/租户/流量；可回滚。

## 13. 隐私/合规

- 数据最小化；不发送不必要 PII；
- 供应商数据处理/保留/训练使用审查；
- 租户隔离；日志脱敏；
- 用户删除/导出；
- 模型/数据位置（跨境）；
- 人类审核/告知（按场景）。

## 14. 交付物

```text
.ai-team/design/architecture/
  AI-SPEC.md          # 任务、输入/输出、模型、工具、失败模式
.ai-team/qa/
  EVAL-PLAN.md        # 评测集、指标、基线、阈值
  EVAL-REPORT.md      # 结果、回归、风险
.ai-team/security/
  AI-THREAT-MODEL.md  # prompt injection/工具/数据
prompts/
  <prompt_id>@<version>.md
evals/
  dataset/
  runners/
  reports/
```

## 15. 放行标准

- [ ] 任务/输出契约明确；
- [ ] Golden/边界/对抗集齐全；
- [ ] 基线对比；指标达标；
- [ ] 延迟/成本在预算内；
- [ ] 注入/越权/泄露测试通过；
- [ ] 降级/人工兜底可用；
- [ ] 线上监控/告警/回滚就绪；
- [ ] 隐私/供应商审查完成；
- [ ] 版本可追溯、可回滚。

## 16. 反模式

- 没有 eval，只靠“感觉不错”；
- 一个 prompt 打天下，无版本；
- 用 LLM-judge 代替人工校准；
- RAG 不评估检索，只评估最终答案；
- Agent 工具全权限；
- 把网页/文档内容当指令；
- 不记录 token/成本；
- 线上无抽样/反馈；
- 失败时静默返回空/编造；
- 把“模型升级”当“质量提升”。

## 17. 参考文件

- [EVALS.md](references/EVALS.md)：评测集、指标、LLM-judge、回归门禁
- [GUARDRAILS.md](references/GUARDRAILS.md)：输入/输出/工具/RAG/隐私/红队
- [EVAL-PLAN.md](templates/EVAL-PLAN.md)：评测计划模板
- [PROMPT-SPEC.md](templates/PROMPT-SPEC.md)：prompt 契约与版本模板
