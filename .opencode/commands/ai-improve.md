---
description: 维护者命令（build）：审计项目 GROWTH 与会话，持续优化 AI Native 团队并同步文档
agent: build
---

优化对象项目：

$ARGUMENTS

执行“跨项目团队优化”模式。目标不是给单个项目修 bug，而是用真实使用证据判断 AI Native 团队是否需要进化；优化后必须同步团队文档，保证可分享性和准确性。

## 0. 定位项目与团队源

1. **项目路径**
   - 参数包含 `--analyze-only` → 先剥离该标记，只做分析/提案，不进入实施。
   - 参数是绝对路径且存在 → 直接使用。
   - 参数是相对路径 → 相对当前工作目录解析。
   - 参数是项目名（如 `riccon-ai`）→ 依次在当前目录、父目录、`$HOME/Development`、`D:/Development`、`$HOME/Documents` 查找同名目录；只有唯一命中才使用，多个或找不到时 `BLOCKED`，不要猜。
   - 项目必须包含 `.ai-team/`；没有时只做会话观察，明确标注“无项目记忆”，不得伪造 GROWTH 结论。

2. **AI Native 源**
   - 当前目录存在 `team-manifest.json` → 当前目录就是团队源。
   - 否则读 `$AI_NATIVE_HOME`。
   - 否则读 `$HOME/.config/opencode/ai-team-install.json` 的 `source` 字段。
   - 仍找不到 → `BLOCKED`。不要修改安装副本 `~/.config/opencode`，它是发布产物。

3. **边界**
   - 只读项目业务代码；项目 `.ai-team/**` 只写审计报告和 GROWTH 提案。
   - 只有用户批准后，才修改 AI Native 源 `.opencode/**`、`scripts/**`、`docs/**`、`README.md`、`CHANGELOG.md`、`team-manifest.json`。
   - 不新增角色，除非满足第 3 节的 `ROLE-GAP` 门槛。

## 1. 建立证据基线

在项目目录运行（没有 `.ai-team/` 时跳过前四项，只做会话观察）：

```powershell
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/state-check.mjs" --project .
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/growth-check.mjs" --project .
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/retro-check.mjs" --project .
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/checkpoint-check.mjs" --project . --handoff
```

然后运行证据扫描，把结果写到项目：

```powershell
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/improve-scan.mjs" `
  --project "<project-path>" `
  --out "<project-path>/.ai-team/team/IMPROVEMENT-SCAN-YYYY-MM-DD.md"
```

如果本次是全量会话审计，分析完成后用 `audit-state.mjs --mark` 记录水位（`--report`、`--scope`、`--session-count`、`--last-session-created`、`--last-session-updated`、`--last-message-time` 取扫描报告中的候选值）；增量审计不要覆盖水位。

同时读取：

- `.ai-team/team/GROWTH.md`：frontmatter、提案处置索引、RETRO、未处置项、落地版本是否真实存在；
- `.ai-team/team/AUDIT.json`：上次全量审计水位、覆盖会话数、报告路径；
- `.ai-team/team/TEAM-USAGE-AUDIT-*.md`：最近一次会话审计结论；
- `STATUS.md`、`TASKS.md`、`RISKS.md`、`HANDOFF.md`、`CHECKPOINT.json`；
- `reviews/**`、`qa/**`、`security/**`、`release/**` 中的失败、返工、放行结论；
- `git status --short`、`git log --oneline -10`。

如果会话数据库不可用或 `parts` 已清理，必须在报告里写“数据缺口”，不能把“没有数据”当成“没有发生”。

## 2. 分析维度（必须逐项给证据）

1. **GROWTH 健康度**：未处置提案、证据是否 ≥2 次、是否重复、是否长期 `proposed`、落地版本/任务是否真实、处置后是否回填日期。
2. **会话使用**：会话/消息/工具调用/错误/权限拒绝/角色分布/子会话深度/token 与耗时；只作为观察指标，不做 token 预算机制，除非用户另行批准。
3. **交付质量**：一次验收通过率、返工、P1 复发、审查轮次、QA 逃逸、checkpoint/artifact/secret 失败、HANDOFF 缺失。
4. **角色覆盖**：反复出现的未归属工作、跨角色返工、审查/QA/安全独立性、Chief 是否替成员干活；单次现象不构成新增角色理由。
5. **文档漂移**：README/INSTALL/docs/CHANGELOG/manifest 与当前行为、命令数、验证计数、版本号是否一致；文档命令是否可执行。
6. **行业对照**：只引用相关实践——PDCA/Kaizen、DORA 交付指标、SRE 无责复盘、Diátaxis 文档分类、最小权限/供应链安全；不要生搬硬套。
7. **成本与延迟**：报告趋势和异常，不建立 token/成本预算，不因单次高消耗直接改流程。

每个结论必须有文件路径、命令、退出码或计数；只有一次证据的现象写入 `RISKS.md`，不写成 GROWTH 提案。

## 3. 决策分级

在项目 `.ai-team/team/TEAM-IMPROVEMENT-YYYY-MM-DD.md` 输出；没有 `.ai-team/` 时写到项目根 `TEAM-IMPROVEMENT-YYYY-MM-DD.md`，并标注“项目未初始化”。

| 结论 | 条件 | 动作 |
|---|---|---|
| `NO-OP` | 无反复出现的缺口，文档也一致 | 记录“本轮不优化”+ 下次复查触发点 |
| `DOCS-ONLY` | 仅文档/计数/版本/命令与行为不一致 | 修文档与 manifest；patch 版本 |
| `PATCH` | ≤2 个文件的小修，如 prompt、命令、脚本参数、模板 | patch 版本；走审查 + 验证 |
| `FEATURE` | 需要新脚本/新命令/新工作流 | minor 版本；走设计、审查、QA、安全 |
| `ROLE-GAP` | 同一能力缺口在 ≥2 个任务/项目出现 ≥3 次，且现有角色无法覆盖 | 先提案；默认不新增角色，需用户明确批准 |
| `DEFER` | 证据不足或环境阻塞 | 写 `RISK-*` + 复查日期，不硬改 |

硬规则：

- 每轮最多推进 **2 个改动**，优先解决一个系统性瓶颈，避免“为了优化而优化”。
- 不把单项目特例写进通用团队规则；项目特定逻辑留在项目 `.opencode/**` 或项目配置。
- 提案必须有：目标、证据、验收标准、风险、回滚、文档影响、版本级别（patch/minor）。
- 在项目 `GROWTH.md` 的“提案处置索引”新增 `P-*` 行，状态 `proposed`；运行 `growth-check`。
- 如果结论是 `NO-OP`/`DEFER`，也要写报告和复查触发点，不要只口头说“没问题”。

## 4. 用户批准

需要修改 AI Native 源时，先给出一个合并问题，包含：

- 结论与证据摘要；
- 改动范围（文件/命令/agent/skill）；
- 版本级别与是否新增命令/脚本；
- 风险与回滚；
- 是否包含 commit/push（push 必须单独明确批准）。

批准前不得修改团队源，只写项目侧报告与提案。用户拒绝或要求暂缓时，把提案留在 `proposed`/`deferred` 并写原因。

如果参数带 `--analyze-only`，在完成报告和 `growth-check` 后停止，不请求实施批准。

## 5. 实施与验证（批准后）

在 AI Native 源执行：

1. 建 `TASK-IMPROVE-*`（可用团队仓库本地 `.ai-team/`，该目录已被 `.gitignore` 忽略）。
2. 用 `brief-new.mjs` 生成 brief，`brief-lint` 通过后再派发；小改动至少走 engineer → reviewer → 验证；涉及脚本/权限/安全语义时加 security。
3. 修改源文件；不直接改安装副本。
4. 按影响同步：
   - `team-manifest.json` 的 `version` 与 commands/agents/skills 清单；
   - `scripts/verify.mjs` 的预期数量；
   - `README.md` 的命令表/目录/验证数字；
   - `INSTALL.md` 的安装与验证数字；
   - `docs/WORKFLOW.md`、`docs/TEAM.md`、`docs/IMPROVEMENT.md`；
   - `docs/VERIFICATION.md` 的当前版本、计数、hash；
   - `CHANGELOG.md` 的版本条目；
   - 如新增命令，更新 manifest、README、安装说明、完整性审计和相关检查。
5. 文档准确性检查：
   - `rg -n "<旧版本>|<旧计数>|<旧命令数>|<旧角色数>" README.md INSTALL.md docs team-manifest.json`
   - 检查所有相对链接可解析；
   - 命令示例必须实际执行，记录退出码。
6. 验证：
   - `node scripts/verify.mjs`
   - `node scripts/audit-team-consistency.mjs`
   - `node scripts/audit-git-permissions.mjs`
   - `node .opencode/skills/ai-team-workflow/scripts/permission-lint.mjs`
   - `node scripts/version.mjs --update`，然后 installed verify 和 `version.mjs --check`
7. 回填项目 `GROWTH.md`：提案状态改为 `done`，写落地版本/任务、证据、日期；`growth-check` PASS。
8. 提交与发布：
   - AI Native 团队源变更由 `build` 作为维护者精选提交；
   - 目标项目 `.ai-team`/`GROWTH` 变更按该项目自身策略提交；若项目使用本团队 checkpoint，派 `ai-team/devops-engineer`；
   - 不使用 `git add -A` / `git add .`；push 前需用户批准；
   - 更新安装后提示新开会话（`RESTART REQUIRED`）。

## 6. 持续优化策略

把团队优化当作 PDCA 循环，而不是一次性重构：

- **触发**：每 10 个 `done`、每月、每次团队版本发布后、P0/P1 事故后、同类问题第 2 次出现、GROWTH 中出现 3 个以上未处置提案。
- **基线**：先记录当前指标，再改；至少保留一组改动前后对比。
- **小步**：一次最多 2 个改动；优先改 prompt/命令/模板，再考虑脚本，最后才考虑角色。
- **可回滚**：每个提案写回滚方式和观察窗口。
- **无改善就撤回**：观察一个完整节奏后仍无改善，标记 `rejected`/`superseded`，不要继续堆规则。
- **文档同轮**：行为、命令、计数、版本必须同轮同步；文档不一致视为未完成。
- **证据优先**：一次证据写 RISK，两次以上再写提案；不凭“感觉团队变慢了”改架构。
- **反模式**：为单项目特例改通用团队；用更多权限/更多角色解决流程问题；只改文档不改行为；只改行为不改文档；用“重跑通过”关闭 flake。

## 7. 汇报格式

不超过 20 行：

- 结论：`NO-OP` / `DOCS-ONLY` / `PATCH` / `FEATURE` / `ROLE-GAP` / `DEFER`；
- 项目与证据：GROWTH 未处置数、会话/消息/工具错误/权限拒绝、最近审计水位；
- 主要发现 3 条（带证据路径）；
- 提案 1–3 条（目标/验收/版本级别）；
- 如果实施：改动文件、版本、验证命令与退出码、文档同步清单；
- 风险与复查触发点；
- 是否已 commit/push。

若 `.ai-team/` 不存在，先说明“无项目记忆”，只输出会话观察和初始化建议，不要伪造复盘结论。
