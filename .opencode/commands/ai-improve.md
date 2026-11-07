---
description: 维护者命令（build）：审计项目 GROWTH 与会话；默认只分析，授权后实施
agent: build
---

优化对象项目：

$ARGUMENTS

执行“跨项目团队优化”。默认只做分析和提案，**不修改 AI Native 团队源**；用户阅读报告并明确授权后，才进入实施。

## 0. 参数与定位

1. **模式**
   - 无 `--apply`：默认分析模式。只读项目和团队源，输出报告，然后停止等待授权。
   - `--apply`：用户已阅读分析报告并授权实施。读取项目最新 `TEAM-IMPROVEMENT-*.md`，校验后进入第 5 节；没有报告或报告已过期 → `BLOCKED`，先跑默认分析。
   - `--analyze-only`：只分析，不询问实施，也不创建实施证据。

2. **项目路径**
   - 参数包含 `--apply`/`--analyze-only` 时先剥离标记。
   - 绝对路径优先；相对路径相对当前目录；项目名按当前目录、父目录、`$HOME/Development`、`D:/Development`、`$HOME/Documents` 查找唯一目录。
   - 找不到/多个命中 → `BLOCKED`，不要猜。
   - 项目没有 `.ai-team/` 时只做会话观察，明确标注“无项目记忆”。

3. **AI Native 源**
   - 当前目录有 `team-manifest.json` → 当前目录。
   - 否则读 `$AI_NATIVE_HOME`。
   - 否则读 `$HOME/.config/opencode/ai-team-install.json` 的 `source`。
   - 仍找不到 → `BLOCKED`。不要修改安装副本。

4. **边界**
   - 分析阶段：只读项目业务代码；只能写项目侧分析报告，不修改目标项目 GROWTH，不修改 AI Native 源。
   - 实施阶段：只在用户授权后修改目标项目 GROWTH 和 AI Native 源。
   - 不新增角色，除非满足第 3 节的 `ROLE-GAP` 门槛。

## 1. 建立证据基线（只读）

在项目目录运行（没有 `.ai-team/` 时跳过前四项）：

```powershell
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/state-check.mjs" --project .
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/growth-check.mjs" --project .
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/retro-check.mjs" --project .
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/checkpoint-check.mjs" --project . --handoff
```

然后运行证据扫描：

```powershell
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/improve-scan.mjs" `
  --project "<project-path>" `
  --out "<project-path>/.ai-team/team/IMPROVEMENT-SCAN-YYYY-MM-DD.md"
```

同时读取：

- `.ai-team/team/GROWTH.md`：frontmatter、提案处置索引、RETRO、未处置项、落地版本是否真实存在；
- `.ai-team/team/AUDIT.json`：上次全量审计水位、覆盖会话数、报告路径；
- `.ai-team/team/TEAM-USAGE-AUDIT-*.md`：最近一次会话审计结论；
- `STATUS.md`、`TASKS.md`、`RISKS.md`、`HANDOFF.md`、`CHECKPOINT.json`；
- `reviews/**`、`qa/**`、`security/**`、`release/**`；
- `git status --short`、`git log --oneline -10`。

如果会话数据库不可用或 `parts` 已清理，必须写“数据缺口”，不能把“没有数据”当成“没有发生”。

## 2. 分析维度（必须逐项给证据）

1. **GROWTH 健康度**：未处置提案、证据是否 ≥2 次、是否重复、是否长期 `proposed`、落地版本/任务是否真实、处置后是否回填日期。
2. **会话使用**：会话/消息/工具调用/错误/权限拒绝/角色分布/子会话深度/token 与耗时；只观察，不做 token/成本预算，除非用户另行批准。
3. **交付质量**：一次验收通过率、返工、P1 复发、审查轮次、QA 逃逸、checkpoint/artifact/secret 失败、HANDOFF 缺失。
4. **角色覆盖**：反复出现的未归属工作、跨角色返工、审查/QA/安全独立性、Chief 是否替成员干活；单次现象不构成新增角色理由。
5. **文档漂移**：README/INSTALL/docs/CHANGELOG/manifest 与当前行为、命令数、验证计数、版本号是否一致；文档命令是否可执行。
6. **行业对照**：只引用相关实践——PDCA/Kaizen、DORA、SRE 无责复盘、Diátaxis、最小权限/供应链安全。
7. **成本与延迟**：报告趋势和异常，不建立预算机制，不因单次高消耗直接改流程。

每个结论必须有文件路径、命令、退出码或计数；只有一次证据的现象写入 `RISKS.md`，不写成 GROWTH 提案。

## 3. 决策分级（分析阶段）

在项目 `.ai-team/team/TEAM-IMPROVEMENT-YYYY-MM-DD.md` 输出；没有 `.ai-team/` 时写到项目根，并标注“项目未初始化”。

| 结论 | 条件 | 动作 |
|---|---|---|
| `NO-OP` | 无反复出现的缺口，文档也一致 | 记录“本轮不优化”+ 下次复查触发点 |
| `DOCS-ONLY` | 仅文档/计数/版本/命令与行为不一致 | 授权后只改文档与 manifest；patch 版本 |
| `PATCH` | ≤2 个文件的小修，如 prompt、命令、脚本参数、模板 | 授权后实施；patch 版本 |
| `FEATURE` | 需要新脚本/新命令/新工作流 | 授权后设计、审查、QA、安全；minor 版本 |
| `ROLE-GAP` | 同一能力缺口在 ≥2 个任务/项目出现 ≥3 次，且现有角色无法覆盖 | 先提案；默认不新增角色，需单独明确批准 |
| `DEFER` | 证据不足或环境阻塞 | 写 `RISK-*` + 复查日期，不硬改 |

硬规则：

- 每轮最多推进 **2 个改动**，优先解决一个系统性瓶颈。
- 不把单项目特例写进通用团队规则；单项目策略归 `PROJECT-PROFILE`（项目 `.ai-team/tasks` 或 `profiles/`），一次性现象写 `RISKS.md`。
- 只有 `TEAM-CORE`（跨项目复用、通用脚本/模板缺陷、≥2 项目或 ≥3 任务证据）才进团队 GROWTH / AI Native 源。
- 净零：每轮新增 `TEAM-CORE` 提案 ≤2，且 ≤ 本轮关闭/合并数；团队 open 连续两轮上升时停止新增，先清债。
- 提案必须有：目标、证据、验收标准、风险、回滚、文档影响、版本级别、scope、复查日期。
- 分析阶段**不修改** `GROWTH.md`、AI Native 源、版本或安装。
- 报告必须写清“授权后将要改哪些文件、调用哪些角色、版本级别、风险”。

## 4. 授权门（强制）

分析完成后，输出一个不超过 20 行的授权请求：

- 结论与证据摘要；
- 拟修改文件/命令/agent/skill；
- 是否新增命令/脚本/角色；
- 版本级别；
- 是否调用子智能体（按第 5 节矩阵）；
- 风险与回滚；
- 是否包含 commit/push（push 必须单独明确批准）。

然后**停止**，等待用户明确回复“同意修改”或类似授权。

- 默认模式：不得在同一轮自动进入实施。
- `--analyze-only`：只输出报告，不请求实施。
- `--apply`：视为用户已阅读报告并授权；仍需先校验报告与当前项目/团队版本一致，再实施。

## 5. 实施（仅在授权后）

1. 更新目标项目 `GROWTH.md`：新增 `P-*` 提案并登记 `proposed` + `scope`；如果本轮已实施，授权后改为 `done` 并写落地版本/任务、证据、日期。`scope: project` 的提案不计入团队 open。
2. 在 AI Native 源建 `TASK-IMPROVE-*`；默认写本地 `.ai-team/`（gitignored），实施完成后归档/清理。
3. 用 `brief-new.mjs` 生成 brief，`brief-lint` 通过后再派发。
4. 按风险决定执行者：

| 结论 | 执行者 |
|---|---|
| `DOCS-ONLY` | `build` 自己改文档 |
| `PATCH` | `build` 实现 + `ai-team/code-reviewer` 审查 |
| 涉及脚本/权限/安全语义 | 加 `ai-team/security-auditor` |
| `FEATURE` | `ai-team/engineer` + reviewer + security + DevOps |
| `NO-OP` / `DEFER` | 不调用子智能体 |

5. 修改 AI Native 源；不直接改安装副本。
6. 按影响同步：
   - `team-manifest.json` 版本与清单；
   - `scripts/verify.mjs` 预期数量；
   - `README.md`、`INSTALL.md`；
   - `docs/WORKFLOW.md`、`docs/TEAM.md`、`docs/IMPROVEMENT.md`；
   - `docs/VERIFICATION.md`、`CHANGELOG.md`；
   - 新增命令时同步 manifest、README、安装说明、一致性审计。
7. 文档准确性检查：
   - `rg -n "<旧版本>|<旧计数>|<旧命令数>|<旧角色数>" README.md INSTALL.md docs team-manifest.json`
   - 检查相对链接；
   - 命令示例实际执行并记录退出码。
8. 验证：
   - `node scripts/verify.mjs`
   - `node scripts/audit-team-consistency.mjs`
   - `node scripts/audit-git-permissions.mjs`
   - `node .opencode/skills/ai-team-workflow/scripts/permission-lint.mjs`
   - `node scripts/version.mjs --update`，然后 installed verify 和 `version.mjs --check`
9. 提交与发布：
   - AI Native 团队源变更由 `build` 作为维护者精选提交；
   - 目标项目 `.ai-team`/`GROWTH` 变更按该项目自身策略提交；若项目使用本团队 checkpoint，派 `ai-team/devops-engineer`；
   - 不使用 `git add -A` / `git add .`；push 前需用户批准；
   - 更新安装后提示新开会话（`RESTART REQUIRED`）。
10. 实施完成后归档/清理 AI Native 本地 `.ai-team/` 证据，保留发布所需摘要。

## 6. 持续优化策略

- **三层入口**：`TEAM-CORE` / `PROJECT-PROFILE` / `OBSERVE`；单项目策略进 `profiles/` 或项目 `.ai-team/tasks`，不进团队核心。
- **净零**：每轮新增 `TEAM-CORE` ≤2，且 ≤ 关闭/合并数；团队 open 连续两轮上升→停止新增，先清债。
- **债务指标**：`growth-check --debt` 看 team/project open、年龄、重复簇；`improve-scan` 报告趋势。
- **触发**：每 10 个 `done`、每月、每次团队版本发布后、P0/P1 事故后、同类问题第 2 次出现、GROWTH 未处置 ≥3。
- **基线**：先记录当前指标，再改；至少保留一组改动前后对比。
- **小步**：一次最多 2 个改动；优先 prompt/命令/模板，再脚本，最后才角色。
- **可回滚**：每个提案写回滚方式和观察窗口。
- **无改善就撤回**：观察一个完整节奏后仍无改善，标记 `rejected`/`superseded`。
- **文档同轮**：行为、命令、计数、版本必须同轮同步；文档不一致视为未完成。
- **证据优先**：一次证据写 RISK，两次以上再写提案。
- **反模式**：为单项目特例改通用团队；用更多权限/更多角色解决流程问题；只改文档不改行为；只改行为不改文档；用“重跑通过”关闭 flake。

## 7. 汇报格式

不超过 20 行：

- 模式：分析 / 实施；
- 结论：`NO-OP` / `DOCS-ONLY` / `PATCH` / `FEATURE` / `ROLE-GAP` / `DEFER`；
- 项目与证据：GROWTH 未处置数、会话/消息/工具错误/权限拒绝、最近审计水位；
- 主要发现 3 条（带证据路径）；
- 提案 1–3 条（目标/验收/版本级别）；
- 如需实施：拟改文件、拟调用角色、风险、是否等待授权；
- 风险与复查触发点；
- 是否已 commit/push。

若 `.ai-team/` 不存在，先说明“无项目记忆”，只输出会话观察和初始化建议，不要伪造复盘结论。
