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

### 5.9 `/ai-resume` 权限噪声（1.2.7）

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
- 版本管理：通过（旧安装识别 → 更新到 1.1.0 → 写 marker → 漂移检测 → `--update` 修复 → `--check` exit 0）；1.3.0 已验证 `sourceHash === installedHash`。
- 复盘节奏：通过（riccon-ai 29 个 `done` 到期 → 补录 `RETRO-0001` → 下次 39 或 G5 前；脚本可重复检查）。
- 一致性审计：通过（168 项；修掉 Chief 脚本权限、QA 提交矛盾、external_directory 缺失、checkpoint 未接线、resume 只读命令缺口、DevOps 证据写入缺口、审查员独立验证缺口、Engineer 越权编辑、发布命令越权、重复规则、HANDOFF 自引用、增长台账缺口）。
- 成长提案落地：通过（RETRO-0001 P-01..P-06；RETRO-0002/0003 P-07..P-14；1.3.0 关闭 RETRO-0004/0005 的 P-15..P-22）。
- 成长处置：通过（`GROWTH.md` 提案处置索引 22/22 done；`growth-check --strict` PASS；旧 RETRO 已归档到 `team/archive/GROWTH-2026.md`）。
- Resume 权限噪声：通过（1.2.7 补齐 Chief 只读命令并明确命令风格）。
- DevOps 证据写入：通过（1.2.8 允许 `work/*EVIDENCE.md` 并禁止 shell 绕过）。
- 审查员独立验证：通过（1.2.9 增加只读构建/测试/扫描 allowlist）。
- 真实编排：通过（T0 + 单专家 + 证据 + 拒绝伪造）。
- 文档闭环：经专家评审发现并修复 5 个问题后通过。
- 已知平台限制：嵌套编排需 `experimental.subagent_depth ≥ 2`；正常顶层使用不需要。
