# Tasks — AI Native 团队源维护

| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |
|---|---|---|---|---|---|---|
| TASK-IMPROVE-2026-11-08-R8 | 1.9.4 验证预算与基线复用 | build | - | done | 基线 `ec6738c` 有效 | `TASK-IMPROVE-2026-11-08-R8-EVIDENCE.md` |
| TASK-IMPROVE-2026-11-09-R9 | 1.10.0 质量报告与 CI | build | - | done | 审查/安全复核通过；基线有效 | `TASK-IMPROVE-2026-11-09-R9-EVIDENCE.md` |
| TASK-IMPROVE-2026-11-09-R10 | 1.11.0 所有权校验与离线 E2E | build | - | done | 审查/安全复核通过；基线有效 | `TASK-IMPROVE-2026-11-09-R10-EVIDENCE.md` |
| TASK-IMPROVE-2026-11-09-R11 | 1.11.1 R7 债务与 action pin | build | - | done | 审查/安全复核通过；基线有效 | `TASK-IMPROVE-2026-11-09-R11-EVIDENCE.md` |
| TASK-IMPROVE-2026-11-08-R7 | 1.9.1 复审残余 P3 | build | - | done | R7-01..05 修复；R7-06 接受/观察 | `TASK-IMPROVE-2026-11-08-R7.md` |

## 交付面覆盖（2026-11-10，1.15.0）

> 来源：riccon-ai 前端完成度审计。目标是把“页面/端点/骨架”覆盖做成团队级可复用门禁，避免其他项目重犯“占位页无延期、契约有端点无实现、骨架不接线、里程碑分母误导”。

| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |
|---|---|---|---|---|---|---|
| TASK-SURFACE-2026-11-10-T1 | 页面覆盖门禁：PAGE-MAP + milestone + 延期/骨架校验 | build | - | done | fixture PASS；riccon-ai pilot M1 P0 12/47，35 个无延期占位被拦截 | `.ai-team/work/TASK-SURFACE-2026-11-10-EVIDENCE.md` |
| TASK-SURFACE-2026-11-10-T2 | 端点覆盖门禁：契约端点 ↔ ENDPOINT-MAP ↔ 实现证据 | build | - | done | fixture PASS；pilot 195 端点仅 9 映射，186 missing 被拦截 | 同上 |
| TASK-SURFACE-2026-11-10-T3 | brief 增加 `变更面`/`交付面`/`交付状态`/`骨架延期`，按面校验 | build | T1/T2 | done | 10 个 brief fixture PASS（缺面/缺页面/缺端点/骨架无延期均 FAIL） | 同上 |
| TASK-SURFACE-2026-11-10-T4 | gate-check / checkpoint-check 接入交付面覆盖，HANDOFF/STATUS 自动写 Surface 行 | build | T1/T2 | done | gate-check surface PASS；checkpoint 写入 `Surface: pages M1 1/1 ... endpoints 1/1` | 同上 |
| TASK-SURFACE-2026-11-10-T5 | quality-report 增加页面/端点覆盖率与里程碑分解 | build | T1/T2 | done | fixture `quality surface page metrics` PASS；无 map warning 不阻断 | 同上 |
| TASK-SURFACE-2026-11-10-T6 | 标准与反模式：FRONTEND/BACKEND 清单 + BEST-PRACTICES 交付面反模式 | build | - | done | consistency 229 PASS；引用/模板/字段一致 | 同上 |
| TASK-SURFACE-2026-11-10-T7 | `/ai-improve` 增加“交付面覆盖与骨架闭环”强制检查；版本/文档/测试 | build | T3/T4/T5/T6 | done | 五项检查；verify 234/234、test-gates 101/101、installed 220/230；1.15.0 | 同上 |

## 审计整改（2026-11-09）

> 来源：`.ai-team/work/AUDIT-2026-11-09-TEAM-AUDIT-V2.md`。按净零规则分批实施；每条必须有命令/退出码/证据。

| ID | 标题 | Owner | 依赖 | 状态 | 验收 | 证据 |
|---|---|---|---|---|---|---|
| TASK-AUDIT-2026-11-09-A1 | 统一 T3/T4 全量基线措辞（仅无有效基线时重跑） | build | - | done | reviewer/QA/SKILL 一致；audit-team-consistency 检查 | `.ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md` |
| TASK-AUDIT-2026-11-09-A2 | state-check 缺失 PROJECT/STATUS/TASKS 改为 error + bootstrap | build | - | done | 空状态 exit 1；bootstrap/完整状态 exit 0；fixture | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-A3 | 合并 evidence/gate 扫描（artifact+secret+state+checkpoint） | build | - | done | 每 checkpoint 一次 artifact+secret 扫描；gate-check 测试 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-A4 | Brief 模板单一源（brief-new 生成，docs 只引用） | build | - | done | chief/WORKFLOW 不再维护第二套字段模板；brief-lint 全过 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-A5 | 修复 ownership 冲突 + manifest glob/precedence + 校验 | build | - | done | QA 单测/Chief README/Writer ADR 冲突消除；ownership-lint PASS | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-A6 | 质量目标例行化（quality-report + STATUS/trend） | build | - | done | G5/G8/复盘有 quality-report；trend 模板存在 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-B1 | 角色化证据门禁（非 checkpoint 角色不扫 artifact/secret） | build | A3 | done | architect/PM/UX 提示不再要求扫描；reviewer/security 每轮≤1 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-B2 | 降低 agent 样板：生成权限块 + 移出 Shell 纪律 | build | - | done | agent 总大小下降；permission-lint PASS | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-B3 | review-check 强制越权/P2/Done gate | build | A5 | done | 缺节 exit 1；正负 fixture | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-B4 | GROWTH 归档 + 目标项目 open 债务上限 | build | - | done | 团队源 GROWTH 已归档；目标项目 `riccon-ai` team open 9 → 1（P-41）；project open 5；`growth-check --debt` PASS | `D:\Development\riccon-ai\.ai-team\team\GROWTH.md`；`.ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md` |
| TASK-AUDIT-2026-11-09-B5 | 修过期文档（VERIFICATION/LARGE-PROJECTS） | build | A1/A4/A5 | done | 计数/策略与当前行为一致 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-B6 | CI 去重 + checkpoint 远端离线模式 | build | A3 | done | CI 不再重复 test-gates/secret；离线 sync 不等待 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P0-1 | 大型项目 Program/Workstream 模板 + program-check | build | A5 | done | 模板存在；program-check 通过有效/拒绝循环依赖 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P0-2 | 集成列车模板 + integration-check | build | A1 | done | 集成记录校验 candidate/baseline/命令/退出码 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P0-3 | 影响面分析 impact-scan（changed files→modules→tests） | build | - | done | 对 fixture 输出 affected tests；不依赖外部服务 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P0-4 | 持久队列模板 + next-task 选择器 | build | LP-P0-1 | done | QUEUE.json 依赖校验；选择 ready 任务；fixture | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-C1 | `/ai-improve` 历史指标、成长曲线与上一轮达成检查 | build | - | done | `improve-metrics` 记录 history；负成长强制优化任务；上一轮 missed 结转；fixture PASS | `.ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md` |
| TASK-AUDIT-2026-11-09-LP-P1-1 | 成本/容量看板 capacity-report | build | LP-P0-4 | todo | 每任务 token/耗时/全量测试次数可输出 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P1-2 | 专家 profile（frontend/backend/data-ml/sre） | build | - | todo | profile 存在且无项目路径；不新增 agent | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P1-3 | CI 质量门禁（覆盖率/契约/性能/flaky） | build | B6 | todo | 至少 1 个质量门禁有基线/阈值/回滚 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P1-4 | 环境自动化模板（IaC/预览/secrets） | build | - | todo | staging 一键起停模板 + 回滚 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P1-5 | 事故/on-call 模板（SLO/告警/复盘） | build | - | todo | INCIDENT.md + runbook 模板 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P1-6 | 集成连接器（Jira/GitHub/Slack/飞书） | build | - | todo | 至少 1 个可选连接器说明/适配 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P2-1 | 合规证据包（control mapping/证据索引） | build | - | todo | 模板存在；不宣称认证 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P2-2 | 组合看板（多项目 DORA/成本/容量） | build | LP-P1-1 | todo | 多项目汇总模板/脚本 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P2-3 | 组织级知识库索引 | build | - | todo | ADR/契约/runbook 索引模板 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
| TASK-AUDIT-2026-11-09-LP-P2-4 | 正式治理（变更委员会/风险接受矩阵） | build | - | todo | 治理模板存在；人工流程 | .ai-team/work/AUDIT-2026-11-09-REMEDIATION-EVIDENCE.md |
