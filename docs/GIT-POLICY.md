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
| QA Engineer | 读写：commit/push/tag 均 `ask`；`apply`/`am` deny | 不直接改生产代码 |
| DevOps Engineer | 读写：commit/push/tag 均 `ask`；仓库初始化 owner | `git init` 允许；remote 变更 ask |
| Technical Writer | 读写：commit/push/tag 均 `ask`；`apply`/`am` deny | 只改文档 |

## 2. 命令策略

| 命令 | 策略 | 理由 |
|---|---|---|
| `git status/diff/log/show/rev-parse/blame/ls-files/grep` | allow（只读角色按需） | 只读 |
| `git commit` | ask（实现角色） | 需要用户批准 |
| `git push` | ask（实现角色） | 外部副作用 |
| `git tag` | ask（实现角色） | 发布动作 |
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
| `git init` | DevOps allow；其他实现角色 ask | 仓库初始化 owner 是 DevOps |
| `git apply` / `git am` | Engineer/DevOps allow；QA/Writer deny | 防止绕过 edit 所有权 |

## 3. 仓库初始化 owner

**DevOps Engineer** 负责：

- `git init`、默认分支、初始提交；
- `.gitignore` / `.gitattributes` / `.editorconfig` / `.gitmodules`；
- remote 配置（首次 push 用户批准）；
- 分支保护/规则集、密钥扫描、依赖扫描、CI 骨架。

**Chief** 建任务/验收；**Engineer** 提供代码结构建议；**Security** 审查密钥/权限；**用户** 批准远程仓库/首次 push。

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

## 7. 残余风险

- shell 不是沙箱；`git rebase`、`git merge`、`git apply`（Engineer/DevOps）仍可能改变工作区；
- `git config core.hooksPath` 可配置钩子；需要更高安全时单独 deny；
- `git push` 的远端保护/分支规则仍需平台侧配置；
- 权限只覆盖团队 agent，不覆盖用户或第三方插件。
