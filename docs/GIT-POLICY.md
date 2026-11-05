# Git 权限策略（GIT POLICY）

> **1.5.1 Shell-first strict**：每个角色只有 42 条 shell 规则（1 allow + 41 破坏性 deny）+ 2 条 `.env` read allow；Git 只有破坏性命令 `deny`。下文的角色分层和 commit 归属是**流程约定**，不再由权限强制；commit/push/tag/publish/.env 都不再被拦截。
>
> 注意：shell 权限是**破坏性操作护栏**，不是沙箱；它不防越权或密钥读取。

## 1. 实际 shell 权限

| 类别 | 实际权限 |
|---|---|
| 普通 Git | `status`、`diff`、`log`、`add`、`commit`、`push`、`tag`、`branch`、`remote`、`init`、`apply`、`am` 全部 `allow` |
| 破坏性 Git | `reset --hard`、`clean`、`restore`/`checkout --`、force push/mirror/delete、history rewrite、删除分支/tag/stash/worktree → `deny` |
| 普通 shell | 管道、`;`、`&&`、`||`、`2>&1`、多行命令、构建/测试/发布/部署 → `allow` |
| 密钥 | `.env`/`.ssh`/`.aws` 的 `read` 和 shell 读取均 `allow`（`.env` 的 base ask 由 agent allow 覆盖） |
| 发布/部署 | 所有角色 `allow`；流程上仍建议只由 DevOps 执行并由用户批准 |

## 2. 角色流程约定（非权限强制）

| 角色 | 流程约定 | 说明 |
|---|---|---|
| Chief | 只读诊断，不提交 | 权限允许提交，但应派 DevOps |
| Product Manager | 只写产品，不提交 | 权限允许提交 |
| UX Designer | 只写设计，不提交 | 权限允许提交 |
| System Architect | 只写架构/ADR，不提交 | 权限允许提交 |
| Code Reviewer | 只写报告，不改代码，不提交 | 权限允许提交 |
| Security Auditor | 只写安全报告，不提交 | 权限允许提交 |
| Engineer | 写代码/单测，可提交 | 仍按任务范围 |
| QA Engineer | 写测试/报告；流程上由 DevOps 提交 | 权限允许提交 |
| DevOps Engineer | 负责 checkpoint/发布 | 仍受破坏性命令 deny |
| Technical Writer | 写文档，可提交 | 只改文档 |

## 3. 破坏性命令（唯一权限边界）

| 命令 | 策略 | 理由 |
|---|---|---|
| `git reset --hard*` / `git clean*` | deny | 丢弃工作区/未跟踪文件 |
| `git restore*` / `git checkout --*` / `git checkout -f*` | deny | 丢弃未提交改动 |
| `git switch -f*` / `git switch --discard-changes*` / `git reset --merge*` | deny | 强制切换/丢弃 |
| `git branch -D*` / `git branch -d*` / `git tag -d*` / `git tag --delete*` | deny | 删除分支/标签 |
| `git stash clear*` / `git stash drop*` | deny | 删除 stash |
| `git update-ref -d*` / `git reflog expire*` / `git gc --prune*` | deny | 让提交不可恢复 |
| `git filter-branch*` / `git filter-repo*` | deny | 重写历史 |
| `git push --force*` / `git push * --force*` / `git push -f*` / `git push * -f*` / `git push * +*` | deny | 覆盖远端历史 |
| `git push --mirror*` / `git push --delete*` / `git push * --delete*` | deny | 删除远端 refs |
| `git worktree remove*` | deny | 删除 worktree |
| `rm -rf*` / `rm -r*` / `del /s*` / `rd /s*` / `Remove-Item * -Recurse*` | deny | 删除文件 |
| `docker system/volume/image prune*` / `terraform destroy*` / `kubectl delete*` | deny | 破坏性基础设施操作 |

## 4. 仓库初始化 owner

**DevOps Engineer** 负责：

- `git init`、默认分支、初始提交；
- `.gitignore` / `.gitattributes` / `.editorconfig` / `.gitmodules`；
- remote 配置（首次 push 用户批准）；
- 分支保护/规则集、密钥扫描、依赖扫描、CI 骨架。

**Chief** 建任务/验收；**Engineer** 提供代码结构建议；**Security** 审查密钥/权限；**用户** 批准远程仓库/首次 push。

## 4.1 提交归属（Commit Ownership）

**默认原则：作者负责内容，DevOps 负责 `.ai-team` checkpoint 提交；代码/文档作者可以提交自己的代码/文档。**

| 内容 | 作者 | 提交者 | 说明 |
|---|---|---|---|
| 代码 + 单元测试 + `.ai-team/work/TASK-*EVIDENCE.md` 证据 | Engineer | **Engineer** | commit 由作者执行；只 stage 任务范围；不提交原始日志 |
| 文档 + `CHANGELOG` + `.ai-team/docs` | Technical Writer | **Technical Writer** | commit 由作者执行；不碰源码 |
| PRD / 用户故事 / 验收 | Product Manager | **DevOps** | PM 只写，不 commit |
| UX / UI 规格 / 设计系统 | UX Designer | **DevOps** | UX 只写，不 commit |
| 架构 / ADR / 契约 | System Architect | **DevOps** | Architect 只写，不 commit |
| QA 报告 / 缺陷 | QA Engineer | **DevOps** | QA 只写，不 commit |
| 安全报告 / 威胁模型 | Security Auditor | **DevOps** | 脱敏后提交；Security 只写，不 commit |
| 状态 / 任务 / 决策 / 风险 / HANDOFF / GROWTH | Chief | **DevOps** | Chief 只写，不 commit；复盘条目按门禁/10 任务节奏提交 |
| 发布 / 回滚 / runbook | DevOps | **DevOps** | 自己提交 |

规则：

1. **流程建议只 stage 明确路径**；`git add -A` / `git add .` 不再被权限拒绝。
2. 只读角色（Chief/PM/UX/Architect/Reviewer/Security）流程上不 commit；权限不再强制。
3. 提交前扫描密钥/凭据/客户数据；安全报告必须脱敏。
4. `git push` 前仍需用户批准（L3）；权限不再 `ask`。
5. 不提交 `work/**` 原始日志、截图、tmp；只提交精选 `work/*EVIDENCE.md` 和门禁需要的摘要。
6. 若项目选择 `.ai-team` 完全本地，则不做 checkpoint commit。

Commit message 模板：

```text
chore(ai-team): checkpoint <G?> <date>

Tasks: TASK-0012, TASK-0013
Roles: product-manager, ux-designer, qa-engineer
Co-authored-by: ai-team/product-manager <ai-team@local>
Co-authored-by: ai-team/qa-engineer <ai-team@local>
```

Checkpoint 触发：

- 阶段门禁切换；
- 里程碑/发布；
- 每 10 个任务，或复盘写入 `team/GROWTH.md` 后；
- Chief 写 HANDOFF 时；
- 用户要求。

### 4.2 Checkpoint 检查

项目跟踪 `.ai-team` 时，先把 `ai-team-workflow/templates/AI-TEAM-GITIGNORE` 复制为 `.ai-team/.gitignore`，忽略 `work/**/*.txt`、`*-logs/`、截图、tmp 等原始产物；只保留 `work/*EVIDENCE.md`。

项目根 `.gitignore` 增加 `logs/`；原始日志写 `logs/<date>/TASK-<id>-<step>-<timestamp>.log`，不写仓库根目录。`.gitignore` 只防提交，不代替清理；`checkpoint-check`/`state-check` 会扫描根目录产物和证据编码，artifact error 会阻断 checkpoint。`logs/**` 的 UTF-16 日志用 `artifact-check --fix` 转成 UTF-8；历史 `.ai-team/work` 用 `--fix-all`。

在门禁、交接、或工作区文件数达到阈值时运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\checkpoint-check.mjs" --project .
```

到期条件：未提交文件 ≥20、进入 G5/G7/G8、`--handoff`、已有 `CHECKPOINT.json` 基线后每 10 个 `done`、或用户要求。

每次 checkpoint 建一个 `TASK-GIT-*` 任务（owner: DevOps）并写入 `state/TASKS.md`；brief 列出明确路径，流程上不要用 `git add -A` / `git add .`（权限已不再拒绝）。完成后写 `work/TASK-GIT-*-EVIDENCE.md`，运行 `checkpoint-check --mark`，再更新 `TASKS.md` / `RUN_LOG.md`。

DevOps 提交成功后运行 `--mark` 更新 `state/CHECKPOINT.json`。**流程上 Chief 不执行 `git add`/`git commit`/`git push`**；权限已不再拒绝，但正确动作仍是派 DevOps。

## 5. 只读角色流程红线（权限不强制）

流程上只读角色不做：

- commit / push / tag；
- 创建/删除分支；
- 修改 remote；
- reset/clean/checkout 丢弃工作区；
- 修改全局 git config。

这些操作中只有 reset/clean/checkout 丢弃工作区属于破坏性命令，会被权限 deny；其余由流程和 review 约束。需要写操作时，由 Chief 调度对应实现角色。

## 6. Break-glass

如果确实需要被 deny 的操作：

1. 停止；
2. 由用户明确批准；
3. 记录 `DEC-*` / `RISK-*`；
4. 由授权方临时调整源权限并 `publish`；
5. 操作后恢复权限。

不要用其他命令绕过 deny（例如用 `git apply` 绕过 edit 所有权）。

## 7. 审计

```bash
node scripts/audit-git-permissions.mjs
```

期望：

```text
PASS  chief.md
PASS  code-reviewer.md
...
10 agents checked, 0 failed.
```

`--json` 可用于 CI：

```bash
node scripts/audit-git-permissions.mjs --json
```

另外两个审计：

```bash
# 检查“prompt 说了但权限/脚本没接线”的一致性问题
node scripts/audit-team-consistency.mjs

# 检查当前项目是否需要 checkpoint；--mark 会拒绝含原始日志/密钥/构建产物的 HEAD
node "$HOME/.config/opencode/skills/ai-team-workflow/scripts/checkpoint-check.mjs" --project .
```

`node scripts/verify.mjs` 会自动运行上述两个审计（仅源码仓库）和所有 `.mjs` 的语法检查。

## 8. 残余风险

- shell 不是沙箱；1.5.1 下 `git add/commit/push/tag` 也是 allow，`Set-Content`/`Out-File`/here-string 可写文件；**agent 级 `edit` 限制已移除**，只能靠 prompt、review、checkpoint、会话审计；需要更强隔离时用 OS ACL 或容器只读挂载；
- `git config core.hooksPath` 可配置钩子；需要更高安全时单独 deny；
- `git push` 的远端保护/分支规则仍需平台侧配置；
- 权限只覆盖团队 agent，不覆盖用户或第三方插件。
