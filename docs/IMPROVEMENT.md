# 持续优化手册（IMPROVEMENT）

> 目标：让 AI Native 团队根据真实项目证据持续进化，而不是靠感觉加角色、加规则、加文档。

## 1. 适用范围

适用于任意使用 AI Native 团队的项目，例如：

在 `build` 维护者会话中运行：

```text
/ai-improve D:\Development\riccon-ai
/ai-improve riccon-ai
```

命令会读取该项目的 `.ai-team/team/GROWTH.md`、`AUDIT.json`、最近会话审计和交付证据，判断团队是否需要优化。默认只输出分析和报告，**不修改 AI Native 团队源**；用户阅读报告并授权后，才用 `--apply` 进入实施并同步文档与版本。

## 2. 优化闭环

采用 PDCA / Kaizen 的小步循环：

```text
Observe  收集 GROWTH、会话、交付、文档证据
  ↓
Frame    把现象归因到流程/角色/工具/文档，而不是归因到某个人
  ↓
Decide   NO-OP / DOCS-ONLY / PATCH / FEATURE / ROLE-GAP / DEFER
  ↓
Authorize 用户阅读报告并明确授权（--apply）
  ↓
Change   一次最多 2 个改动，写清验收与回滚
  ↓
Verify   用同一组指标对比改动前后
  ↓
Standardize  更新 SKILL/模板/命令/文档/CHANGELOG/VERIFICATION
```

### 2.1 观察

至少读取：

- `.ai-team/team/GROWTH.md`：提案、复盘、处置索引；
- `.ai-team/team/AUDIT.json` 与 `TEAM-USAGE-AUDIT-*.md`：会话审计水位与上次结论；
- `.ai-team/state/STATUS.md`、`TASKS.md`、`RISKS.md`、`HANDOFF.md`、`CHECKPOINT.json`；
- `reviews/**`、`qa/**`、`security/**`、`release/**`；
- OpenCode 会话数据（脚本：`improve-scan.mjs`）。

### 2.2 归因

把问题归到可改的系统部件：

| 现象 | 优先怀疑 | 不要先做 |
|---|---|---|
| 同一类错误反复出现 | brief/模板/校验脚本 | 加一个新角色 |
| 审查/QA 只引用自报结果 | 审查约束/证据标准 | 加大模型权限 |
| checkpoint 经常过期 | 提交流程/自动化 | 让 Chief 自己提交 |
| 文档与命令不一致 | 文档同步清单/发布检查 | 只改 README |
| 权限拒绝反复出现 | 旧会话/版本/破坏性命令 | 扩大 allow |
| 交接后重复已完成工作 | HANDOFF 模板/状态协议 | 增加会话数量 |
| 单项目特例被写进团队 | 项目级覆盖 | 改通用规则 |

### 2.3 决策

| 结论 | 含义 | 版本 |
|---|---|---|
| `NO-OP` | 没有可复现的系统缺口 | 不发布 |
| `DOCS-ONLY` | 仅文档/计数/版本漂移 | patch |
| `PATCH` | ≤2 个文件的小修 | patch |
| `FEATURE` | 新脚本/命令/工作流 | minor |
| `ROLE-GAP` | 现有角色无法覆盖的高频能力缺口 | 需用户明确批准 |
| `DEFER` | 证据不足或环境阻塞 | 写 `RISK-*` + 复查日期 |

`ROLE-GAP` 的门槛：

1. 同一能力缺口在 ≥2 个任务或项目中出现；
2. 累计 ≥3 次证据；
3. 现有角色扩展无法解决；
4. 新增角色有明确输入/输出/边界/成本；
5. 用户批准。

默认不新增角色；优先扩展现有角色或改流程。

## 3. 证据与指标

指标用于发现趋势，不用于给个人打分。

### 3.1 交付与流程

- 一次验收通过率；
- 返工次数、P1 复发、审查轮次；
- checkpoint 是否按期、`state-check` 是否 PASS；
- HANDOFF 是否包含下一步/最小上下文；
- 任务 brief 是否一次通过 `brief-lint`。

### 3.2 质量与安全

- QA 逃逸缺陷、flaky 率；
- 安全 Critical/High 的发现阶段（越晚成本越高）；
- `artifact-check` / `secret-check` 失败次数；`secret-check` 截断（exit 3 / `PARTIAL`）视为未完成扫描，不得计为通过；
- 独立验证是否真的执行了命令。

### 3.3 会话与协作

- 会话/消息/工具调用；`improve-scan` 在 `session_part` 为空时从 `session_message.data.content` 取工具明细，并注明数据源；
- 工具错误率、权限拒绝；
- 角色分布、子会话深度；
- 上下文压缩/交接频率；
- token 与耗时趋势（只观察，不建立预算机制）。

### 3.4 文档与知识

- README/INSTALL/docs 中的命令能否执行；
- 版本号、命令数、验证计数是否一致；
- 旧版本/旧权限描述是否残留；
- 相对链接是否可解析；
- CHANGELOG 与 `VERIFICATION` 是否记录当前发布。

## 4. 提案生命周期

`GROWTH.md` 的“提案处置索引”是唯一状态源：

```text
proposed → accepted → in_progress → done
                              ↘ rejected
                              ↘ superseded
```

规则：

- `proposed`：有证据、有目标，等待批准；
- `accepted`：用户批准，尚未开始；
- `in_progress`：正在实施，必须有 owner 和验收；
- `done`：必须写落地版本/任务、证据、日期；
- `rejected` / `superseded`：写理由，不删除历史；
- 每条提案必须能回答：证据是什么、改什么、怎么验收、怎么回滚、影响哪些文档。

## 5. 节奏与触发

| 触发 | 动作 |
|---|---|
| 每 10 个 `done` | 轻量复盘；检查是否有重复问题 |
| 每月 | 跨项目 `/ai-improve`，看趋势而非单点 |
| 团队版本发布后 | 检查安装、文档、命令计数、旧版本残留 |
| P0/P1 事故/回滚后 | 无责复盘；先修系统，不先追责 |
| 同类问题第 2 次出现 | 登记 `RISK-*`；第 3 次考虑提案 |
| GROWTH 未处置 ≥3 | 先清债，再开新功能 |
| 文档/命令不一致 | 立即 `DOCS-ONLY` 修复，不等到下次发布 |

## 6. 实验与回滚

每个 `PATCH`/`FEATURE` 至少写：

- 基线：改动前的 1–3 个指标；
- 假设：改什么会改善哪个指标；
- 观察窗口：至少一个完整任务节奏（例如 10 个 `done` 或 2 周）；
- 回滚：恢复到哪个版本/文件；
- 结论：保留、调整、撤回。

没有基线和观察窗口的“优化”不算完成。

## 7. 文档同步清单

任何团队改动都必须检查：

- `team-manifest.json`：版本、命令/角色/技能清单；
- `scripts/verify.mjs`：预期数量；
- `README.md`：命令表、目录、验证数字；
- `INSTALL.md`：安装/升级/验证数字；
- `docs/WORKFLOW.md`、`docs/TEAM.md`、`docs/IMPROVEMENT.md`；
- `docs/VERIFICATION.md`：当前版本、计数、hash、验证记录；
- `CHANGELOG.md`：本版本改了什么、验证结果；
- 所有命令示例实际执行；
- `rg` 搜索旧版本/旧计数/旧权限描述；
- 相对链接可解析。

文档不是附属品；**行为、命令、计数、版本、文档必须在同一轮闭环**。

## 8. 行业参考

- **PDCA / Kaizen**：小步改进、持续复盘、标准化；
- **DORA**：部署频率、变更失败率、恢复时间、Lead time；
- **SRE / Blameless Postmortem**：无责复盘、根因、行动项、owner；
- **SPACE**：不能只用单一产出指标衡量协作效率；
- **Diátaxis**：Tutorial / How-to / Reference / Explanation 分类；
- **OWASP ASVS / SLSA**：安全与供应链基线；
- **SemVer / Keep a Changelog**：版本与变更记录。

只引用与当前问题相关的实践，不为“最佳实践”增加流程。

## 9. 反模式

- 为单个项目特例修改通用团队；
- 用新增角色解决流程/文档问题；
- 用扩大权限解决权限拒绝；
- 只改文档不改行为，或只改行为不改文档；
- 没有基线和观察窗口就宣称“优化完成”；
- 把“重跑通过”当作 flake 关闭；
- 把会话多、token 多直接等同于价值高；
- 让提案长期停在 `proposed` 却不写复查日期。

## 10. 快速使用

默认只分析并等待授权：

```text
/ai-improve D:\Development\riccon-ai
```

阅读报告后授权实施：

```text
/ai-improve D:\Development\riccon-ai --apply
```

只分析、不询问实施：

```text
/ai-improve D:\Development\riccon-ai --analyze-only
```

授权前不得修改 AI Native 源。实施阶段按风险决定子智能体：`DOCS-ONLY` 由 build 自己改；`PATCH` 加 code-reviewer；涉及脚本/权限/安全时加 security-auditor；`FEATURE` 才使用完整团队链。
