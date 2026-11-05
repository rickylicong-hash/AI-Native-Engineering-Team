# 验证记录（VERIFICATION）

> 本文记录团队包的结构验证、安装验证、OpenCode 识别验证和一次真实的端到端编排 smoke test。  
> 环境：Windows 11 / PowerShell 5.1 / Node v24.15.0 / OpenCode `0.0.0-dev-202610161232`。

## 1. 结构验证

```powershell
node scripts/verify.mjs
```

结果：

```text
checks: 192, passed: 192, failed: 0, warnings: 0
OK: package is structurally valid.
```

覆盖：

- 10 个 agent：frontmatter、mode、权限结构、manifest、Chief 调度权限、审查者只读；
- 12 个 command：description、agent 引用、body、参数、manifest；
- 4 个 skill：SKILL.md、name/description、引用文件、manifest；
- 12 个 workflow 模板（含 GROWTH）；
- 无绝对路径/stack-specific 泄漏（warning 级）。

## 2. OpenCode 识别验证

```powershell
opencode agent list | Select-String "^ai-team/"
```

结果：

```text
ai-team/chief (primary)
ai-team/code-reviewer (subagent)
ai-team/devops-engineer (subagent)
ai-team/engineer (subagent)
ai-team/product-manager (subagent)
ai-team/qa-engineer (subagent)
ai-team/security-auditor (subagent)
ai-team/system-architect (subagent)
ai-team/technical-writer (subagent)
ai-team/ux-designer (subagent)
```

说明 OpenCode 真正解析了 YAML frontmatter 与目录 ID，而不仅是文件存在。

命令也被解析：

```powershell
opencode debug config | Select-String '"ai-status"'
# 输出包含 "ai-status": { ... }
```

命令到 agent 的映射也实际验证过：

```powershell
opencode run --command ai-status --dir <temp-project>
# 输出首行：> ai-team/chief · kimi-k2.7-code
# 随后因 CLI 无 provider credential 失败（见 §5），但 command -> agent 解析正确。
```

## 3. 安装验证

Dry-run：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -DryRun
```

结果：列出 10 个 agent、12 个 command、4 个 skill，未改文件。

实际安装：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

结果：

```text
Installed: 10 agents, 12 commands, 4 skills.
```

同时写入 `ai-team-install.json`（版本、安装时间、源/目标路径、`sourceHash`、`installedHash`、`manifestHash`、数量）。干净安装时 `sourceHash === installedHash`。

安装后验证：

```powershell
node scripts/verify.mjs --root ~/.config/opencode --installed --opencode
```

结果：

```text
checks: 189, passed: 189, failed: 0, warnings: 0
OK: package is structurally valid.
```

其中 10 条是 `opencode lists ai-team/*` 全部 PASS。

## 4. 端到端编排 smoke test

### 4.1 第一次：暴露深度限制（失败，但证据纪律正确）

测试方式：把 Chief 的临时副本设为 `mode: all`，由父会话作为 subagent 启动（depth 1），要求它初始化 `.ai-team/`、判 T0、调度 `ai-team/technical-writer`。

结果：

```json
{"error":{"type":"tool.execution","message":"Subagent depth limit reached (1). Increase \"experimental.subagent_depth\" to allow nested subagents."},"content":[]}
```

Chief 的行为：

- 正确判 T0，未升级流程；
- 初始化 `PROJECT/STATUS/TASKS/RUN_LOG`；
- 调度重试 2 次，错误逐字一致；
- **拒绝代写 technical-writer 的报告**，明确写 `BLOCKED`；
- 写 `team/GROWTH.md` 提案，引用原始错误与配置证据；
- 未修改任何源码/文档。

这验证了“没有证据就没有完成”和“审查者/专家独立”的纪律。

### 4.2 第二次：提高深度后通过

在 `opencode.jsonc` 增加：

```jsonc
{
  "experimental": {
    "subagent_depth": 3
  }
}
```

重跑同一 smoke test。结果：**PASS**。

Chief 产出：

| 文件 | 内容 |
|---|---|
| `.ai-team/state/PROJECT.md` | 目标、Track、范围、指标、假设、风险 |
| `.ai-team/state/STATUS.md` | G0 + T0 门禁结论 |
| `.ai-team/state/TASKS.md` | TASK-0001/0002 验收 |
| `.ai-team/state/RUN_LOG.md` | 时间线与命令 |
| `.ai-team/state/HANDOFF.md` | 交接 |
| `.ai-team/docs/SPIKE-0001.md` | technical-writer 产出（192 行，含文件:行号证据） |

Subagent verdict：恰好调度 1 个 `ai-team/technical-writer`，完成；报告结论 Partial。

报告原文保留在 [`examples/smoke/SPIKE-0001.md`](../examples/smoke/SPIKE-0001.md)（历史产物，行号对应测试时版本）。

### 4.3 专家报告发现并推动了真实修复

technical-writer 的报告指出 5 个真实问题，均已修复：

| # | 问题 | 修复 |
|---|---|---|
| 1 | 临时 `chief-smoke.md` 未登记 manifest，导致 `verify.mjs` exit 1 | 删除临时文件；验证恢复 174/174 |
| 2 | PowerShell 不展开 `~`，`--root ~/.config/opencode` 解析错误 | `verify.mjs` / `merge-default.mjs` 自行展开 `~`；文档补 PowerShell 写法 |
| 3 | README 验证章节缺期望输出/退出码 | 补 174/184 期望、exit code 含义、`--opencode` 说明 |
| 4 | Windows 安装命令硬编码 `D:\Documents\AI Native` | 改为 `<path-to-this-repo>`，补“获取仓库”前置 |
| 5 | INSTALL 安装后没有“下一步 /ai” | 补 callout；补备份命名、嵌套深度说明 |

修复后再次验证：

```text
checks: 174, passed: 174, failed: 0
OK: package is structurally valid.
```

## 5. 版本管理验证

### 5.1 旧安装识别

全局安装加入版本标记前：

```text
source:      1.1.0        D:\Documents\AI Native
installed:   (none)       C:\Users\36906\.config\opencode
status:      legacy
```

`legacy` 表示有团队文件但没有 `ai-team-install.json`；`--update` 会补装并写标记。

### 5.2 更新到 1.1.0

```powershell
node scripts/version.mjs --update
```

结果：

```text
源验证 179/179 → 安装 10 agents / 12 commands / 4 skills
→ 安装后验证 189/189（含 OpenCode 10 个 agent）
→ 写 marker
→ status: up-to-date
```

全局 marker：

```json
{
  "version": "1.1.0",
  "agents": 10,
  "commands": 11,
  "skills": 4,
  "sourceHash": "sha256:...",
  "installedHash": "sha256:..."
}
```

`sourceHash === installedHash` 表示安装完整。

### 5.3 漂移检测与修复

在临时安装副本中手改一个 agent 文件：

```text
status: drift
installedHash: sha256:...（与 sourceHash 不同）
```

```powershell
node scripts/version.mjs --target <temp> --check   # exit 1
node scripts/version.mjs --target <temp> --update  # 重新发布
# 结果：status up-to-date，installedHash 恢复为 sourceHash
```

### 5.4 检查退出码

```text
up-to-date   → 0
drift/update → 1
not-installed→ 2
unknown      → 3
```

### 5.5 复盘检查（1.2.4）

```powershell
node .opencode\skills\ai-team-workflow\scripts\retro-check.mjs --project D:\Development\riccon-ai
```

结果（补录前）：

```text
track:    T4   stage: G4
tasks:    done 29, last retro 0, next due 10
growth:   missing
due:      YES (first-10)
warning:  PROJECT.md stage (G1) 与 STATUS.md stage (G4) 不一致；以 STATUS.md 为准
```

补录 `team/GROWTH.md` 后：

```text
tasks:    done 29, last retro 29, next due 39
due:      no
```

说明：脚本能从 `TASKS.md` 统计 `done`（含 `done（待确认）`）、与 GROWTH frontmatter 比较、识别 G5/G7/G8 门禁，并提示状态漂移。

### 5.6 Checkpoint 检查（1.2.5）

riccon-ai 当前 HEAD `ebb16df`（234 文件，`git add -A` 提交）：

```text
branch:   master @ ebb16df
stage:    G4
tasks:    done 29, last checkpoint 0 (never)
changed:  3 files (modified 0, untracked 3)
due:      YES (head-noncompliant)
warning:  HEAD ebb16df contains 16 forbidden path(s) (raw logs, secrets, build output); --mark will refuse it
```

`--mark` 在 HEAD 含原始日志/密钥/构建产物时返回 3，不写入 `CHECKPOINT.json`。fixture 覆盖 13 个场景：未提交文件阈值、G5 门禁、`--handoff`、脏工作区、坏 HEAD、干净 HEAD 标记。

### 5.7 一致性审计（1.2.5）

```text
node scripts/verify.mjs                  → 192/192
node scripts/verify.mjs --installed      → 184/184 (skill scripts syntax + templates)
node scripts/audit-git-permissions.mjs   → 10 agents, 0 failed
node scripts/audit-team-consistency.mjs  → 82 checks, 0 failed
```

一致性审计发现的真实缺口：

- Chief 的 prompt 让跑 `retro-check`，但 shell 只允许 `node -v`；
- QA 的 prompt 写“不 commit”，权限却是 `git commit ask`；
- 文档说项目外目录不授权，但所有 agent 都没有 `external_directory` 规则；
- `checkpoint-check` 尚未接入命令，riccon-ai 的 `TASK-GIT-006` 用 `git add -A` 提交了 16 个原始测试日志。

### 5.8 GROWTH 复盘落地（1.2.6）

Riccon-ai `GROWTH.md` 的 P-01/P-02/P-04/P-05/P-06 已转为团队能力：

```text
P-01 → REVIEW.md P1 closure 表 + reviewer 检查 + G5 门禁
P-02 → state-check.mjs；/ai、/ai-resume、/ai-status、/ai-handoff 接入
P-03 → 1.2.5 已实现 checkpoint-check + TASK-GIT-*；项目仍需清理历史日志
P-04 → TEST-REPORT.md 唯一基线 + QA prompt + G4/G5 门禁
P-05 → brief 契约影响字段 + REVIEW.md 契约对照 + reviewer 契约 diff 检查
P-06 → templates/AI-TEAM-GITIGNORE
```

`state-check` 对 riccon-ai 的结果（修正 `PROJECT.md` stage 后）：

```text
errors:   0
warnings: 1
  WARN   7 task(s) use non-standard done(...) status
result:   PASS
```

## 6. 未执行项

- 未用 CLI 执行顶层 `/ai` 交互：CLI 环境没有 provider credential（`0 credentials`），无法发起模型请求；团队 agent 的调用路径已通过 subagent 编排验证。
- 未执行真实生产部署（无目标环境；且生产发布按设计需要用户批准）。

## 7. 复现

```powershell
# 1. 结构
node scripts/verify.mjs

# 2. 安装
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1

# 3. 安装后 + OpenCode
node scripts/verify.mjs --root ~/.config/opencode --installed --opencode

# 4. 版本检查 / 更新
node scripts/version.mjs
node scripts/version.mjs --check
node scripts/version.mjs --update

# 5. 真实使用
# 在任意项目： /ai 做一个最小的 hello world API，带测试和 Dockerfile
```

## 8. 结论

- 结构、安装、OpenCode 识别：通过。
- 版本管理：通过（旧安装识别 → 更新到 1.1.0 → 写 marker → 漂移检测 → `--update` 修复 → `--check` exit 0）；1.2.6 已再次验证 `sourceHash === installedHash`。
- 复盘节奏：通过（riccon-ai 29 个 `done` 到期 → 补录 `RETRO-0001` → 下次 39 或 G5 前；脚本可重复检查）。
- 一致性审计：通过（82 项；修掉 Chief 脚本权限、QA 提交矛盾、external_directory 缺失、checkpoint 未接线）。
- 成长提案落地：通过（P-01/P-02/P-04/P-05/P-06 已转为模板/脚本/门禁；P-03 待项目执行清理）。
- 真实编排：通过（T0 + 单专家 + 证据 + 拒绝伪造）。
- 文档闭环：经专家评审发现并修复 5 个问题后通过。
- 已知平台限制：嵌套编排需 `experimental.subagent_depth ≥ 2`；正常顶层使用不需要。
