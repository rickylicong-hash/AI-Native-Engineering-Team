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
技能：ai-team-workflow；AI 功能加 ai-team-ai-native
任务 ID：TASK-0001
Track / 阶段：T3 / G4
目标：<一句话，可验收>
背景与输入：<文件/需求/设计/契约/上一任务>
所有权：只允许修改 <paths>；禁止 <paths>
约束：<技术/合规/兼容/性能/依赖>
设计预审：<无 / 涉及凭据、迁移、传输、租户边界 → SEC-xxxx 通过后才能开工>
装配清单：<Bean 注册点 / 持久化仓储 / 外部依赖或制品 / 配置键 / 迁移>
契约影响：<必填；只引 API-CONTRACTS/ADR 章节号或字段名，不复制定义；有变更时同一提交更新契约 + 契约测试>
回归范围：<原 P1/缺陷 + 相邻路径 + 关键旅程>
事务边界与部分提交：<涉及重试/幂等/事务/并发/回滚/迁移时必填：事务范围、重放位置、部分提交可见性、失败回滚>
旧行为反证：<修复类必填：旧实现如何失败、如何证明已修复；非修复写“不适用”>
边界四问：<组件故障 / 事务回滚或部分提交 / 导出或依赖链不可用 / 拒绝顺序与豁免；逐项给结论>
验收标准：
  1. ...
  2. ...
必须执行：<命令/测试/扫描；参数以对应 --help 实跑为准>
脚本参数：以 `<script> --help` 实跑为准；不手抄参数
独立验证：<reviewer/QA 必须实际执行的命令；无 shell 写 RISK-* + 补偿证据>
证据位置：<logs/<date>/... 或 .ai-team/work/<TASK>-logs/；UTF-8；禁止 Tee-Object 默认编码>
测试路径：<owner=qa-engineer 时必填；QA-owned + 构建 test source root>
构建隔离：<共享工作区串行 / 独立 worktree>
P2 处置：<修改后通过时必填；TASK-* / RISK-* / 明确接受>
证据要求：命令 + 退出码 + 原始输出摘要 + 文件路径；敏感值已脱敏
禁止：不得启动 subagent；不得跨职责；不得改 state；不得伪造证据；不得手抄脚本参数/契约字段
回报格式：结论/改动/证据/风险/下一步/TASKS.md 建议更新
```

生成与预检：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-new.mjs" --task TASK-xxxx --agent ai-team/engineer --out .ai-team/tasks/TASK-xxxx-BRIEF.md
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-lint.mjs" --brief .ai-team/tasks/TASK-xxxx-BRIEF.md --agent ai-team/engineer
```

缺 `脚本参数`、`契约影响`、`独立验证`、`证据位置`（含 UTF-8）、QA `测试路径`、Reviewer/Security `P2 处置` 或 `构建隔离` 时不得派发。

P-32/P-34 起，涉及重试/幂等/事务/并发/回滚/迁移的 engineer brief 还必须填 `事务边界与部分提交` 与 `旧行为反证`；reviewer/QA brief 必须填 `边界四问`。字段值必须与字段名同行；写“不适用/N/A/无”视为未填。`brief-lint` 校验字段值，不校验字段名。

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
- 部署无健康检查/回滚；
- 把日志/临时文件写在仓库根目录；
- 用 UTF-16/二进制日志作为唯一证据；
- 证据含明文 `Set-Cookie`/`Authorization`/Cookie/口令/token；
- 用“重跑通过”关闭 flake。

修复/回归任务额外要求：`work/TASK-*-EVIDENCE.md` 附 P1 closure 表（原 P1、修复点、复现命令、回归结果），并说明是否引入新的同类 P1；没有这张表，G5 不通过。

证据与产物规则：

- 原始日志放 `logs/<date>/TASK-<id>-<step>-<timestamp>.log` 或 `.ai-team/work/<TASK>-logs/`，禁止写仓库根目录；
- 统一 UTF-8；PowerShell 5.1 用 `Out-File -Encoding utf8`，不要用 `*>` 默认生成 UTF-16；
- `logs/**` 下的 UTF-16 是 error；运行 `artifact-check --fix` 转换。`.ai-team/work/**` 的历史 UTF-16 是 warning，可用 `--fix-all` 批量迁移；
- 失败日志命名 `*.failed.log`，并在 EVIDENCE 写失败原因、是否已修复、后续通过证据；
- T0/spike 的 `target/` 构建产物在任务收口清理；根目录 `io/org/com` 等只有 `.class` 的目录视为误落盘；
- 非确定性测试失败先登记 `RISK-*`/`DEF-*`，写明 owner 与关闭条件；重跑通过不能单独关闭 P1/安全项。

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
- **团队源维护提交**：AI Native 团队仓库由 `build` 维护者按作者模型提交；目标项目 `.ai-team` checkpoint 仍由 DevOps。
- **代码作者提交代码**：Engineer 提交代码 + 单测 + `.ai-team/work/TASK-*` 证据；流程上由作者执行，不再需要权限 `ask`。
- **文档作者提交文档**：Writer 提交 `docs/**`、README、CHANGELOG、`.ai-team/docs`；流程上由作者执行，不再需要权限 `ask`。
- **只读角色不 commit**：Chief/PM/UX/Architect/Reviewer/Security 不拿 raw git；这是流程约定，权限不再强制。
- **流程建议只 stage 明确路径**；`git add -A`/`git add .` 不再被权限拒绝。
- **提交前扫描密钥/凭据/客户数据**；安全报告脱敏。
- **push 前需用户批准**（L3）；权限不再 `ask`，由流程保证。

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

**处置回传（1.3.0）**：每条提案必须登记到 `GROWTH.md` 的“提案处置索引”。新增为 `proposed`；处置后同一轮回填 `done/rejected/superseded` + 落地版本/任务 + 证据 + 日期。复盘、交接、门禁前运行 `growth-check`；全部处置且非最近一轮的 RETRO 可用 `growth-check --archive --yes` 归档到 `team/archive/GROWTH-<year>.md`，主文件保留索引与导航。

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

DevOps 提交后运行 `--mark --sync-docs` 更新 `state/CHECKPOINT.json` 并自动同步 `HANDOFF.md` 的 `远程`/`Git`/`Baseline` 与 `STATUS.md` 的 `Retro`/`Growth`/`Checkpoint`/`远程`/`HEAD`。`远程` 行由脚本用 `git ls-remote` 读取远端 SHA 计算 ahead（远端不可达时回退本地并显式标记 `local`），并剥离 userinfo；`Retro` 取 `GROWTH.md` frontmatter，`Growth` 取 `growth-check --json`，不要手写。`checkpoint-check` 会同时扫描根目录产物、证据编码和明文凭据；有 artifact error 时 `--mark` 拒绝。证据扫描默认上限 2000，可用 `--max-evidence-files` 调整。`--mark --sync-docs` 先完成 HANDOFF/STATUS 校验与内容计算，失败时零写入；成功后才落 `CHECKPOINT.json`。**同步后提交纯文档变更并运行 `state-check`；未同步不算 checkpoint 完成。** 若本次 checkpoint 包含 `GROWTH.md` 变更，DevOps 先运行 `growth-check`，有缺失处置状态时退回 Chief。Chief 不得自己 `git add`/`git commit`/`git push`；用户要求暂不提交时，在 HANDOFF 写 `Checkpoint: WAIVED` + 原因 + `RISK-*`。

### 7.4 状态一致性

会话启动、交接、门禁前运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\state-check.mjs" --project .
# 500+ 证据文件项目：默认上限 2000，可用 --max-evidence-files 调整
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\state-check.mjs" --project . --max-evidence-files 2000
```

检查 `PROJECT.md`/`STATUS.md` 的 track/stage、`HANDOFF.md` 的 Git/Baseline commit、`TASKS.md` 的 `done（...）` 旧状态，以及根目录临时产物和证据编码。`Baseline` 只写最近代码 checkpoint；其后的纯文档/`.ai-team` 提交不报 warning。stage/track 不一致或存在 artifact error 时先修正，不得交接或把门禁标为通过。

### 7.5 设计与契约前置

- **P-13 设计预审**：涉及凭据、迁移、传输、租户边界的设计，必须先有 `SEC-*` 预审通过，才能进入实现。
- **P-14 契约同提交**：新增/修改错误码、端点、事件字段时，同一提交更新 `API-CONTRACTS` 和契约测试；G5 检查枚举与契约恒等。
- **P-07 装配清单**：任务 brief 必须写 Bean 注册点、持久化仓储、外部依赖/制品、配置键、迁移；缺项即 BLOCKED。
- **P-08 审查节流**：同一模块连续未审切片 ≤2；第 3 个切片开工前先完成审查。
- **P-10 状态回填**：任务回报必须包含 `TASKS.md` 建议更新，Chief 当轮落盘。

### 7.6 证据、构建与成长治理（P-15..P-19, T-20..T-38）

- **P-15 产物卫生**：原始日志只进 `logs/<date>/` 或 `.ai-team/work/<TASK>-logs/`；根目录不得有 `*.log`、`target-*`、`*.tmp`、`*.class`；spike/T0 的 `target/` 收口清理。
- **P-16 flake 治理**：非确定性失败登记 `RISK-*`/`DEF-*`，写复现命令、频率、owner；重跑通过只能作为临时证据，不能单独关闭 P1/安全项；至少连续 3 次通过或固定种子/有限重试并保留首次失败日志。
- **P-17 审查独立复现**：reviewer brief 默认授予测试/扫描 shell；无 shell 必须写 `RISK-*` + 补偿证据。证据必须可读（UTF-8 或文本摘要），UTF-16/二进制日志不能作为 P1/安全项唯一依据。reviewer 报告必须写“实际执行/未能执行”的命令。
- **P-18/P-26 checkpoint 收口**：`checkpoint-check --mark --sync-docs` 自动同步 `HANDOFF Git/Baseline` 与 `STATUS Checkpoint` 到该 commit；提交纯文档变更后运行 `state-check`；`TASK-GIT-*` 证据包含 `state-check` PASS。
- **P-19 QA 测试路径**：Java/Maven/Gradle 的 E2E 放在 `**/src/test/java/**/e2e/**`（资源放 `**/src/test/resources/**/e2e/**`）；brief 的 `测试路径` 必须 QA-owned 且在构建 test source root；E2E 必须用标准构建命令从干净 checkout 执行，禁止手工 `javac`/复制 class 作为最终证据。
- **T-20 构建互斥**：同一工作区同一时刻只允许一个 subagent 执行会写 `target/`/`build/`/`coverage/` 的命令；并行任务默认只读或独立 worktree；brief 写 `构建隔离`。
- **T-21 独立验证强制**：reviewer/security 的 brief 必须给可执行测试/扫描命令；禁止默认写“无 shell”；无 shell 需 `RISK-*` + Chief 批准，且不得据此关闭 P1/安全项。
- **T-22 DEF 生命周期**：owner 只能置 `fixed`；只有 QA 能在独立回归后置 `verified/closed`；S1/S2 必须有关闭证据；使用 `templates/DEFECTS.md`。
- **T-23 状态自检**：`state-check` 检查重复 TASK-ID；每批 `state/**` 编辑后运行；交接前 0 error、0 重复。
- **T-24 P2 债**：审查“修改后通过”的每个有实际风险 P2 必须有 `TASK-*`/`RISK-*` 或书面接受；只在报告里记录不算处置。
- **T-25 权限/审计加固**：Engineer 不得编辑 QA-owned Java E2E；DevOps 只写 `TASK-GIT-*EVIDENCE.md`；一致性审计覆盖上述边界。
- **T-26 成长处置**：`GROWTH.md` 的“提案处置索引”是唯一状态源；每条提案处置后同一轮回填状态/落地/证据/日期；`growth-check` 检查；已处置旧 RETRO 可归档到 `team/archive/`。
- **T-27 审查/证据收口**：第 3 轮仍不通过必须由 Chief 裁决；R 轮同批更新受影响证据；安全语义改动必须有 fail-open 反例；大切片用 `checkpoint-check --max-files` 提前 checkpoint。
- **T-30 brief 生成/预检**：派发 subagent 前优先用 `brief-new.mjs` 生成骨架，再运行 `brief-lint.mjs --agent`；缺 `脚本参数`/`契约影响`/`独立验证`/`证据位置`（UTF-8）/`证据门禁`（`artifact-check --strict` + 允许的日志路径）/QA `测试路径`/Reviewer-Security `P2 处置`/`Done gate`/`运行时取证`/`构建隔离` 时不得派发。P-32/P-34 起，事务类 engineer brief 还缺 `事务边界与部分提交`/`旧行为反证`，reviewer/QA 缺 `边界四问` 时也不得派发；字段值不能是占位符或“不适用/N/A/无”（非运行时任务除外，但必须写明“不适用（无容器/外部依赖）”）。
- **T-31 shell 单命令（1.4.2 起由 T-36 取代）**：历史规则禁止 `;`/`&&`/`||`/`2>&1`/管道拼接；1.5.0 不再保留这些限制。
- **T-32 审查报告门禁**：Reviewer/Security 报告必须通过 `review-check.mjs --strict`；无实际命令/退出码只能记 `RISK-*`，不得关闭 P1/安全项。
- **T-33 会话审计水位**：全量会话审计后运行 `audit-state.mjs --mark`；下次只看水位之后的 session/message。
- **T-34 权限矩阵与预检**：`permissions.json` 只保留破坏性 shell forbidden；`permission-lint --role` 在 `/ai` 和 `/ai-resume` 前运行；`permission-doctor` 定位拒绝。
- **T-35 可选结构化执行器**：`team-shell.mjs --role <role> --action <action>` 可用于 git 读取、构建/测试、扫描和团队脚本，提供参数校验与结构化日志；gateway 只在通过它调用时生效，不是权限边界；简单命令直接 shell。
- **T-36 Shell-first strict（1.6.0）**：所有角色 shell 默认 allow；只有破坏性命令 deny；commit/push/publish/密钥/`git add -A` 不再由权限拦截；ownership 由 brief + diff + checkpoint + 会话审计约束。
- **T-37 证据脱敏（P-27/P-44）**：`secret-check` 扫描 qa/work/release/security/logs，默认上限 2000；截断时 `PARTIAL` + exit 3，findings 只输出 `kind/file/line/len/sha256`，不打印明文。`artifact-check`、`state-check`、`checkpoint-check --mark`、`review-check` 阻断明文 Cookie/Authorization/口令/token；`artifact-check` 在 `secrets.truncated` 时以 `secret-scan-truncated` 失败。
- **T-38 升级后新会话（P-29）**：`version.mjs --update` 后必须新开会话/重启；旧会话可能仍使用旧权限缓存；普通命令被拒先查版本，不扩 allow。

### 7.7 跨项目持续优化（1.7.0）

`/ai-improve <project>` 由 `build` 维护者运行，用项目的真实使用证据优化团队本身：

1. 读取项目 `GROWTH.md`、`AUDIT.json`、最近 `TEAM-USAGE-AUDIT-*.md`、状态与交付证据；
2. 运行 `improve-scan.mjs` 汇总会话/消息/工具错误/权限拒绝/角色分布；`session_part` 为空时从 `session_message.data.content` 读取工具明细，并注明数据源；
3. 按 `NO-OP / DOCS-ONLY / PATCH / FEATURE / ROLE-GAP / DEFER` 决策，写项目侧报告；
4. **默认停止并等待用户授权**；授权后用 `--apply` 实施，不能在同一轮自动修改团队源；
5. 实施按风险调用子智能体：`DOCS-ONLY` 由 build 自己改；`PATCH` 加 code-reviewer；涉及脚本/权限/安全加 security-auditor；`FEATURE` 才用完整团队链；
6. 回填项目 GROWTH 的提案处置索引，运行 `growth-check`；实施完成后清理本地 `.ai-team` 证据。

规则：

- 单次证据写 `RISK-*`；≥2 次才写 GROWTH 提案；`ROLE-GAP` 需 ≥3 次、跨 ≥2 任务/项目且现有角色无法覆盖；
- 每轮最多 2 个改动；优先改 prompt/命令/模板，再考虑脚本；
- 必须写基线、验收、回滚和观察窗口；无改善就 `rejected`/`superseded`；
- 行为、命令、计数、版本、文档同轮同步；文档不一致视为未完成；
- token/成本只观察，不建立预算机制，除非用户另行批准。

完整策略见 `docs/IMPROVEMENT.md`。

## 8. 并行规则

- 契约冻结前不并行实现；
- 按文件/模块切分 engineer 实例；
- 同一文件同一时间只有一个 writer；
- 同一工作区同一时间只有一个会写 `target/`/`build/`/`coverage/` 的构建；
- 审查与安全可并行，但构建/扫描必须串行或使用独立 worktree；
- QA 可在实现后先写用例，但结论基于最终代码；
- 文档可与 QA 并行，但命令必须验证；
- 上游 BLOCKED 不启动下游。

## 9. 失败处理

| 情况 | 动作 |
|---|---|
| Subagent BLOCKED | 判断输入/权限/环境/歧义；补输入/换 owner/重试一次 |
| 审查不通过 | findings 转 owner；修复后回归审查 |
| 第 3 轮仍不通过 | Chief 裁决：拆分任务 / 降级 / 接受风险；不得无限返工 |
| 成长提案未回填 | `growth-check` 阻断交接；先补处置索引 |
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
