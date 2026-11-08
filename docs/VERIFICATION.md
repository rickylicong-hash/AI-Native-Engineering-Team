# 验证记录（VERIFICATION）

> 本文记录团队包的结构验证、安装验证、OpenCode 识别验证和一次真实的端到端编排 smoke test。
>
> 环境：Windows 11 / PowerShell 5.1 / Node v24.15.0 / OpenCode `0.0.0-dev-202610161232`。
>
> 当前版本：**1.9.3**。§1–§3 为 1.9.3 实测；§4 为历史 smoke test；§5 为各版本历史记录，计数对应当时版本。

## 1. 结构验证

```powershell
node scripts/verify.mjs
```

结果：

```text
checks: 206, passed: 206, failed: 0, warnings: 0
OK: package is structurally valid.
```

覆盖：

- 10 个 agent：frontmatter、mode、权限结构（仅 shell 破坏性 deny）、manifest、角色边界（流程约定）；
- 13 个 command：description、agent 引用、body、参数、manifest；
- 4 个 skill：SKILL.md、name/description、引用文件、manifest；
- 12 个 workflow 模板（含 GROWTH）+ 4 个项目 profile 示例（README/Java/Spring/Vue/严格安全）；
- 流程脚本：brief 生成/校验、secret 扫描、checkpoint 同步、review 门禁、持续优化扫描的语法与接线检查；
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

结果：列出 10 个 agent、13 个 command、4 个 skill，未改文件。

实际安装：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

结果：

```text
Installed: 10 agents, 13 commands, 4 skills.
```

同时写入 `ai-team-install.json`（版本、安装时间、源/目标路径、`sourceHash`、`installedHash`、`manifestHash`、数量）。干净安装时 `sourceHash === installedHash`。

安装后验证：

```powershell
node scripts/verify.mjs --root ~/.config/opencode --installed --opencode
```

结果：

```text
checks: 206, passed: 206, failed: 0, warnings: 0
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

### 5.9 `/ai-resume` 权限噪声（1.2.7；1.4.2 由 Shell-first 取代）

riccon-ai 新会话选择 Chief 执行 `/ai-resume` 时出现：

```text
git status --short 2>&1; echo ...          Permission denied
git -C D:\Development\riccon-ai status --short  Permission denied
Get-Content .ai-team\state\RUN_LOG.md -Tail 40   Permission denied
mvn -v                                      Permission denied
Get-ChildItem C:\Users\...\.config\opencode ...  Permission denied
```

原因与修复：

- `;`/`2>&1` 把命令拆段，`echo` 不在白名单 → 增加 `echo *`，并要求一次一条命令；
- `git -C` 不匹配 `git status *` → 增加 `git -C * status/diff/log *`；
- `Get-Content` 未授权 → 增加 `.ai-team/state|tasks|team` 的读取，其他文件用 `read`；
- `mvn -v` 未授权 → 增加 `mvn -v *`（Chief/Architect/Security）；
- `~/.config/opencode` 扫描触发 external_directory → 提示不要扫描，直接使用已知脚本路径。

### 5.10 DevOps 写证据权限（1.2.8）

DevOps 执行 `TASK-GIT-011` 时被拒：

```text
Write to .ai-team/work/TASK-GIT-011-EVIDENCE.md   Permission denied: edit
```

原因：DevOps 的 edit allowlist 只有 `.ai-team/release/*`，没有 `.ai-team/work/*`，但 checkpoint 流程要求写 `work/TASK-GIT-*-EVIDENCE.md`。修复：

- 增加 `edit .ai-team/work/*EVIDENCE.md -> allow`；
- DevOps/QA/Writer prompt 明确禁止用 shell 重定向/`Set-Content`/here-string 绕过 edit 权限，被拒时返回 BLOCKED；
- `audit-team-consistency` 增加检查（87 项）；
- `GIT-POLICY` 记录 shell 写绕过为残余风险；
- `install.ps1` 改为“备份复制 + 文件级同步”，不再移动 `agents/ai-team` 目录；修复 OpenCode 运行中 `publish` 报 `MoveDirectoryItemIOError` 的问题。

### 5.11 审查员独立验证权限（1.2.9）

`RISK-0040`：`code-reviewer`/`security-auditor` 的 `mvn`/`git` 被 `permission.rejected`，只能依赖工程师自报。

修复：

- 两个审查员增加只读验证 allowlist：`git -C` 只读、Maven test/verify/package、Maven Wrapper、Gradle、npm/pnpm/yarn test、pytest、go test、cargo test、dotnet test；
- Security 额外获得 `dependency-check`/CycloneDX/`dependency:tree`/`versions`/`dependency:analyze`；
- prompt 要求自己运行并记录命令/退出码/输出，不能只引用工程师证据；被拒时 BLOCKED，禁止 shell 绕过；
- `audit-team-consistency` 增加 4 项审查员能力检查（91 项）；
- 1.2.10 修正 Maven 插件目标匹配：`mvn *dependency-check*` 等模式可匹配 `mvn org.owasp:dependency-check-maven:check`、SpotBugs/PMD/Checkstyle/CycloneDX 等全限定 goal；
- 1.2.11 补齐工具链/输出检查：`java -version`、`mvn -v`、`mvn *compile*`、`Get-ChildItem`、`Test-Path`、`Get-Command`、`Select-Object`、`Write-Output`；审计增至 95 项；
- 1.2.12 根据 `REV-0010` 修正行为误区：`mvn -v` 被拒不等于 `mvn test` 被拒；补充 `Select-String`/`rg`/`Test-Path`，要求先试实际 test/verify/package 再报 BLOCKED；审计 96 项。

### 5.12 全成员权限审计（1.2.13）

发现并修复：

- Engineer 因保留源码宽 `edit` 权限，可越权编辑 docs/README/CHANGELOG/deploy/ops/.github/.ai-team/tasks/qa/e2e 等；已加显式 deny；
- 10 个 agent 都可编辑 `AGENTS.md`/`CLAUDE.md`/`opencode.json*`；已全部 deny；
- QA 可 `git add/rm/mv/stage`；已 deny；
- Writer 可编辑 `docs/adr/*`；已 deny，ADR 归 Architect；
- Engineer/QA/Writer 可 `npm publish`/`docker push`/`kubectl apply`/`helm upgrade`/`terraform apply`（ask）；已改为 deny，仅 DevOps 保留 ask；
- Chief 缺少 V1 `task` 权限；已补 deny/allow；
- Security 删除重复 `npm ls`/`pnpm list`，补充 `Select-Object`/`Out-String`。

审计 117 项，0 失败（1.2.14 增加“重复规则”永久检查）。

### 5.13 GROWTH RETRO-0002/0003 落地（1.2.15）

- P-07 装配清单进入 brief/G3/G4；
- P-08 同模块未审切片 ≤2；
- P-09 新实现任务前强制 `checkpoint-check`；
- P-10 任务回报带 `TASKS.md` 建议更新；
- P-12 `HANDOFF` 增加 `Baseline`；`state-check` 允许 baseline 后的纯文档提交，代码提交仍报 error；
- P-13 凭据/迁移/传输/租户边界设计先过 `SEC-*`；
- P-14 契约与实现同一提交；
- P-11 `state-check` 列出全部 legacy `done（...）`。

riccon-ai 当前 `state-check`：

```text
errors: 0
warnings: 0
result: PASS
```

fixture：baseline 后纯文档提交 PASS；baseline 后代码提交 FAIL。

### 5.14 证据/产物与 flake 治理（1.2.16）

- P-15：新增 `artifact-check.mjs`，检查根目录 `*.log`、`target-*`、`*.tmp`、`*.class`、`io/org/com` 误落盘目录；`state-check`/`checkpoint-check` 已接线，artifact error 会让 checkpoint 到期并阻止 `--mark`；
- 证据日志统一放 `logs/<date>/` 或 `.ai-team/work/<TASK>-logs/`；UTF-16 证据产生 warning，`--strict` 失败；失败日志用 `.failed.log`；
- P-16：QA 报告新增 `Flaky/skipped`；非确定性失败必须有 `RISK-*`/`DEF-*`、owner、关闭条件，重跑通过不能单独关闭 P1/安全项；
- P-17：brief 新增 `独立验证`/`证据位置`；reviewer 默认执行测试/扫描，无 shell 必须 `RISK-*` + 补偿证据；`REVIEW.md` 新增“实际执行/未能执行/证据可读性”；
- 安全审计新增“不可读证据不能作为关闭 Critical/High 的唯一依据”。

验证：

```text
node scripts/verify.mjs                 -> 193/193
node scripts/verify.mjs --root "$HOME\.config\opencode" --installed -> 185/185
node scripts/verify.mjs --root "$HOME\.config\opencode" --installed --opencode -> 195/195
node scripts/audit-team-consistency.mjs -> 135 checks, 0 failed
node scripts/audit-git-permissions.mjs  -> 10 agents, 0 failed
artifact-check fixture                   -> root log/stray class FAIL; archived TASK-* PASS; UTF-16 warning + strict FAIL
state-check fixture                      -> root log ERROR
checkpoint-check fixture                 -> root log due + --mark blocked
```

riccon-ai 的 `artifact-check` 当前为 0 error；历史 70+ 个 UTF-16 `.txt` 证据只产生 warning，不强制改写旧证据；新日志必须 UTF-8。

### 5.15 Checkpoint 收口（1.2.17）

- `checkpoint-check --mark` 输出 `NEXT`：
  - `HANDOFF Git/Baseline = <commit>`
  - `STATUS Checkpoint = <commit> (done N)`
  - 提交纯文档同步后运行 `state-check`
- `state-check` 读取 `CHECKPOINT.json`，与 `HANDOFF` baseline、`STATUS` checkpoint 对比：
  - baseline 落后时 error，并给出建议 SHA；
  - STATUS 的 SHA/done 不一致时 warning。
- `TASK-GIT-*` 证据必须包含 `state-check` PASS；否则 checkpoint 不算完成。

验证：

```text
state-check fixture:
  baseline aligned                 -> PASS
  CHECKPOINT.json ahead of HANDOFF -> FAIL + suggested SHA
  after HANDOFF/STATUS sync        -> PASS (doc-only commit)

checkpoint-check --mark fixture:
  NEXT:
    - HANDOFF Git/Baseline = <commit>
    - STATUS Checkpoint = <commit> (done N)
    - commit the doc-only sync, then run state-check

audit-team-consistency: 138 checks, 0 failed
```

### 5.16 UTF-16 证据硬约束（1.2.18）

- `logs/**` 的 UTF-16 `.log`/`.txt` 从 warning 改为 **error**；`.ai-team/work/**` 历史证据仍为 warning；
- 新增 `artifact-check --fix`（只转 `logs/**`）和 `--fix-all`（含 `.ai-team/work/**`），转换 UTF-16LE/BE 为 UTF-8；
- `code-reviewer` 增加 `Cannot read binary file` 处理规则：标“不可读/未验证”，要求 UTF-8 副本/摘要，不能关闭 P1/安全项；
- riccon-ai 已将 `logs/2026-11-05/` 下 25 个日志转为 UTF-8，包含全部 8 个 TASK-0039 日志；`artifact-check` 从 25 error / 55 warning 变为 0 error / 55 历史 warning。

验证：

```text
fixture:
  logs/** UTF-16              -> error
  --fix                       -> converted, errors 0
  .ai-team/work UTF-16        -> warning
  --fix-all                   -> converted, warnings 0

source verify:                193/193
installed verify:             185/185
installed + OpenCode:         195/195
audit-team-consistency:       140 checks, 0 failed
audit-git-permissions:        10 agents, 0 failed
```

### 5.17 QA Java/Maven E2E 路径（1.2.19）

- QA 增加 `**/src/test/java/**/e2e/**`、`**/src/test/java/**/qa/**`、`**/src/test/resources/**/e2e/**`、`**/src/test/resources/**/qa/**` 的 `edit` allow；仍不放开整个 `src/test`。
- `team-manifest.json` 的 QA `owns` 同步增加上述路径。
- Chief brief 增加 `测试路径` 字段和派发前校验：owner=QA 时路径必须 QA-owned 且在构建 test source root。
- QA 规则新增：E2E 必须能从干净 checkout 用标准构建命令执行；禁止手工 `javac`、复制 class 到 `target/test-classes`、临时 classpath 作为最终证据；权限被拒时回报 BLOCKED，不探测替代路径、不覆盖 evidence。
- riccon-ai TASK-0035：测试从 `tests/e2e/M1HappyPathE2ETest.java` 移到 `server/src/test/java/io/riccon/e2e/M1HappyPathE2ETest.java`，删除 `tests/e2e/test-classpath.txt`、`tests/e2e/target/`、`tests/qa-probe.txt`。

验证：

```text
mvn -B -o -pl server -DskipTests compile                 -> BUILD SUCCESS
mvn -B -o -pl server -Dtest=M1HappyPathE2ETest test     -> 5/5, BUILD SUCCESS (38.642 s)
日志: logs/2026-11-05/TASK-0035-e2e-standard-20261105-2322.log（UTF-8）

source verify:             193/193
installed verify:          185/185
installed + OpenCode:      195/195
audit-team-consistency:    144 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
```

### 5.18 团队全量审计与成长处置（1.3.0）

- 全量审计覆盖 10 个角色、12 个命令、4 个技能、全部模板/脚本/文档；结论是“需要流程硬化，不需要新增角色”。
- **T-20 构建互斥**：同一工作区只允许一个会写 `target/`/`build/`/`coverage/` 的构建；并行任务只读或独立 worktree；brief 增加 `构建隔离`。
- **T-21 独立验证**：reviewer/security 的 `独立验证` 必须是可执行命令；禁止默认“无 shell”，无 shell 需 `RISK-*` + Chief 批准，不能关闭 P1/安全项。
- **T-22 DEF 生命周期**：新增 `templates/DEFECTS.md`；owner 只能置 `fixed`，QA 独立回归后置 `verified/closed`；G5 检查。
- **T-23 状态自检**：`state-check` 检测重复 TASK-ID；每批 `state/**` 编辑后运行，交接前 0 error/0 重复。
- **T-24 P2 债**：有实际风险的 P2 必须有 `TASK-*`/`RISK-*`/书面接受，否则不能“修改后通过”。
- **T-25 权限/审计加固**：Engineer 显式 deny QA-owned Java E2E；DevOps 只写 `TASK-GIT-*EVIDENCE.md`；一致性审计增加对应检查。
- **T-26 成长处置**：`GROWTH.md` 增加“提案处置索引”（唯一状态源）；`growth-check.mjs` 校验状态/落地/证据/日期；`--archive --yes` 将全部处置且非最近一轮的 RETRO 移入 `team/archive/`。
- **T-27 审查/证据收口**：第 3 轮仍不通过由 Chief 裁决；R 轮同批更新证据；安全语义改动要求 fail-open 反例；大切片用 `--max-files` 提前 checkpoint。
- riccon-ai 回填 22 条提案（P-01..P-22）为 `done`；`RETRO-0001..0004` 已归档到 `.ai-team/team/archive/GROWTH-2026.md`，主文件只保留索引 + `RETRO-0005`；`growth-check --strict` PASS。
- `state-check` 重复 TASK-ID fixture 正确报错并 exit 1。

验证：

```text
source verify:             194/194
installed verify:          186/186
installed + OpenCode:      196/196
audit-team-consistency:    168 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
growth-check (riccon-ai):  22 proposals, done 22, open 0, strict PASS
version:                   1.3.0, sourceHash === installedHash
```

### 5.19 会话审计与执行层硬化（1.3.1）

- **T-30 brief 预检**：新增 `brief-lint.mjs`；所有角色 brief 必须有技能、目标、所有权、验收、必须执行、证据位置/要求、禁止项、回报格式、构建隔离；Reviewer/Security 加 `独立验证`/`P2 处置`，QA 加 `测试路径`。
- **T-31 shell 单命令（1.4.2 起由 T-36 取代；1.5.0 全部移除）**：1.3.1 曾拒绝 `;`、`&&`、`||`、`2>&1`；1.5.0 只保留破坏性命令 deny。
- **T-32 审查报告门禁**：新增 `review-check.mjs`；报告必须有 `## 独立验证`、实际命令和退出码；只有 RISK 的报告不能关闭 P1/安全项。
- **T-33 审计水位**：新增 `audit-state.mjs` 与 `.ai-team/team/AUDIT.json`；riccon-ai 首次全量审计记录 152 个会话，下次从 `last_audited_*` 之后开始。
- **审计结论**：riccon-ai 152 个会话、149 个子代理；0 嵌套子代理、0 完成态越权编辑；但独立验证 0/38、同工作区 Maven 重叠 224 对、权限拒绝 131 次（81 次复合 shell）、engineer 成功 `git add -A` 2 次。报告见 `.ai-team/team/TEAM-USAGE-AUDIT-2026-11-06.md`。

验证：

```text
source verify:             197/197
installed verify:          189/189
installed + OpenCode:      199/199
audit-team-consistency:    230 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
brief-lint fixture:        QA pass; reviewer missing independent/p2 fail
review-check fixture:      strict command + exit pass
audit-state:               riccon-ai 152 sessions, watermark written
```

### 5.20 ai-resume 权限修复（1.3.2）

- 新会话 Chief 执行 `/ai-resume` 时 `growth-check.mjs` 连续 3 次 `permission.rejected`；原因不是脚本错误，而是 1.3.1 新增脚本没有加入 Chief 的 shell allowlist。
- Chief 增加 `growth-check`、`brief-lint`、`review-check`、`audit-state` 的 `node *...mjs*` allow；Reviewer/Security 增加 `review-check`；DevOps 增加 `growth-check`。
- Chief 增加绝对路径 `Get-Content */.ai-team/{state,tasks,team}/*` allow；文件读取仍优先 `read`。
- 新增一致性检查：Chief 必须能运行四个新脚本、Reviewer/Security 必须能运行 `review-check`、DevOps 必须能运行 `growth-check`。
- 新会话的 `Get-Content D:\...\RUN_LOG.md` 被拒属于预期边界；Chief 随后用 `grep`/`read` 完成，未影响状态。

验证：

```text
source verify:             197/197
installed verify:          189/189
installed + OpenCode:      199/199
audit-team-consistency:    237 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
```

### 5.21 权限矩阵与预检（1.3.3）

- 新增 `permissions.json`：10 个角色的 required/forbidden 单一事实源，共 191 项角色/权限检查。
- 新增 `permission-lint.mjs`：校验 required 为 `allow`/`ask`、forbidden 不为 `allow`；`--role` 支持启动预检。
- 新增 `permission-doctor.mjs`：给定角色和命令，输出匹配规则、最终效果和最小修复建议；复合 shell 直接提示拆分。
- `/ai` 与 `/ai-resume` 启动前运行 `permission-lint --role ai-team/chief`；失败时用 doctor 定位，不继续带病恢复。
- `audit-team-consistency` 增加矩阵覆盖、脚本存在、Chief 可运行 lint/doctor 的检查。
- 本次修复的根因：1.3.1 新增脚本后只改了 skill/command，没有同步修改 Chief 的 shell allow；矩阵预检会在启动时直接发现这类接线缺口。

验证：

```text
permission-lint:           191 checks, 0 failed
permission-lint --role chief: 29 checks, 0 failed
permission-doctor:         growth-check -> allow；compound shell -> deny + split advice
source verify:             200/200
installed verify:          192/192
installed + OpenCode:      202/202
audit-team-consistency:    243 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
```

### 5.22 统一命令网关（1.4.0）

- 新增 `team-shell.mjs`：角色 + 动作 → 参数数组，不经过 shell；覆盖 `git.status/diff/log/show/rev-parse`、`build.compile/test/clean-test/package/verify`、`scan.dependency/secrets/sast`、`script.state-check/retro-check/checkpoint-check/artifact-check/growth-check/audit-state/permission-lint`。
- `permissions.json` 增加每个角色的 `gateway` 动作列表；`permission-lint` 校验矩阵 + 每角色 gateway allow，共 211 项（Chief 31 项）。
- 所有 10 个角色增加 `node *team-shell.mjs --role <role> *` allow；角色不能调用其他角色的 gateway。
- `/ai`、`/ai-resume` 的权限预检与 growth 预检改用 `script.permission-lint` / `script.growth-check`。
- 网关写入 `.ai-team/work/team-shell-logs/TEAM-SHELL.log`；写操作/commit/push 仍走角色直接权限（ask）。

验证：

```text
permission-lint:           211 checks, 0 failed
permission-lint --role chief: 31 checks, 0 failed
team-shell actual:         riccon-ai build.compile -> BUILD SUCCESS, exit 0, 8.0s
team-shell dry-run:        QA build.test -> mvn.cmd -B -pl server -am test -Dtest=M1HappyPathE2ETest
team-shell deny:           Chief build.test -> action not allowed for chief
source verify:             201/201
installed verify:          193/193
installed + OpenCode:      203/203
audit-team-consistency:    264 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
```

### 5.23 P-23 网关日志路径（1.4.1）

- 确认 P-23 是缺陷：`team-shell` 把原始日志写到 `.ai-team/work/TEAM-SHELL.log`，触发 `artifact-check` 的 `raw-log-location`，导致 T4 `--strict` 失败。
- `team-shell` 日志改为 `.ai-team/work/team-shell-logs/TEAM-SHELL.log`；目录在首次调用时创建。
- riccon-ai 已迁移旧日志，并转换残留的 `TASK-0023-logs/01-install-arco.log`（UTF-16 → UTF-8）。
- 结果：`artifact-check --strict` → **0 error / 0 warning**；`RISK-0062` 可关闭；GROWTH P-23 标记 `done@1.4.1`。
- 注意先安装 1.4.1 再移动旧日志；否则旧版本 gateway 会重新创建 `.ai-team/work/TEAM-SHELL.log`。

验证：

```text
artifact-check --fix-all:  fixed 1 UTF-16 file
artifact-check --strict:   0 error / 0 warning
team-shell log:            .ai-team/work/team-shell-logs/TEAM-SHELL.log
source verify:             201/201
installed verify:          193/193
installed + OpenCode:      203/203
audit-team-consistency:    264 checks, 0 failed
```

### 5.24 Shell-first 权限（1.4.2，历史）

> 1.5.0 已由 §5.25 的 Shell-first strict 取代；以下保留当时边界。

- 10 个角色 shell 默认改为 `allow`；移除 `;`/`&&`/`||`/`2>&1` 复合命令 deny。
- 最近 riccon-ai 会话统计：125 次 shell 拒绝中 60 次为复合命令、26 次为 `Get-ChildItem`；两类在 1.4.2 后不再被拒。
- 保留安全边界：`git reset --hard`、`git clean`、force push/mirror、history rewrite、`rm -rf`、`Remove-Item -Recurse`、`docker system prune`、`terraform destroy`、`kubectl delete`。
- 保留发布/部署边界：Engineer/QA/Writer/只读角色 `deny`，DevOps `ask`。
- 只读角色（Chief/PM/UX/Architect/Reviewer/Security）通过 shell 也不能 `git add`/`commit`/`push`/`tag`；`git add -A`/`git add .` 仍 deny。
- shell 侧新增常见 `.env`/`.ssh`/`.aws` 读取拦截；仍声明这不替代 OS ACL。
- `permission-lint` 增加默认 allow、安全 deny、只读 git guard、bulk-add、Shell-first 指南检查，共 398 项。
- `permission-doctor` 区分复合命令、只读角色、破坏性命令和密钥读取。

验证：

```text
permission-lint:           398 checks, 0 failed
permission-lint --role chief: 52 checks, 0 failed
doctor allow:              engineer compound/npm; reviewer Get-ChildItem; chief compound git
doctor deny:               engineer env/reset/clean/force-push/add -A/Remove-Item/publish
doctor ask:                devops publish/terraform apply; engineer/Writer git push
source verify:             201/201
installed verify:          193/193
installed + OpenCode:      203/203
audit-team-consistency:    250 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
```

### 5.25 Shell-first strict（1.5.0）

- 10 个角色统一为：`shell * -> allow` + 41 条破坏性 `deny`，`ask = 0`。
- 移除：只读角色 Git 边界、`git add -A` 保护、发布/部署边界、`.env`/`.ssh`/`.aws` shell 读取拦截、remote/restore/worktree 等 `ask`。
- 保留：reset/clean/restore/checkout 丢弃、force push/mirror/delete、history rewrite、删除分支/tag/stash/worktree、`rm -rf`/`Remove-Item -Recurse`、prune/destroy/delete。
- `permission-lint` 检查默认 allow、41 条破坏性 deny、非破坏性 allow、Shell-first 指南，共 687 项。
- `audit-git-permissions` 检查每个角色只有 `* allow` + 破坏性命中，无其他 shell 规则。
- `permission-doctor` 只对破坏性命令给出拒绝建议；commit/push/publish/.env 均为 allow。

验证：

```text
permission-lint:           687 checks, 0 failed
permission-lint --role chief: 78 checks, 0 failed
doctor cases:              20/20
source verify:             201/201
installed verify:          193/193
installed + OpenCode:      203/203
audit-team-consistency:    183 checks, 0 failed
audit-git-permissions:     10 agents, 0 failed
```

### 5.26 最小权限配置（1.5.1）

- 每个角色的 `permissions` 统一为 **44 条**：42 条 shell（1 allow + 41 破坏性 deny）+ 2 条 `.env` read allow（覆盖 base ask）。
- 移除所有非 shell 规则：15 条 read、10–61 条 edit、task/subagent/question/external_directory。
- 不再有 agent 级 `read`/`edit`/`task`/`subagent`/`external_directory` 限制；角色边界降为 prompt/流程约定。
- `permission-lint` 仍为 570 项；`audit-git-permissions` 只检查 shell 破坏性规则。
- `audit-team-consistency` 移除依赖 edit/task/external_directory 的检查，剩 158 项。

验证：

```text
role config:               44 rules each (42 shell + 2 read allow)
permission-lint:           570 checks, 0 failed
permission-lint --role chief: 57 checks, 0 failed
doctor cases:              20/20
audit-git-permissions:     10 agents, 0 failed
audit-team-consistency:    158 checks, 0 failed
source verify:             187/187
installed verify:          179/179
installed + OpenCode:      189/189
```

### 5.27 流程自动化（1.6.0）

- **P-24**：新增 `brief-new.mjs` 生成标准 brief 骨架；`brief-lint` 新增必填 `脚本参数`、`契约影响`、`证据位置` UTF-8。
- **P-25**：所有 agent 的 Shell 纪律增加 UTF-8 日志规则；模板和 brief 强制 `证据位置` 含 UTF-8。
- **P-26**：`checkpoint-check --sync-docs` / `--mark --sync-docs` 自动同步 HANDOFF Git/Baseline 与 STATUS Checkpoint。
- **P-27**：新增 `secret-check.mjs`；`artifact-check`、`state-check`、`checkpoint-check --mark`、`review-check` 阻断明文 Cookie/Authorization/口令/token。
- **P-29**：`version.mjs --update` 输出 `RESTART REQUIRED`；`/ai`、`/ai-resume` 增加版本/旧会话检查。

验证：

```text
brief-new + brief-lint:      PASS (QA + reviewer fixtures)
secret-check:                3 findings -> 0 after --fix
riccon-ai secret scan:       360 files, 0 findings
checkpoint --mark --sync-docs: state-check PASS (fixture)
source verify:               189/189
installed verify:            181/181
installed + OpenCode:        191/191
audit-team-consistency:      177 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
permission-lint --role chief: 57 checks, 0 failed
sourceHash === installedHash: af44686d...
```

### 5.28 文档一致性（1.6.1）

- 修正 README/INSTALL/VERIFICATION 的验证计数与过期权限说明。
- 移除 1.4.x/1.5.x 的 `edit`/`subagent`/`task` 权限排障步骤，改为 Shell-first + 流程约定。
- 统一 checkpoint 文档为 `--mark --sync-docs`，证据标准加入 `secret-check`。
- 用 `<path-to-this-repo>` 替换维护者本机路径，补充升级后 `RESTART REQUIRED`。

验证：

```text
source verify:               189/189
installed verify:            181/181
installed + OpenCode:        191/191
audit-team-consistency:      177 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: 433d878e...
```

### 5.29 跨项目持续优化（1.7.0）

- 新增 `/ai-improve <project>`：读取项目 GROWTH/AUDIT/会话，按 `NO-OP / DOCS-ONLY / PATCH / FEATURE / ROLE-GAP / DEFER` 决策；修改团队源前请求批准，完成后同步版本与文档。
- 新增 `improve-scan.mjs`：汇总 GROWTH、TASKS、AUDIT 与 OpenCode 会话/消息/token/工具调用，支持 `node:sqlite` 和旧 `session_v2`/`session_part` schema。
- 新增 `docs/IMPROVEMENT.md`：PDCA/Kaizen、DORA、SRE 复盘、Diátaxis、SemVer 等持续优化策略与反模式。
- `team-manifest.json`、README、INSTALL、WORKFLOW、TEAM、BEST-PRACTICES、verify 计数同步；命令数 12 → 13。
- riccon-ai 实测：31 条提案（3 未处置）、185 个 team 会话；旧库 `session_v2` 可读，`session_part` 已清理时自动标记数据缺口。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: cca06fd0...
```

### 5.30 网关降级（1.8.0）

- `team-shell.mjs` 从“统一命令网关”降级为“可选结构化执行器”；保留参数校验、跨平台构建映射和 `TEAM-SHELL.log`，但明确它不是权限边界。
- `/ai`、`/ai-resume` 的权限预检改为直接运行 `permission-lint.mjs --role chief`，避免“用网关验证网关”的循环依赖。
- 新脚本默认直接可执行；只有需要参数校验/统一日志/跨平台映射时才注册 `permissions.json.gateway`。
- README、SKILL、TEAM、WORKFLOW、QUALITY-GATES、`permissions.json`、`permission-lint`、`audit-team-consistency` 已统一改为可选语义。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: c14718e2...
```

### 5.31 边界/事务门禁与 checkpoint 收口（1.8.1）

- `brief-new.mjs`：engineer 模板新增 `事务边界与部分提交`/`旧行为反证`/`边界四问`；reviewer/QA 模板新增 `边界四问`。
- `brief-lint.mjs`：校验字段值（非空、非 `<...>`、非“不适用/N/A/无”）；事务类 engineer brief 与 reviewer/QA 边界四问为必填。
- `checkpoint-check.mjs`：`--sync-docs` 写 HANDOFF `- 远程：`（origin/upstream/ahead/SHA，剥离 userinfo 与 query/fragment）；`--max-evidence-files` 默认 2000；`--mark --sync-docs` 预检失败零写入、apply 失败回滚 `CHECKPOINT.json`。
- `templates/HANDOFF.md`：新增 `- 远程：` 行。
- 证据：本地审计产物（R1/R2/R3，已归档，不随仓库发布）；审查 `REV-IMPROVE-2026-11-06-R3`、`SEC-IMPROVE-2026-11-06-R3`。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
run-fixtures:                148 PASS / 0 FAIL（连续 2 次 + 并行 2 实例）
sourceHash === installedHash: b6919825...
```

已知遗留：`secret-check` 不扫目标项目 `.ai-team/state/**` 与无 scheme/空白 URL 的窄形态，由历史审计 `TASK-IMPROVE-2026-11-06-SEC-R1` 与 `RISK-TEAM-001/002` 承接（本地已归档）。

### 5.32 state-check 证据扫描上限（1.8.2）

- `state-check.mjs` 新增 `--max-evidence-files`（默认 2000），与 `checkpoint-check.mjs` 对齐；非法值（0/负值/非数字）exit 2。
- 528 证据文件项目：`state-check` 0 warning、`scanned=528, truncated=false`；`--max-evidence-files 5` 触发 truncated；`--json`/`--strict` 语义不变。
- 证据：本地审计产物 R4（已归档，不随仓库发布）；审查 `REV-IMPROVE-2026-11-06-R4`。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: cedf4665...
```

### 5.33 维护者命令路由（1.8.3）

- `/ai-improve` 的 `agent` 从 `ai-team/chief` 改为 `build`：它属于团队仓库维护流程，不是项目交付流程；`/ai`、`/ai-resume` 仍在目标项目中使用 Chief。
- `verify.mjs` 与 `audit-team-consistency.mjs` 允许内置 `build` 作为 command 的外部 agent；其余命令仍必须是 `ai-team/*`。
- README、WORKFLOW、TEAM、SKILL、IMPROVEMENT 明确“build 维护团队，Chief 交付项目”的分工。
- 本仓库本地 `.ai-team/` 审计产物已归档到仓库外并清理；该目录 gitignored，不进入发布包。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: 19caa476...
```

### 5.34 提交归属澄清（1.8.4）

- `/ai-improve` 明确：AI Native 团队源由 `build` 维护者精选提交；目标项目 `.ai-team`/GROWTH 按项目 checkpoint 策略提交（通常 DevOps）；`push` 需用户批准；禁止 `git add -A`。
- README、WORKFLOW、GIT-POLICY 增加“build 维护团队源 / Chief 交付项目 / DevOps 管项目 checkpoint”的边界说明。
- `checkpoint-check` 的到期提示从“Chief must NOT”收紧为“Project Chief/read-only roles must NOT”，避免在团队维护场景误读。
- README/TEAM 的“不自我修改”明确为“团队 agent 不改 `.opencode/**`；由 build 维护者实施批准后的改进”。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: 1d571aae...
```

### 5.35 证据门禁假绿修复（1.8.5）

- **P-43 `improve-scan`**：`session_part` 为空时从 `session_message.data.content` 解析 tool 项；权限拒绝按 `state.error.type="permission.rejected"` 计数；两处都空才报 `no-tool-data`；`toolItems` 去重。riccon-ai 231 会话实测 **25,728 工具 / 445 错误 / 174 权限拒绝**（旧版报 0/0/0）。
- **P-44 `secret-check`**：默认上限 500→2000；截断输出 `PARTIAL (truncated)` 且 exit 3；非法 `--max-files` exit 2；findings 只保留 `kind/file/line/len/sha256`，`--json` 不再打印明文（security P1-01）。
- **P1-02 `artifact-check`**：默认 2000；`secrets.truncated` 追加 error `secret-scan-truncated`；`state-check`/`checkpoint-check` 通过 `checkArtifacts` 继承失败。
- riccon-ai：`artifact-check` 802 evidence / 1,035 secrets / 0 error / 0 warning；`--max-files 500` → `secret-scan-truncated` exit 1；`secret-check` 默认 1,035 / 0 / PASS，500 → PARTIAL exit 3。
- 审查：`REV-IMPROVE-2026-11-07`（R2，修改后通过，P0=0/P1=0）；安全：`SEC-IMPROVE-2026-11-07`（R1，修改后通过，P1-01/P1-02 closed）。
- 已知遗留：`improve-scan` 全局数据源选择（混合 parts 可能低估，`RISK-TEAM-003`）；`secret-check` 静默跳过 UTF-16/二进制/不可读/`.jsonl`/超长行（FU3），行级豁免可能漏报（FU4）；不扫 `.ai-team/state|tasks|reviews|team`。

验证：

```text
source verify:               195/195
installed verify:            197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: 1d45b794...
```

### 5.36 分析授权门（1.8.6）

- `/ai-improve` 默认只分析：读取 GROWTH/AUDIT/会话，写项目侧 `TEAM-IMPROVEMENT-*.md` 后停止，不修改目标项目 GROWTH，不修改 AI Native 源，不调用子智能体。
- `--apply` 才进入实施：读取最新报告并校验项目/团队版本，然后更新 GROWTH 和团队源。
- 实施按风险调用子智能体：`DOCS-ONLY` 仅 build；`PATCH` 加 code-reviewer；脚本/权限/安全加 security-auditor；`FEATURE` 才使用完整团队链。
- 分析阶段不在 AI Native 根目录创建 `.ai-team`；实施阶段才写本地证据，完成后归档/清理。
- README、WORKFLOW、TEAM、SKILL、IMPROVEMENT 已同步“默认分析 / 显式授权 / `--apply` 实施”。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
sourceHash === installedHash: a652d5f8...
```

### 5.37 状态真值与证据门禁（1.8.7）

- **P-39 远程真值**：`checkpoint-check` 的 `remoteLine()` 改用 `git ls-remote --heads origin <branch>` 取远端 SHA，再计算 `ahead`；本地 `origin/*` 过期不再影响结果。远端不可达/远端 SHA 不在本地对象库时回退本地并输出 `local`。
- **P-51 STATUS 行**：`--mark --sync-docs` 同步 `STATUS.md` 的 `Retro`（GROWTH frontmatter）、`Growth`（`growth-check --json`）、`远程`（remoteLine）、`Checkpoint`/`HEAD`；`ai-retro`/`ai-handoff` 要求台账编辑后跑 `state-check`，重复 TASK-ID 不得交接。
- **P-46/P-33 证据门禁**：`brief-new`/`brief-lint` 强制 `证据门禁` 字段（`artifact-check --strict --max-files 2000` + `logs/<date>/` 或 `.ai-team/work/<TASK>-logs/`）；根日志/UTF-16 仍失败。
- **P-49/P-53 运行时与 done gate**：runtime/容器/外部依赖 brief 必须有 `运行时取证`；reviewer/security brief 与 `REVIEW.md` 增加 `Done gate`（P0/P1=0 + P2 有 TASK/RISK/关闭条件，否则保持 review）。

验证：

```text
source verify:               195/195
installed verify:            187/187
installed + OpenCode:        197/197
audit-team-consistency:      183 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
fixtures:                    checkpoint remote/stale-local; brief-lint runtime/done-gate
review:                      REV-IMPROVE-2026-11-07-R2-R1 modified pass (P0=0/P1=0; P2-07/P2-08 -> TASK-IMPROVE-2026-11-07-R3)
sourceHash === installedHash: f85f7995...
```

### 5.38 三层入口与净零（1.9.0）

- **P-54 三层入口**：`ai-retro` 先把提案分类为 `TEAM-CORE` / `PROJECT-PROFILE` / `OBSERVE`；只有 `scope: team` 计入团队 open；`PROJECT-PROFILE` 落到项目 `.ai-team/tasks` 或 `profiles/`；`OBSERVE` 写 `RISKS.md` + 复查日期。
- **P-54 净零**：每轮新增 `TEAM-CORE` ≤2，且 ≤ 本轮关闭/合并数；团队 open 连续两轮上升时停止新增。frontmatter 记录 `last_retro_new`、`last_retro_closed`、`team_open_at_{last,prev,prev2}_retro`；字段缺失时按旧台账兼容。
- **P-42 债务视图**：`growth-check --debt` 输出 team/project open、open 提案年龄（平均/最老）、重复标题簇和净零违规；`--json` 增加 `debt` 对象。`open` 从 1.9.0 起表示 team open，`openAll` 保留全部未处置数。`--debt` 对 index-only 提案、deferred 缺复查日期/触发点、启用净零但缺 `last_retro_new` 报 error。
- **improve-scan 口径**：`improve-scan` 解析 `scope`，输出 `teamOpen`/`projectOpen`/`openAll`；`open-proposals` 只用 team open，不再把 project profile 债报成团队索引不一致。
- **复查日期**：GROWTH 索引新增 `复查日期` 列；项目 P-28/P-48 回填 `2026-12-07` 与复查触发点。
- **P-30 并入 P-42**：checkpoint 任务隔离与 brief 自包含由债务视图和先处置规则覆盖；P-37 并入 P-50；P-28/P-38/P-48 转项目 profile。
- **profiles**：`skills/ai-team-workflow/profiles/` 增加 `README.md`、`java-spring.md`、`vue.md`、`strict-security.md`；示例不含 riccon 专有路径/值。

验证：

```text
source verify:               204/204
installed verify:            196/196
installed + OpenCode:        206/206
audit-team-consistency:      191 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, 0 failed
fixtures:                    scope:project excluded from team open; duplicate cluster; net-zero new>2 / new>closed / two rises FAIL; legacy schema 2 PASS; archive with scope column
review:                      REV-IMPROVE-2026-11-07-R4 + R4-R1 modified pass (P0=0/P1=0; P2-01..05 -> TASK-IMPROVE-2026-11-07-R5)
sourceHash === installedHash: 4ca6cbe0...
```

### 5.39 净零真值与证据扫描自适应（1.9.1）

- **净零真值**：`growth-check` 解析最新 RETRO 的 `### 4. 改进提案` 表，计算 `actualNewRawTeam`（最新 RETRO 的 team 新增数，含同轮合并/关闭）、`actualNewOpenTeam`（其中仍为 open 的）和 `actualTeamOpen`（索引非终态 team）；与 frontmatter 的 `last_retro_new` / `team_open_at_last_retro` 不一致即 error；`last_retro_closed` 与按最新 RETRO 日期推导的 terminal 数不一致也 error。最新 RETRO 的 raw new > 2 时必须有 `net_zero_exception`（含 RETRO 号/原因/批准日期），否则 error；有 exception 只 warning。
- **语义**：`net_zero_exception` 只用于历史违规迁移，不是常规绕过；同轮合并/关闭不能降低 raw 新增计数，但可以降低 open 增量。
- **improve-scan**：`growth-index-mismatch` 改为比较 `open_proposals` 与 `openAll`（总 open），不再把 project scope 的总 open 与 team open 比较。
- **扫描自适应**：`artifact-check` / `secret-check` 从 2000 文件起步，截断时按 2x 升限到硬上限 20000；到上限仍截断才 `PARTIAL`/exit 3 或 `secret-scan-truncated`；`checkArtifacts` 同时自适应 evidence 与 secrets。UTF-16 BOM 证据解码后扫描；无 BOM 的二进制/不可读文本计 `skipped`，`artifact-check` 报 `credential-scan-skipped`，不得静默 PASS。
- **Fixture**：新增 `scripts/test-gates.mjs`，覆盖 stale-new、stale-open、new>2、new>closed、same-round merged、legacy、scan auto-escalation、ceiling 拒绝；`verify.mjs` 纳入执行。

验证：

```text
source verify:               206/206
installed verify:            196/196
installed + OpenCode:        206/206
audit-team-consistency:      191 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, PASS
gate fixtures:               28/28 PASS
riccon-ai default scan:      2159 text files / 0 findings / PASS (auto limit 4000)
riccon-ai state-check:       PASS
riccon-ai growth-check --debt: PASS (team open 8 -> 11 -> 11; raw new 3 / closed 3 with net_zero_exception)
sourceHash === installedHash: 219f1408...
```

### 5.40 团队目标与一次通过率（1.9.2）

- **团队目标**：`docs/TEAM.md` §0 固化一句话使命与 6 条目标；§0.1 新增“持续提高一次通过率”质量目标。
- **口径**：只统计实现任务首次进入 review；无 R1/R2、reviewer P0/P1=0、无跨角色返工、无 checkpoint 阻断。review 任务、R1/R2 不计入分母。
- **基线/目标**：基线 56.8%（6/10、8/15、8/14）；整体 10 任务 ≥70%、30 任务 ≥80%、长期约 85%；T1/T2 长期 ≥90%；T3/T4 长期约 80%；review-ready 10 任务 ≥90%、30 任务 ≥95%。
- **护栏**：P1 逃逸不上升、审查轮次 ≤2、安全覆盖不降；一次通过率是趋势指标，不作为硬门禁；禁止用缩小 review 范围、隐藏缺陷或“重跑通过”抬数字。
- **`/ai-improve` 目标校准**：命令先复述 `docs/TEAM.md` §0/§0.1（使命、6 条目标、质量目标），再开始分析；请求与目标冲突时先停，否则不额外等待确认。
- **一致性审计**：新增 2 项检查（`ai-improve` 必须先复述目标；团队文档必须保留分层目标）。

验证：

```text
source verify:               206/206
installed verify:            196/196
installed + OpenCode:        206/206
audit-team-consistency:      193 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, PASS
sourceHash === installedHash: 486bab87...
```

### 5.41 Review-entry 合同与首轮横向面（1.9.3）

- **brief-new/brief-lint**：engineer brief 新增 `Review-entry 自检`（ADR/契约章节 → 实现 → 测试 + P1 场景）、`门禁面`（≤2，超出拆 TASK）、`必然受影响测试/脚本` 白名单、`请求参数断言`（查询/幂等/筛选任务）；缺字段/占位符/格式不满足时 `brief-lint` FAIL，不派发。
- **Review 模板/reviewer**：`templates/REVIEW.md` 增加 Review-entry 核对与首轮横向面（生产装配、异常分类、preflight/解析、权限、迁移、配置默认值）；`code-reviewer` 缺表直接退回，不进入 full review；切片 >2 或未预授权测试夹具标 P1。
- **测试**：`test-gates` 新增 4 个 brief-lint fixture（compliant、missing review-entry、missing test whitelist、query without assertion）。

验证：

```text
source verify:               206/206
installed verify:            196/196
installed + OpenCode:        206/206
audit-team-consistency:      195 checks, 0 failed
audit-git-permissions:       10 agents, 0 failed
permission-lint:             570 checks, PASS
gate fixtures:               32/32 PASS
sourceHash === installedHash: 9610a87c...
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
- 版本管理：通过（旧安装识别 → 更新到 1.1.0 → 写 marker → 漂移检测 → `--update` 修复 → `--check` exit 0）；1.9.3 已验证 `sourceHash === installedHash`。
- 复盘节奏：通过（riccon-ai 首次到期时补录 `RETRO-0001`；`retro-check` 可重复检查；具体项目状态以该项目 `.ai-team` 为准）。
- 一致性审计：通过（195 项；新增 brief 生成/校验、secret 扫描、checkpoint 同步、持续优化命令、版本握手、profile/净零检查、团队目标校准与 review-entry 字段检查）。
- 成长提案落地：截至 1.3.0，RETRO-0001 P-01..P-06、RETRO-0002/0003 P-07..P-14、RETRO-0004/0005 P-15..P-22 已落地；1.6.0 继续落地 P-24..P-27/P-29；1.8.7 落地 P-31/P-33/P-35/P-39/P-46/P-49/P-51/P-53；1.9.0 落地 P-28/P-30/P-37/P-38/P-42/P-48/P-54；1.9.1 落地 R5 P2-01/P2-02 + P2-06（净零真值、扫描自适应）；1.9.2 团队目标/一次通过率分层目标与 `/ai-improve` 目标校准；1.9.3 review-entry 合同与首轮横向面。
- 成长处置：机制通过（`GROWTH.md` 提案处置索引、`growth-check --strict`、`team/archive/` 归档）；1.9.0 增加 `scope`、`--debt` 与净零校验；1.9.1 增加净零真值校验（frontmatter 陈旧即 error）与扫描自适应；1.9.2 增加团队目标与 `/ai-improve` 目标校准；1.9.3 增加 review-entry 合同与首轮横向面。
- Shell 权限：通过（1.9.0 最小配置：每角色 44 条 = 42 shell + 2 `.env` read allow；只有 41 条破坏性 deny；无 ask）。
- 流程自动化：通过（P-24 brief-new/brief-lint；P-25 UTF-8；P-26 `--mark --sync-docs`；P-27 secret-check；P-29 restart handshake；P-39 remote truth；P-46/P-49 证据与运行时门禁；P-51 STATUS 行；P-53 done gate；P-54 三层入口/净零；P-42 债务视图；1.9.1 净零真值/扫描自适应；1.9.2 团队目标/`/ai-improve` 目标校准；1.9.3 review-entry/首轮横向面）。
- 持续优化：通过（`build` 下 `/ai-improve` + `improve-scan.mjs` + `docs/IMPROVEMENT.md`；默认分析、授权后实施）。
- 授权门：通过（分析不调用子智能体、不改团队源；`--apply` 才实施）。
- 提交归属：通过（build 提交团队源；Chief 不提交项目状态；DevOps 管项目 `.ai-team` checkpoint；push 需批准）。
- 网关定位：通过（`team-shell` 为可选结构化执行器，不是权限边界；预检直接跑 `permission-lint`）。
- 文档一致性：通过（1.6.1 全量 docs 校验；1.7.0 新增命令计数、策略文档与验证记录）。
- 审查员独立验证：通过（shell 默认 allow 后不再依赖逐条 allowlist；`permission-lint` 校验破坏性边界）。
- 真实编排：通过（T0 + 单专家 + 证据 + 拒绝伪造）。
- 文档闭环：经专家评审发现并修复 5 个问题后通过。
- 已知平台限制：嵌套编排需 `experimental.subagent_depth ≥ 2`；正常顶层使用不需要。
