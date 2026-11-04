# Evals Reference — 评测设计与执行

## 1. 评测集设计

| 集合 | 目的 | 规模 | 来源 |
|---|---|---|---|
| Golden | 代表真实分布 | 50–500 | 生产抽样/用户访谈/专家 |
| Edge | 边界/异常 | 30–100 | 空、超长、多语言、格式错误、冲突 |
| Adversarial | 注入/越权/泄露 | 20–100 | 红队/公开攻击样本 |
| Regression | 历史失败 | 持续增长 | 缺陷/用户反馈 |
| Holdout | 防过拟合 | 20% | 不参与调参 |

规则：

- 每条有输入、期望（或评分标准）、分层标签；
- 双人标注/仲裁（高风险）；记录一致性（Cohen's kappa）；
- 不把评测集内容泄露到 prompt/训练；
- 版本化数据集（`dataset@version`）；
- 定期补充真实分布变化。

## 2. 指标选择

### 分类/抽取

- accuracy / precision / recall / F1；
- schema valid rate；
- 字段级准确率；
- 校准（confidence vs accuracy）。

### 生成

- 人工 rubric（1–5）：正确性、完整性、相关性、语气、安全；
- LLM-judge（需校准）：成对比较/评分；
- 自动指标：ROUGE/BERTScore 仅辅助；
- 引用准确率；
- 拒答正确率（该拒答时拒答）。

### RAG

| 指标 | 问题 |
|---|---|
| Context recall | 检索是否召回了所需信息？ |
| Context precision | 召回内容是否相关？ |
| Faithfulness | 答案是否忠于上下文？ |
| Answer relevance | 是否回答了用户问题？ |
| Citation accuracy | 引用是否支持结论？ |
| No-answer rate | 无答案时是否正确拒答？ |

### Agent

- task success rate；
- tool selection accuracy；
- argument accuracy；
- steps / latency / cost；
- unsafe action rate；
- recovery rate（失败后恢复）。

## 3. LLM-as-Judge 规范

- 固定 judge 模型/版本/参数；
- 盲评、随机顺序、避免位置偏差；
- 明确 rubric 与评分档位；
- 人工校准 50–100 条，报告一致性；
- 对高风险结论不单独使用；
- 记录 judge prompt 版本；
- 定期用人工样本复校。

## 4. 执行

```text
1. 冻结被测版本（prompt/model/retrieval/tools）
2. 跑基线（旧版本/规则/人工）
3. 跑新版本（相同数据集/参数）
4. 分层报告（场景/难度/语言）
5. 统计显著性/置信区间（样本足够时）
6. 失败案例分析（聚类）
7. 结论：通过/不通过/需人工复核
```

## 5. 回归门禁

- 质量：核心指标不低于基线，关键分层不下降；
- 安全：注入/越权/泄露 0 通过；
- 延迟：p95 在预算内；
- 成本：tokens/request、cost/request 在预算内；
- 稳定性：重复运行方差可接受；
- 变更必须附 eval 报告；无报告不合并。

## 6. 报告模板

```markdown
# EVAL-0001 — <版本>

## 配置
- Prompt:
- Model:
- Retrieval:
- Dataset:
- Judge:

## 结果
| 指标 | 基线 | 新版本 | 变化 | 阈值 | 结论 |
|---|---|---|---|---|---|

## 分层
| 分层 | 基线 | 新版本 | 备注 |
|---|---|---|---|

## 失败案例
- ...

## 安全
- 注入/越权/泄露：

## 成本/延迟
- p50/p95:
- tokens/request:
- cost/request:

## 结论
- 通过/不通过；放行条件：
```
