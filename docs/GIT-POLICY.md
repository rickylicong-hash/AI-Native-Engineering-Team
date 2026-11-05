# Git 权限策略（GIT POLICY）

> 目标：让只读角色真的只读，让实现角色能干活但不误伤历史/远程/工作区，让仓库初始化有明确 owner。  
> 注意：shell 权限是**护栏**，不是沙箱；它防误操作，不防恶意绕过。

## 1. 角色分层

| 角色 | Git 能力 | 说明 |
|---|---|---|
| Chief | 只读：`status` / `diff` / `log` / `show` / `rev-parse` / `--version` | 不 commit/push/tag |
| Product Manager | 只读：`status` / `diff` / `log` | 不 commit/push/tag |
| UX Designer | 只读：`status` / `diff` / `log` | 不 commit/push/tag |
| System Architect | 只读：`status` / `diff` / `log` / `--version` | 不 commit/push/tag |
| Code Reviewer | 只读：`status` / `diff` / `log` / `show` / `rev-parse` / `blame` / `ls-files` | 不 commit/push/tag |
| Security Auditor | 只读：`status` / `diff` / `log` / `show` / `grep` / `ls-files` | 不 commit/push/tag |
| Engineer | 读写：commit/push/tag 均 `ask`；危险历史/工作区操作 deny/ask | 可初始化普通仓库（`git init` ask） |
| QA Engineer | 读写：**不 commit/push/tag/add/rm/mv（`deny`）**；`apply`/`am`/`init` deny | 测试产物由 DevOps checkpoint 提交 |
| DevOps Engineer | 读写：commit/push/tag 均 `ask`；仓库初始化 owner | `git init` 允许；remote 变更 ask |
| Technical Writer | 读写：commit/push/tag 均 `ask`；`apply`/`am` deny | 只改文档 |

## 2. 命令策略

| 命令 | 策略 | 理由 |
|---|---|---|
| `git status/diff/log/show/rev-parse/blame/ls-files/grep` | allow（只读角色按需） | 只读 |
| `git commit` | ask（Engineer/DevOps/Writer）；QA deny | 需要用户批准 |
| `git push` | ask（Engineer/DevOps/Writer）；QA deny | 外部副作用 |
| `git tag` | ask（Engineer/DevOps/Writer）；QA deny | 发布动作 |
| `git push --force*` / `git push -f*` | deny | 覆盖远端历史 |
| `git push * +*` | deny | refspec 强制推送 |
| `git push --mirror` | deny | 镜像删除远端 refs |
| `git push --delete` | ask | 删除远端分支/标签 |
| `git reset --hard` | deny | 丢弃工作区 |
| `git clean` | deny | 删除未跟踪文件 |
| `git branch -D` / `git branch -d` | deny | 删除分支 |
| `git remote add/remove/set-url` | ask | 改变远端配置 |
| `git checkout -- <path>` / `git restore` | ask | 丢弃未提交改动 |
| `git checkout -f` / `git switch -f` / `git switch --discard-changes` | ask | 强制切换/丢弃 |
| `git reset --merge` | ask | 可能丢弃改动 |
| `git stash clear` | deny | 清空 stash |
| `git stash drop` | ask | 删除单个 stash |
| `git update-ref -d` | deny | 删除 ref |
| `git reflog expire` | deny | 让提交不可恢复 |
| `git gc --prune*` | deny | 清理不可达对象 |
| `git config --global` | ask | 改全局配置 |
| `git init` | DevOps allow；Engineer/Writer ask；QA deny | 仓库初始化 owner 是 DevOps |
| `git apply` / `git am` | Engineer/DevOps allow；QA/Writer deny | 防止绕过 edit 所有权 |

## 3. 仓库初始化 owner

**DevOps Engineer** 负责：

- `git init`、默认分支、初始提交；
- `.gitignore` / `.gitattributes` / `.editorconfig` / `.gitmodules`；
- remote 配置（首次 push 用户批准）；
- 分支保护/规则集、密钥扫描、依赖扫描、CI 骨架。

**Chief** 建任务/验收；**Engineer** 提供代码结构建议；**Security** 审查密钥/权限；**用户** 批准远程仓库/首次 push。

## 3.1 提交归属（Commit Ownership）

**默认原则：作者负责内容，DevOps 负责 `.ai-team` checkpoint 提交；代码/文档作者可以提交自己的代码/文档。**

| 内容 | 作者 | 提交者 | 说明 |
|---|---|---|---|
| 代码 + 单元测试 + `.ai-team/work/TASK-*EVIDENCE.md` 证据 | Engineer | **Engineer** | commit 默认 `ask`；只 stage 任务范围；不提交原始日志 |
| 文档 + `CHANGELOG` + `.ai-team/docs` | Technical Writer | **Technical Writer** | commit 默认 `ask`；不碰源码 |
| PRD / 用户故事 / 验收 | Product Manager | **DevOps** | PM 只写，不 commit |
| UX / UI 规格 / 设计系统 | UX Designer | **DevOps** | UX 只写，不 commit |
| 架构 / ADR / 契约 | System Architect | **DevOps** | Architect 只写，不 commit |
| QA 报告 / 缺陷 | QA Engineer | **DevOps** | QA 只写，不 commit |
| 安全报告 / 威胁模型 | Security Auditor | **DevOps** | 脱敏后提交；Security 只写，不 commit |
| 状态 / 任务 / 决策 / 风险 / HANDOFF / GROWTH | Chief | **DevOps** | Chief 只写，不 commit；复盘条目按门禁/10 任务节奏提交 |
| 发布 / 回滚 / runbook | DevOps | **DevOps** | 自己提交 |

规则：

1. **禁止 `git add -A` / `git add .`**；只 stage 明确路径。
2. 只读角色（Chief/PM/UX/Architect/Reviewer/Security）不拿 raw `git commit`。
3. 提交前扫描密钥/凭据/客户数据；安全报告必须脱敏。
4. `git push` 仍需用户批准（L3）。
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

### 3.2 Checkpoint 检查

项目跟踪 `.ai-team` 时，先把 `ai-team-workflow/templates/AI-TEAM-GITIGNORE` 复制为 `.ai-team/.gitignore`，忽略 `work/**/*.txt`、`*-logs/`、截图、tmp 等原始产物；只保留 `work/*EVIDENCE.md`。

项目根 `.gitignore` 增加 `logs/`；原始日志写 `logs/<date>/TASK-<id>-<step>-<timestamp>.log`，不写仓库根目录。`.gitignore` 只防提交，不代替清理；`checkpoint-check`/`state-check` 会扫描根目录产物和证据编码，artifact error 会阻断 checkpoint。

在门禁、交接、或工作区文件数达到阈值时运行：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\checkpoint-check.mjs" --project .
```

到期条件：未提交文件 ≥20、进入 G5/G7/G8、`--handoff`、已有 `CHECKPOINT.json` 基线后每 10 个 `done`、或用户要求。

每次 checkpoint 建一个 `TASK-GIT-*` 任务（owner: DevOps）并写入 `state/TASKS.md`；brief 必须列出明确路径，禁止 `git add -A` / `git add .`。完成后写 `work/TASK-GIT-*-EVIDENCE.md`，运行 `checkpoint-check --mark`，再更新 `TASKS.md` / `RUN_LOG.md`。

DevOps 提交成功后运行 `--mark` 更新 `state/CHECKPOINT.json`。**Chief 不得自己 `git add`/`git commit`/`git push`**；如果 Chief 遇到 `git add` 被拒，正确动作是派 DevOps，而不是绕过或把未提交状态写进 HANDOFF 就继续。

## 4. 只读角色红线

只读角色不得：

- commit / push / tag；
- 创建/删除分支；
- 修改 remote；
- reset/clean/checkout 丢弃工作区；
- 修改全局 git config。

需要写操作时，由 Chief 调度对应实现角色。

## 5. Break-glass

如果确实需要被 deny 的操作：

1. 停止；
2. 由用户明确批准；
3. 记录 `DEC-*` / `RISK-*`；
4. 由授权方临时调整源权限并 `publish`；
5. 操作后恢复权限。

不要用其他命令绕过 deny（例如用 `git apply` 绕过 edit 所有权）。

## 6. 审计

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

## 7. 残余风险

- shell 不是沙箱；`git rebase`、`git merge`、`git apply`（Engineer/DevOps）仍可能改变工作区；
- shell 可以 `Set-Content`/`Out-File`/here-string 写文件，**不能把它当作 `edit` 权限的绕过通道**；角色 prompt 已禁止，review/audit 应检查；需要更强隔离时对非 owned 路径加 shell 写规则 deny；
- `git config core.hooksPath` 可配置钩子；需要更高安全时单独 deny；
- `git push` 的远端保护/分支规则仍需平台侧配置；
- 权限只覆盖团队 agent，不覆盖用户或第三方插件。
