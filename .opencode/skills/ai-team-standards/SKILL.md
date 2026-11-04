---
name: AI Team Standards
description: 通用工程标准与质量门禁：需求、UX/可访问性、架构、编码、测试、安全、DevOps、文档与 AI 功能。团队按 Track 裁剪使用，但不得降低安全/证据标准。
---

# AI Team Standards

这是团队的工程标准索引。原则：**按风险裁剪流程，不裁剪质量**。

## 1. 需求标准

参考：ISO/IEC/IEEE 29148、INVEST、Given/When/Then、MoSCoW/RICE/Kano。

检查：

- [ ] 问题/用户/场景清楚，不是功能清单；
- [ ] 每条 FR/NFR 有唯一 ID、行为、验收、优先级；
- [ ] 验收标准可测试（给定/当/则），无“友好/快速/完善”；
- [ ] 正常、异常、权限、空态、并发/重复提交、数据生命周期覆盖；
- [ ] 范围/非范围明确；MVP 可独立交付；
- [ ] NFR 可度量（延迟、可用性、RPO/RTO、可访问性等级）；
- [ ] 假设/依赖/开放问题有 owner 和截止；
- [ ] 需求 → 设计 → 任务 → 测试可追踪。

## 2. UX / UI 标准

参考：Nielsen 10 heuristics、WCAG 2.2 AA、W3C Design Tokens、Atomic Design、平台 HIG/Material。

检查：

- [ ] 核心任务 3 步内完成；可撤销/可恢复；
- [ ] 每个页面有 loading/empty/error/partial/disabled/无权限状态；
- [ ] 键盘全流程可达；焦点可见；顺序合理；
- [ ] 正文对比度 ≥ 4.5:1；大字 ≥ 3:1；信息不只靠颜色；
- [ ] 触控目标 ≥ 44×44 px；响应式断点明确；
- [ ] 表单错误说明“发生了什么 + 怎么改”；
- [ ] 支持 `prefers-reduced-motion`；动效不阻塞；
- [ ] 文案具体、可执行；错误不泄露内部信息；
- [ ] 设计 token 化，工程师可直接实现；
- [ ] 国际化/RTL/深色模式按需覆盖。

## 3. 架构标准

参考：C4、ADR、12-Factor、OpenAPI 3.1、AsyncAPI、ISO/IEC 25010。

检查：

- [ ] 模块边界/依赖方向/数据所有权明确，无循环依赖；
- [ ] 关键流程有成功/失败/重试/降级/补偿；
- [ ] API/事件契约有 schema、错误模型、版本、幂等；
- [ ] 数据模型有索引、迁移、保留/删除、备份；
- [ ] 认证/授权/租户隔离/密钥/审计有落点；
- [ ] NFR 有预算与验证方式；
- [ ] 部署拓扑/环境/发布/回滚可执行；
- [ ] 可观测性（日志/指标/trace/告警）设计；
- [ ] 重要取舍有 ADR（含被否决选项）；
- [ ] 未验证假设标 TBD，有验证计划。

## 4. 编码标准

参考：SOLID、KISS、YAGNI、语言惯用法、Conventional Commits、SemVer。

检查：

- [ ] 只改任务范围；不顺手重构/升级无关依赖；
- [ ] 命名清晰；函数小；单一职责；无重复逻辑；
- [ ] 输入校验、边界、异常、资源释放完整；
- [ ] 无硬编码密钥/环境/URL；配置外置；
- [ ] 日志结构化、脱敏、有 request/trace id；
- [ ] 无 N+1/无界查询/阻塞主线程/内存增长；
- [ ] 参数化查询/输出编码/服务端鉴权；
- [ ] 新增/修改逻辑有单元测试；
- [ ] 无调试代码/TODO（或 TODO 有 issue）；
- [ ] 迁移可回滚/向后兼容；
- [ ] 依赖 pin、许可证可接受、有理由。

## 5. 测试标准

参考：Test Pyramid / Testing Trophy、风险驱动测试、契约测试、mutation testing。

检查：

- [ ] 每个 FR/NFR 至少一个用例；
- [ ] 风险优先：认证、授权、租户、支付、删除、并发、迁移、恢复；
- [ ] 单元测试快、确定、隔离；
- [ ] 集成测试覆盖 DB/消息/外部适配；
- [ ] 契约测试覆盖 API/事件兼容；
- [ ] E2E 覆盖关键旅程，不追求全覆盖；
- [ ] 性能有预算、数据规模、p50/p95/p99；
- [ ] 可访问性自动 + 人工；
- [ ] 无 flaky；重试只用于已知基础设施抖动；
- [ ] 覆盖率看变更行/关键路径，不追数字；
- [ ] 缺陷有复现、严重级别、回归。

## 6. 安全标准

参考：OWASP Top 10、OWASP ASVS L2、CWE Top 25、STRIDE、NIST SSDF、SLSA、SBOM。

检查：

- [ ] 威胁模型/信任边界/数据分类；
- [ ] 认证/授权服务端强制；默认拒绝；最小权限；
- [ ] 租户隔离/IDOR/越权测试；
- [ ] 输入校验/输出编码/参数化查询；
- [ ] 密钥不硬编码/不入日志/不入镜像；可轮换；
- [ ] CSRF/CORS/Cookie/安全 Headers/限流；
- [ ] 文件上传/路径穿越/SSRF/反序列化/命令注入；
- [ ] 依赖 CVE/许可证/lockfile/SBOM/镜像扫描；
- [ ] CI 权限最小化；secrets 不打印；
- [ ] 容器非 root/只读 FS/最小镜像；
- [ ] IaC 无公开 bucket/0.0.0.0/过度 IAM；
- [ ] 审计日志/隐私最小化/保留删除；
- [ ] Critical/High 阻断发布。

## 7. DevOps 标准

参考：12-Factor、SRE（SLO/error budget）、DORA、GitOps、OpenTelemetry。

检查：

- [ ] 一键构建/测试/部署；幂等、可重复；
- [ ] 版本固定、制品可追溯（commit/tag/digest）；
- [ ] CI 分级：PR 快速反馈；主分支全量；
- [ ] 环境一致；配置外置；密钥管理；
- [ ] 容器非 root/健康检查/资源限制/优雅停机；
- [ ] IaC plan 先于 apply；状态锁；最小权限；
- [ ] 发布：staging 冒烟 → 灰度/蓝绿 → 观察 → 全量；
- [ ] 回滚命令/数据回滚/演练；
- [ ] 日志/指标/trace/告警/runbook；
- [ ] SLO/错误预算；MTTR 可度量；
- [ ] 备份/恢复演练；容量/配额。

## 8. 文档标准

参考：Diátaxis、Keep a Changelog、SemVer、Google developer documentation style。

检查：

- [ ] README 一句话价值 + 快速开始 + 配置 + 限制；
- [ ] Tutorial/How-to/Reference/Explanation 分离；
- [ ] 命令可复制、有前置、有预期输出；
- [ ] API/配置从生成物派生，不手抄；
- [ ] 术语一致；标题层级合理；链接有效；
- [ ] 无真实密钥/个人信息/内网地址；
- [ ] CHANGELOG 按 Added/Changed/Fixed/Removed/Security；
- [ ] 每篇有 owner/更新时间。

## 9. AI 功能标准

参考：eval-driven development、NIST AI RMF（按需）、OWASP LLM Top 10。

检查：

- [ ] 明确任务、输入/输出契约、失败模式；
- [ ] 有离线评测集 + 指标（准确/召回/相关性/忠实度）；
- [ ] prompt/模型/参数版本化；可回滚；
- [ ] 防 prompt injection/越权工具调用/数据泄露；
- [ ] RAG 有引用/忠实度/召回评估；
- [ ] 有模型 fallback/超时/限流/成本预算；
- [ ] 人工审核/高风险动作确认；
- [ ] 隐私/数据保留/供应商数据使用；
- [ ] 线上监控：质量、延迟、成本、错误率；
- [ ] 红队/对抗测试（按风险）。

## 10. 按 Track 的最小标准

| Track | 需求 | UX | 架构 | 测试 | 安全 | 发布 | 文档 |
|---|---|---|---|---|---|---|---|
| T0 | 问题 memo | — | 可行性 | 原型验证 | 按需 | — | 结论 |
| T1 | 验收标准 | 改动面 | 影响分析 | 单元 + 回归 | 改动面清单 | 按需 | 变更说明 |
| T2 | PRD-lite | 涉及界面必做 | 设计 note | 单元/集成/关键 E2E | 安全检查 | staging | README 更新 |
| T3 | 完整 PRD | 完整 | 完整 + ADR | 全层次 | 威胁模型 + 扫描 | staging + 回滚 | 全套 |
| T4 | 完整 + 合规 | 完整 + a11y 审计 | 完整 + 容灾 | 全层次 + 性能/容灾 | 全量 + 供应链 | 灰度 + 演练 | 全套 + 运维 |

## 11. 参考资料

- `references/QUALITY-GATES.md`：逐门禁检查清单
- `references/STACK-PLAYBOOK.md`：技术栈识别、命令、测试/构建/部署入口
- `references/SECURITY.md`：OWASP/STRIDE/供应链详细清单
- `references/UX.md`：WCAG/设计系统/状态清单
- `references/DOCS.md`：文档结构与写作规范
