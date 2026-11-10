---
description: 维护者命令（build）：审计项目 GROWTH 与会话；默认只分析，授权后实施
agent: build
---

优化对象项目：

$ARGUMENTS

执行“跨项目团队优化”：默认只分析与提案，**不改团队源、不改项目 GROWTH**；用户明确授权后才进入实施。

## 0. 目标校准（先于一切分析）

先读 `docs/TEAM.md` §0/§0.1，在回复开头复述 ≤8 行：使命、6 条团队目标、质量目标口径（实现任务首次进入 review、无 R1/R2、P0/P1=0、无跨角色返工、无 checkpoint 阻断；基线 56.8%；10 任务 ≥70%、30 任务 ≥80%；review-ready 10 任务 ≥90%；护栏 P1 不升、轮次 ≤2、安全不降；**不作硬门禁**）。

请求与目标冲突时（降审查/安全门禁、用“重跑通过”关 flake、为单项目改通用规则、把一次通过率当硬门禁）先停止等裁决；否则不要用“目标校准”拖延。

## 1. 定位与模式

| 模式 | 行为 |
|---|---|
| 默认 | 只分析与报告；输出后停止，等授权 |
| `--apply` | 视为已授权：先校验最新 `TEAM-IMPROVEMENT-*.md` 与当前项目/团队版本一致，再进第 6 节；缺报告或过期 → `BLOCKED` |
| `--analyze-only` | 只分析，不请求实施，不创建实施证据 |

- **项目**：剥离标记后按绝对路径 → 当前目录 → 父目录 → `$HOME/Development` → `D:/Development` → `$HOME/Documents` 找唯一目录；找不到/多命中 → `BLOCKED`；无 `.ai-team/` 只做会话观察并标“无项目记忆”。
- **团队源**：当前目录有 `team-manifest.json` → 用它；否则 `$AI_NATIVE_HOME`；否则 `$HOME/.config/opencode/ai-team-install.json` 的 `source`；仍无 → `BLOCKED`。只改源，不改安装副本。
- **边界**：分析阶段只读业务代码、只写项目侧报告；实施阶段才改项目 GROWTH 与团队源；不新增角色，除非满足 `ROLE-GAP`。

## 2. 证据基线（只读，一次预检）

```powershell
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/gate-check.mjs" --project . --mode handoff --json
```

只对失败项或需定位项再跑 `state-check` / `growth-check --debt` / `retro-check` / `checkpoint-check --handoff`，避免重复 artifact/secret 扫描。然后采集证据（缺数据写“数据缺口”，不能当成“没发生”）：

```powershell
node ".../improve-metrics.mjs" --project . --write --json   # 写 IMPROVEMENT-HISTORY.json
node ".../improve-previous.mjs" --project . --json
node ".../improve-scan.mjs" --project "<path>" --out "<path>/.ai-team/team/IMPROVEMENT-SCAN-YYYY-MM-DD.md"
```

读取：`team/GROWTH.md`（frontmatter/索引/RETRO/落地版本是否真实）、`IMPROVEMENT-HISTORY.json`、最新 `TEAM-IMPROVEMENT-*.md`、`AUDIT.json`、`STATUS/TASKS/RISKS/HANDOFF/CHECKPOINT`、`reviews|qa|security|release`、`git status --short`、`git log --oneline -10`。

## 3. 五项检查 + 历史（逐项给证据）

每项输出 结论 / 证据（文件·命令·退出码·计数）/ 影响 / 建议，并进入报告与最终汇报。

| 检查 | 口径 | 证据 |
|---|---|---|
| 目标偏移检查 | 使命/6 目标/质量目标是否一致；first-pass、review-ready、P1 逃逸、轮次、GROWTH 债务是否改善；是否“流程自证”替代结果 | `quality-report`、`growth-check --debt` |
| 流程与智能体效率检查 | 重复全量、定向/全量比、artifact/secret/state/checkpoint 扫描次数、每任务 gate 调用、prompt 大小、review/security token 占比 | `improve-scan`、会话数据 |
| 定义冲突/臃肿/重复/过期检查 | manifest/TEAM/agent/COMMAND/SKILL 的所有权、Track、G0–G8、brief 字段是否一致；重复模板；过期版本/计数/结论；checkpoint 提交是否有 `TASKS.md` 行 | `audit-team-consistency`、`checkpoint-check --handoff`、`rg` |
| 大型项目能力检查 | 按 `docs/LARGE-PROJECTS.md` 复评；Program/Workstream、集成列车、影响面、队列、成本/容量是否有真实实现与证据 | 项目 `.ai-team/` 工件 |
| 交付面覆盖与骨架闭环检查 | `PAGE-MAP`/`ENDPOINT-MAP` 覆盖率；P0 占位是否延期；契约有端点无实现；骨架未接线；是否用全量页数掩盖当前里程碑 | 两个 coverage 脚本（1.16.0：端点须 `milestone`，到期 deferred 须 DEC/RISK，`TASK-*` 延期须 `authorized_by`） |

**历史与上一轮 improve**（不得只看快照）：

1. 列最近 6–8 轮 first-pass / review-ready / team open / project open / rounds / P1 escapes / tasks done，与本轮比 `improved|declined|flat` + delta + `growthScore` + `verdict`；不足 6 轮写数据缺口。
2. `negativeGrowth=true` 必须给根因（流程/角色/工具/文档），本轮至少 1 个直接改善恶化指标的任务（owner/验收/证据）；不得 `NO-OP`。
3. `improve-previous` 的 `partial/missed/unverified` 必须结转本轮或写 `RISK-*` + 复查日期，不得静默丢失。
4. 报告用 `ai-team-workflow/templates/IMPROVEMENT-REPORT.md`，含“历史指标与成长曲线”“上一轮达成”“负成长原因与优化策略”“本轮任务”。

## 4. 决策分级（分析阶段）

报告写到项目 `.ai-team/team/TEAM-IMPROVEMENT-YYYY-MM-DD.md`（无 `.ai-team/` 写项目根并标“未初始化”）。

| 结论 | 条件 | 动作 |
|---|---|---|
| `NO-OP` | 无反复缺口，文档一致 | 记录“本轮不优化”+ 复查触发点 |
| `DOCS-ONLY` | 只文档/计数/版本/命令不一致 | 授权后只改文档与 manifest |
| `PATCH` | 单修 ≤2 文件，一轮 ≤10 个改动 | 授权后实施 |
| `FEATURE` | 需新脚本/命令/工作流 | 授权后设计 + 审查 + QA + 安全 |
| `ROLE-GAP` | 同缺口 ≥2 项目/任务且 ≥3 次，现有角色无法覆盖 | 先提案，单独批准 |
| `DEFER` | 证据不足或环境阻塞 | 写 `RISK-*` + 复查日期 |

硬规则：每轮最多推进 **10 个改动**，优先 1–2 个系统性瓶颈；只有 `TEAM-CORE`（跨项目复用、通用缺陷、≥2 项目或 ≥3 任务）进团队源，单项目特例归 `PROJECT-PROFILE`；`TEAM-CORE` 新增 ≤5 且 ≤ 本轮关闭/合并数（团队 open 连升两轮先清债）；提案含目标/证据/验收/风险/回滚/文档影响/版本/scope/复查；分析阶段不改 GROWTH、团队源、版本或安装；报告写清授权后要改哪些文件、调用哪些角色。

触发与撤回：每 10 个 `done`、每月、版本发布后、P0/P1 事故后、同类问题第 2 次；观察一个完整节奏无改善则标记 `rejected`/`superseded`。反模式见 `docs/IMPROVEMENT.md`。

## 5. 授权门（停）

输出 ≤20 行授权请求：结论+证据摘要、拟改文件/命令/agent/skill、是否新增命令/脚本/角色、版本级别、是否调子智能体、风险与回滚、是否含 commit/push（push 单独批准）。然后停止等“同意修改”。`--analyze-only` 不请求；`--apply` 校验后直接实施。

## 6. 实施（仅授权后）

1. 项目 `GROWTH.md` 增 `P-*`（`proposed` + scope；已实施改 `done` 并写落地版本/任务/证据/日期）；`scope: project` 不计团队 open。
2. 团队源建 `TASK-IMPROVE-*`（本地 `.ai-team/`，完成后归档；保留发布摘要）。
3. `brief-new.mjs` 生成 brief，`brief-lint` 通过再派发。
4. 执行者：`DOCS-ONLY` → build；`PATCH` → build + code-reviewer；涉脚本/权限/安全 → 加 security-auditor；`FEATURE` → engineer + reviewer + security + DevOps；`NO-OP`/`DEFER` 不派。
5. 同步文档：manifest 版本与清单、`verify` 预期、README/INSTALL、WORKFLOW/TEAM/IMPROVEMENT、VERIFICATION/CHANGELOG；新增命令同步 manifest/README/安装说明/一致性审计；`rg` 查旧版本/旧计数并实跑命令示例。
6. 验证：`scripts/verify.mjs`、audit-team-consistency.mjs、audit-git-permissions.mjs、permission-lint.mjs、version.mjs --update，再跑 installed verify 与 version.mjs --check（均用 node 运行）。
7. 提交：团队源由 build 精选提交；项目按自身策略（checkpoint 归 devops）；不用 `git add -A`；push 需批准；安装后提示 `RESTART REQUIRED`。
8. 完成后重跑 `improve-metrics --write` 记录改善后指标，供下一轮验收。

## 7. 汇报（≤20 行）

按模板输出，至少含：目标校准是否一致；五项各 1 行（结论+证据）；成长曲线 + 本轮 vs 上轮 verdict 与 `negativeGrowth`；上一轮 done/partial/missed + 结转；模式；结论分级；GROWTH 债务与会话/工具/权限数字、审计水位；3 条主要发现（带路径）；1–10 条任务（目标/验收/版本级别）；风险与复查点；是否 commit/push。

输出前自检：五项齐全、历史与上一轮已写、`negativeGrowth` 已处置、决策与授权门已给、证据为路径 + 命令 + 退出码。

无 `.ai-team/` 时只输出会话观察与初始化建议，不伪造复盘。
