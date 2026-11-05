# 工作流手册（WORKFLOW）

本文是“一句话如何变成交付”的完整说明。日常使用不需要读完；需要定制流程、排障或审计时查阅。

## 1. 一次 `/ai` 的完整时序

```text
1. Chief 读状态（或初始化 .ai-team/）
2. 判定 Track
3. G0 Intake：写 PROJECT.md（目标/范围/指标/约束/假设/风险）
4. G1 Product：PM 写 PRD/AC；Chief 接受
5. G2 Design：UX + Architect + Security + QA 并行输入；跨角色评审
6. G3 Plan：Chief 拆任务 DAG；文件所有权切分
7. G4 Build：Engineer 实现 + 单测 + 证据
8. G5 Verify：Code Reviewer + QA（可并行）
9. G6 Secure：Security Auditor
10. G7 Release：DevOps 预检/部署/冒烟/回滚
11. G8 Operate：监控、复盘、HANDOFF
```

Chief 在每一步写 `STATUS.md` 与 `RUN_LOG.md`；阶段结束写门禁结论。

## 2. Track 判定

### 判定表

| 信号 | Track |
|---|---|
| “能不能/是否可行/调研/原型/给个方案” | T0 |
| “修复/报错/很慢/改一下/小优化” | T1 |
| “加一个功能/支持/新增页面/新增接口” | T2 |
| “做一个产品/MVP/从零/平台/系统/完整上线” | T3 |
| “生产关键/支付/医疗/多租户/强合规/大规模/高可用” | T4 |

### 规则

- 不确定取较低 Track；发现证据不足再升级。
- 用户明确说“生产级/上线/完整”至少 T3。
- 涉及生产数据/支付/认证/隐私/对外发布，至少套用 T4 的安全与发布门禁。
- T0 不改生产代码；需要实现时升级 T2/T3。
- 不允许为了省流程把 T3 降成 T1；降级必须记录 `DEC-*` 与理由。

## 3. 各 Track 的最小动作

### T0 Spike

```text
G0 Intake（1 页）
→ 调研/原型（时间盒）
→ 同行评审（Architect/Engineer/Security 按需）
→ 结论 memo（可行/不可行/条件/风险）
→ 不改生产代码
```

产物：`state/PROJECT.md`、`work/SPIKE-*.md`、必要时 `design/adr/`。

### T1 Patch

```text
G0 Intake（问题/影响/复现）
→ Engineer 复现 + 根因 + 最小修复
→ Code Reviewer 针对性审查
→ QA 回归（原问题 + 相邻路径 + 关键旅程）
→ Done + RUN_LOG
```

产物：`TASK-*`、diff、`reviews/REV-*`、`qa/TEST-REPORT.md`、证据。

### T2 Feature

```text
G0 → G1-lite（PRD-lite/AC）→ G2-lite（UX note / design note / 契约）
→ G4 Build → G5 Review + QA → 安全检查 → Done
```

产物：PRD-lite、设计 note、任务、审查、测试报告、安全清单。

### T3 Product

全 G0–G8。必须有：

- 完整 PRD、UX-SPEC、ARCHITECTURE、ADR、API/DATA 契约；
- 威胁模型、测试策略/报告；
- 代码审查、安全审查；
- CI/部署/冒烟/回滚/监控；
- README/CHANGELOG；
- 复盘/HANDOFF。

### T4 Critical

T3 + 以下按需：

- 正式威胁建模与红队；
- 合规/隐私评审；
- 性能/容量/压测；
- 容灾/备份恢复演练；
- UAT；
- 灰度/蓝金丝雀 + 回滚演练；
- 发布后监控窗口与事故响应。

## 4. 门禁细则

### G0 Intake

Chief 写 `PROJECT.md`：

- 用户原话（不改写）；
- 目标一句话；
- Track + 理由；
- 范围/非范围；
- 成功指标；
- 约束；
- 假设（A-*）；
- 初始风险（RISK-*）；
- L3 决策清单。

### G1 Product

PM 写：

- 问题/用户/场景；
- FR/NFR（ID、行为、验收、优先级）；
- 用户故事（INVEST + Given/When/Then）；
- 范围/非范围/MVP；
- 优先级方法；
- 追踪矩阵；
- 开放问题。

Chief 验收：可测试、无歧义、范围可控、无技术越权。

### G2 Design

并行：

- UX：UX-SPEC/UI-SPEC/DESIGN-SYSTEM/A11Y；
- Architect：ARCHITECTURE/DATA/API/FAILURE/DEPLOY/OBSERVABILITY/ADR；
- Security：威胁模型草案；
- QA：测试策略/可测试性。

跨角色评审：

- PM 确认覆盖；
- UX 确认可实现；
- Architect 确认契约；
- QA 确认可测试；
- Security 确认威胁；
- DevOps 确认可部署/回滚。

结论写 `STATUS.md`。

### G3 Plan

Chief 拆任务：

- 每个 FR/NFR → 任务/测试；
- 任务 ID/owner/依赖/验收/证据；
- 文件所有权切分；
- 关键路径/并行路径；
- 风险/回退。

DoR 检查后进入实现。

### G4 Build

Engineer：

- 识别栈/基线；
- 最小 diff；
- 契约实现；
- 单元测试；
- lint/typecheck/build；
- 证据写 `work/TASK-*-EVIDENCE.md`；
- 提交审查。

### G5 Verify

Code Reviewer 与 QA 可并行：

- Reviewer：范围/契约/正确性/测试质量/越权；
- QA：覆盖矩阵/自动化/缺陷/回归；
- 修复由 owner 执行；
- 复审只回归原阻断项。

### G6 Secure

Security Auditor：

- 威胁模型更新；
- 设计/代码/依赖/密钥/SAST/IaC/容器/发布；
- Critical/High 阻断；
- Medium 计划/接受；
- 放行结论。

### G7 Release

DevOps：

- 预检清单；
- staging 部署 + 冒烟；
- 生产批准（L3）；
- 灰度/蓝绿；
- 观察指标；
- 回滚验证；
- `REL-*` + release notes。

### G8 Operate

Chief：

- 健康检查/监控窗口；
- 事故/异常；
- 完整复盘/GROWTH（含指标与 per-role 评估）；
- 遗留项；
- HANDOFF。

## 5. 任务 brief 模板

```text
角色：ai-team/...
任务 ID：TASK-0001
Track / 阶段：T3 / G4
目标：<一句话，可验收>
背景与输入：<文件/需求/设计/契约/上一任务>
所有权：只允许修改 <paths>；禁止 <paths>
约束：<技术/合规/兼容/性能/依赖>
契约影响：<无 / 修改的 API/事件/字段；API-CONTRACTS/ADR；契约测试>
回归范围：<原 P1/缺陷 + 相邻路径 + 关键旅程>
验收标准：
  1. ...
  2. ...
必须执行：<命令/测试/扫描>
证据要求：命令 + 退出码 + 原始输出摘要 + 文件路径
禁止：不得启动 subagent；不得跨职责；不得改 state；不得伪造证据
回报格式：结论/改动/证据/风险/下一步
```

## 6. 证据标准

每个任务写 `work/TASK-xxxx-EVIDENCE.md`：

```markdown
# TASK-0001 Evidence

## 变更
- `src/foo.ts`：...

## 命令与结果
| 命令 | 退出码 | 关键输出 |
|---|---|---|
| `npm test` | 0 | 42 passed |

## 验收对照
| AC | 结果 | 证据 |
|---|---|---|
| AC-1 | pass | test/foo.test.ts:42 |

## 未决/风险
- ...
```

拒绝：

- 没有命令/退出码；
- 只写“已实现”；
- 测试跳过/mock 冒充集成；
- 截图替代可复现命令；
- 审查无文件/行号；
- 部署无健康检查/回滚。

修复/回归任务额外要求：`work/TASK-*-EVIDENCE.md` 附 P1 closure 表（原 P1、修复点、复现命令、回归结果），并说明是否引入新的同类 P1；没有这张表，G5 不通过。

## 7. 状态协议

### 会话开始

1. `pwd` + `git status --short` + 清单文件；
2. 读 `PROJECT/STATUS/TASKS/DECISIONS/RISKS/HANDOFF/RUN_LOG`；
3. 一行复述；
4. 继续执行。

### 会话结束 / 上下文将满

1. 更新 `STATUS.md`：阶段/完成/未完成/阻塞/下一步；
2. 更新 `TASKS.md`：状态/owner/证据；
3. 更新 `DECISIONS/RISKS`；
4. 重写 `HANDOFF.md`：下一条指令 + 最小上下文；
5. 5 行内汇报。

### 冲突

用户最新指令 > 当前门禁 > `DECISIONS.md` > 旧聊天记录。冲突要记录。

### 7.1 提交归属

- **作者负责内容**：每个角色只写自己的 owned paths。
- **DevOps 统一 checkpoint commit**：`.ai-team` 的精选快照由 DevOps 提交；Chief 只提供路径/TASK/角色/message。
- **代码作者提交代码**：Engineer 提交代码 + 单测 + `.ai-team/work/TASK-*` 证据；commit 默认 `ask`。
- **文档作者提交文档**：Writer 提交 `docs/**`、README、CHANGELOG、`.ai-team/docs`；commit 默认 `ask`。
- **只读角色不 commit**：Chief/PM/UX/Architect/Reviewer/Security 不拿 raw git。
- **禁止 `git add -A` / `git add .`**；只 stage 明确路径。
- **提交前扫描密钥/凭据/客户数据**；安全报告脱敏。
- **push 需用户批准**（L3）。

Commit message：

```text
chore(ai-team): checkpoint <G?> <date>

Tasks: TASK-0012, TASK-0013
Roles: product-manager, ux-designer, qa-engineer
Co-authored-by: ai-team/product-manager <ai-team@local>
Co-authored-by: ai-team/qa-engineer <ai-team@local>
```

### 7.2 复盘节奏

复盘写入 `.ai-team/team/GROWTH.md`，由 Chief 写、DevOps 在 checkpoint 时提交。到期条件：

| 触发 | 时点 |
|---|---|
| 首次 10 个 `done` | 第 10 个任务完成时 |
| 每新增 10 个 `done` | 20/30/40… |
| 门禁切换 | T3/T4 进入 G5、G7、G8 前 |
| 事故/回滚 | P0/P1、hotfix、rollback 后 |
| 重复问题 | 同类问题第 2 次出现 |
| 交接 | `/ai-handoff` 前，若上述到期 |

计数口径：`TASKS.md` 状态列以 `done` 开头的行；`superseded` 不算，返工行算，同一 TASK-ID 只算一次。最近计数写入 GROWTH frontmatter 的 `tasks_at_last_retro`。

硬规则：到期未复盘，不开始新的功能任务，不把门禁标为通过。轻量复盘 10–20 行即可；G8 做完整复盘。检查命令见 `ai-team-workflow` 3.1。

### 7.3 Checkpoint 提交

Checkpoint 由 DevOps 执行，Chief 只提供明确路径/TASK/角色/message。触发条件：

- 未提交文件 ≥20（默认阈值）；
- 进入 G5/G7/G8 前；
- 写 `HANDOFF.md` 前；
- 已有 `CHECKPOINT.json` 基线后，每 10 个 `done`；
- 用户要求。

检查命令：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\checkpoint-check.mjs" --project .
```

DevOps 提交后运行 `--mark` 更新 `state/CHECKPOINT.json`。Chief 不得自己 `git add`/`git commit`/`git push`；用户要求暂不提交时，在 HANDOFF 写 `Checkpoint: WAIVED` + 原因 + `RISK-*`。

### 7.4 状态一致性

会话启动、交接、门禁前运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\state-check.mjs" --project .
```

检查 `PROJECT.md`/`STATUS.md` 的 track/stage、`HANDOFF.md` 的 Git commit、`TASKS.md` 的 `done（...）` 旧状态。stage/track 不一致时先修正状态文件，不得交接或把门禁标为通过。

## 8. 并行规则

- 契约冻结前不并行实现；
- 按文件/模块切分 engineer 实例；
- 同一文件同一时间只有一个 writer；
- 审查与安全可并行；
- QA 可在实现后先写用例，但结论基于最终代码；
- 文档可与 QA 并行，但命令必须验证；
- 上游 BLOCKED 不启动下游。

## 9. 失败处理

| 情况 | 动作 |
|---|---|
| Subagent BLOCKED | 判断输入/权限/环境/歧义；补输入/换 owner/重试一次 |
| 审查不通过 | findings 转 owner；修复后回归审查 |
| 测试失败 | 区分环境/数据/真实缺陷；真实缺陷转 owner；QA 回归 |
| 安全 Critical/High | 阻断发布；修复或书面接受风险 |
| 上下文不足 | 写 HANDOFF；建议新会话 |
| 重复失败 ≥2 | 停止重试；写 RISK；向用户说明选项 |
| 生产事故 | 回滚优先；记录时间线；复盘 |

## 10. 示例

### 示例 A：T1 修复

```text
/ai-hotfix 登录后偶发 401，刷新后又正常
```

Chief：

1. 写 `TASK-0001`：现象/影响/复现；
2. Engineer 复现 → 根因（token 刷新竞态）→ 最小修复；
3. Reviewer 审查 diff；
4. QA 回归：登录/刷新/并发/过期；
5. 记录证据与预防措施（测试/监控）。

### 示例 B：T2 功能

```text
/ai 给现有后台加一个“批量导出 CSV”功能，支持筛选和权限
```

Chief：

1. PRD-lite：用户/权限/字段/大数据量/失败重试；
2. UX note：入口/进度/错误/空态；
3. Design note：API/流式/分页/权限；
4. Engineer 实现 + 单测；
5. Reviewer + QA；
6. 安全检查（越权/注入/大文件）；
7. Done。

### 示例 C：T3 产品

```text
/ai 做一个面向小团队的 OKR 管理 SaaS，Web，支持多租户、SSO、审计，先 MVP
```

Chief：

1. 全 G0–G8；
2. PM/UX/Architect 并行；
3. 多 engineer 按模块并行；
4. 代码审查 + 安全 + QA；
5. Docker/CI/部署/回滚；
6. 文档 + 复盘。

## 11. 定制

- 改角色：编辑 `.opencode/agents/ai-team/*.md`；
- 改命令：`.opencode/commands/ai*.md`；
- 改标准：`.opencode/skills/ai-team-*/**`；
- 改权限：agent frontmatter `permissions`；
- 项目级覆盖：项目 `.opencode/opencode.jsonc` 的 `agents`/`permissions`；
- 改默认 agent：`opencode.json(c)` 的 `default_agent`。

修改后跑 `node scripts/verify.mjs`，并在真实项目做一次 smoke test。
