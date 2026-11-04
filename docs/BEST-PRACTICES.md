# 行业最佳实践映射（BEST PRACTICES）

本团队不是“发明一套流程”，而是把业界经过验证的规范压缩成可执行的 agent 行为。本文说明：**参考了什么、团队怎么落地、在哪里裁剪**。

## 1. 产品与需求

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 需求规格质量 | ISO/IEC/IEEE 29148 | PRD 必须包含问题、用户、FR/NFR、验收、假设/依赖、追踪矩阵 |
| 用户故事 | INVEST | `US-*` 必须独立、可协商、有价值、可估算、小、可测试 |
| 验收标准 | Given/When/Then | 每条 FR 至少一组 GWT；QA 直接转测试用例 |
| 优先级 | RICE / MoSCoW / Kano | PM 选一种并写评分理由；禁止“全都要” |
| 产品发现 | Jobs-to-be-Done / Continuous Discovery | 先写问题/用户/替代方案，再写功能 |
| MVP | Lean Startup | 明确最小可验证范围；非目标写清 |
| 工作回溯 | Amazon Working Backwards（按需） | T3/T4 可先写“发布说明/用户价值”再倒推 |

**裁剪**：T1 不需要完整 PRD，只写问题/影响/验收；T2 用 PRD-lite；T3/T4 完整。

## 2. UX / UI

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 可用性启发式 | Nielsen 10 heuristics | UX 自检与评审清单 |
| 可访问性 | WCAG 2.2 AA | 键盘/焦点/对比度/语义/缩放/减少动效 |
| 设计 token | W3C Design Tokens | 颜色/间距/字体/圆角/阴影/动效 token 化 |
| 组件化 | Atomic Design | 组件清单/变体/状态/复用规则 |
| 平台规范 | Apple HIG / Material | 按目标平台遵循导航/控件/手势 |
| 状态设计 | 现代前端实践 | loading/empty/error/partial/disabled/无权限/离线 |
| 内容设计 | Plain language | 按钮动词+对象；错误说明“发生了什么+怎么修” |

**裁剪**：无界面项目跳过；T1 只检查改动面；T3/T4 完整设计系统与 a11y 审计。

## 3. 架构

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 架构视图 | C4 model | Context/Container/Component + 关键时序 |
| 决策记录 | ADR（Nygard） | `ADR-*`：背景/选项/结论/后果/被否决方案 |
| 质量属性 | ISO/IEC 25010 | 性能/可用性/安全/可维护性/兼容性等 NFR |
| 云原生 | 12-Factor App | 配置外置、无状态、日志、优雅停机 |
| API 契约 | OpenAPI 3.1 / AsyncAPI | schema/错误/版本/幂等/分页/限流 |
| 领域建模 | DDD（按需） | 限界上下文/聚合/领域事件；不强行上微服务 |
| 失败设计 | Resilience patterns | 超时/重试/幂等/熔断/降级/补偿 |
| 演进 | 渐进式架构 | 模块化单体优先；契约版本化；可回滚迁移 |

**裁剪**：T1 只做影响分析；T2 设计 note；T3/T4 完整架构 + ADR + 容量/部署。

## 4. 编码

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 设计原则 | SOLID / KISS / YAGNI | 小函数、单一职责、不过度设计 |
| 可读性 | Clean Code | 命名/结构/错误处理/注释解释“为什么” |
| 语言惯用法 | 各语言社区 | 跟随项目现有风格与工具链 |
| 提交规范 | Conventional Commits | 提交信息类型/范围/描述（如项目采用） |
| 版本 | SemVer | 破坏性变更/迁移说明 |
| 代码审查 | Google Engineering Practices | 小 diff、正确性优先、不阻塞于风格偏好 |
| 分支策略 | Trunk-based / GitHub Flow | 小步合并；不强制某种分支模型 |

**裁剪**：不强制提交格式，除非项目已有约定；不为了原则引入复杂度。

## 5. 测试

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 测试分层 | Test Pyramid | 多单元、少集成、更少 E2E |
| 前端测试 | Testing Trophy | 以集成/组件测试为主（按项目） |
| 风险驱动 | Risk-based testing | 认证/授权/支付/删除/并发/迁移优先 |
| 契约测试 | Consumer-driven contracts | API/事件 schema 兼容 |
| 变异测试 | Mutation testing（按需） | 关键模块验证测试有效性 |
| 覆盖率 | 变更行/关键路径 | 不追数字；关键路径 100% |
| 缺陷管理 | 严重级别 + 回归 | `DEF-*`、复现、证据、关闭 |

**裁剪**：T1 单元+回归；T2 加集成/关键 E2E；T3/T4 全层次+性能/可访问性。

## 6. 安全

| 实践 | 来源 | 团队落地 |
|---|---|---|
| Web 安全 | OWASP Top 10 | A01–A10 检查清单 |
| 应用安全验证 | OWASP ASVS L2 | 认证/会话/访问控制/输入/加密/日志 |
| 弱点分类 | CWE Top 25 | 注入/越权/泄露/反序列化等 |
| 威胁建模 | STRIDE | 资产/信任边界/攻击路径/控制/缺口 |
| 安全开发 | NIST SSDF | 需求/设计/实现/验证/发布/响应 |
| 供应链 | SLSA / SBOM | lockfile/pin/digest/签名/CycloneDX |
| AI 安全 | OWASP LLM Top 10 | 注入/输出/数据/工具/成本 |

**裁剪**：T1 改动面清单；T2 安全检查；T3/T4 完整威胁模型+扫描+供应链。

## 7. DevOps / SRE

| 实践 | 来源 | 团队落地 |
|---|---|---|
| SRE | Google SRE | SLO/错误预算/告警/runbook |
| 交付指标 | DORA | 部署频率/变更失败率/MTTR/Lead time |
| 可观测性 | OpenTelemetry | 日志/指标/trace；RED/USE |
| IaC | Terraform/Pulumi | plan/apply、状态锁、最小权限 |
| 渐进发布 | Canary/Blue-Green | 观察指标、自动/手动回滚 |
| GitOps | Argo CD/Flux（按需） | 声明式、可审计 |
| 容器 | OCI 最佳实践 | 多阶段/非 root/只读 FS/digest |

**裁剪**：T2 staging；T3 完整 CI/CD；T4 灰度+容灾+演练。

## 8. 文档

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 文档分类 | Diátaxis | Tutorial/How-to/Reference/Explanation |
| 变更日志 | Keep a Changelog | Added/Changed/Fixed/Removed/Security |
| 版本 | SemVer | 破坏性变更+迁移 |
| 写作风格 | Google developer docs | 短句/主动/具体/可执行 |
| API 文档 | OpenAPI/AsyncAPI | 从契约生成，不手抄 |

## 9. AI 功能

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 评测驱动 | Eval-driven development | golden/edge/adversarial/regression |
| LLM 安全 | OWASP LLM Top 10 | 注入/输出/数据/工具/成本 |
| AI 风险 | NIST AI RMF（按需） | 治理/映射/测量/管理 |
| RAG 评测 | RAGAS 类指标 | context recall/precision/faithfulness/citation |
| Agent 安全 | 最小权限/人类确认 | 工具白名单/参数校验/审计 |
| 成本工程 | FinOps | token 预算/缓存/模型分级/监控 |

## 10. 流程与团队

| 实践 | 来源 | 团队落地 |
|---|---|---|
| 阶段门禁 | Stage-Gate / 评审 | G0–G8，结论三态 |
| 单一 owner | DRI（Directly Responsible Individual） | 每任务一个 owner |
| 复盘 | Blameless Postmortem | 根因/影响/改进/owner |
| 持续改进 | Kaizen/PDCA | GROWTH 提案，证据≥2 次 |
| 工作可视化 | Kanban | `TASKS.md` 状态流 |
| 限制在制 | WIP limit | 并行任务按文件所有权切分 |

## 11. 团队刻意不做的

- 不强制 Scrum 仪式/故事点；
- 不强制微服务/DDD/事件溯源；
- 不强制 100% 覆盖率；
- 不强制特定云/框架/语言；
- 不为了流程而流程；
- 不用“最佳实践”代替验收标准；
- 不把安全/测试外包给“最后一步”。

## 12. 参考链接（自行查阅最新版）

- ISO/IEC/IEEE 29148 — Requirements engineering
- OWASP ASVS — https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10 — https://owasp.org/www-project-top-ten/
- OWASP LLM Top 10 — https://owasp.org/www-project-top-10-for-large-language-model-applications/
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- C4 model — https://c4model.com/
- ADR — https://adr.github.io/
- 12-Factor — https://12factor.net/
- OpenAPI — https://spec.openapis.org/oas/latest.html
- AsyncAPI — https://www.asyncapi.com/
- SLSA — https://slsa.dev/
- NIST SSDF — https://csrc.nist.gov/projects/ssdf
- Google SRE — https://sre.google/
- DORA — https://dora.dev/
- Diátaxis — https://diataxis.fr/
- Keep a Changelog — https://keepachangelog.com/
- SemVer — https://semver.org/
- Conventional Commits — https://www.conventionalcommits.org/
- W3C Design Tokens — https://tr.designtokens.org/
- Nielsen heuristics — https://www.nngroup.com/articles/ten-usability-heuristics/
