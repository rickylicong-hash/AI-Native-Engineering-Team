# 排障手册（TROUBLESHOOTING）

## 1. `/ai` 命令不存在

**现象**：输入 `/ai` 没有补全/提示 unknown command。

检查：

1. 命令文件是否在 `~/.config/opencode/commands/ai.md` 或项目 `.opencode/commands/ai.md`；
2. 文件名必须是 `ai.md`（ID 为 `ai`），不是 `ai-team.md`；
3. frontmatter 是否合法（`---` 开头/结尾）；
4. 保存后 OpenCode 会自动 reload；仍不生效执行 `/reload`；
5. 项目内 `.opencode` 优先级高于全局；检查是否被同名文件覆盖。

## 2. Agent 列表里没有 `ai-team/*`

检查：

1. 路径：`~/.config/opencode/agents/ai-team/*.md` 或项目 `.opencode/agents/ai-team/*.md`；
2. frontmatter 是否有 `description` 和 `mode`；
3. YAML 是否合法：`*` 必须加引号，缩进用空格；
4. 运行：

```bash
opencode agent list | Select-String "ai-team/"
```

5. 运行验证：

```bash
node scripts/verify.mjs --root ~/.config/opencode --installed
```

## 3. Subagent 启动失败/没有权限

**现象**：Chief 无法调用 `ai-team/engineer`，或提示 subagent not allowed。

1.5.1 起已移除 agent 级 `subagent`/`task` 权限规则；不要为此新增权限块。检查：

1. 子 agent 的 `mode` 是否为 `subagent`/`all`；
2. 子 agent ID 是否与文件名/目录一致（`agents/ai-team/engineer.md` → `ai-team/engineer`）；
3. 是否触发了 `experimental.subagent_depth` 限制（见 3.1）；
4. 是否旧会话仍在使用升级前的权限缓存：新开 OpenCode 会话后再试；
5. 仍失败时用 `permission-doctor.mjs` 查看最终规则，不要扩大 `*` allow。

### 3.1 嵌套编排深度限制

错误：

```text
Subagent depth limit reached (1). Increase "experimental.subagent_depth" to allow nested subagents.
```

原因：

- OpenCode 默认 subagent 深度为 1。
- 正常用法：顶层会话（depth 0）选择 `ai-team/chief`，Chief 调度专家（depth 1），不需要提高。
- 只有“把 Chief 当 subagent 调用”或“Chief 再派生专家”时才需要 depth ≥ 2。

修复（项目或全局 `opencode.json(c)`）：

```jsonc
{
  "experimental": {
    "subagent_depth": 3
  }
}
```

建议值 3：顶层(0) → 编排(1) → 专家(2) → 只读咨询(3)。

不要用“代写专家报告”绕过限制；深度不足时应报 `BLOCKED`。

### 3.2 常用命令被拒绝（Permission denied: shell）

**现象**：

```text
Write-Output "--- java ---"; java -version 2>&1; mvn -version 2>&1; ...
Permission denied: shell
```

**原因（1.4.1 及以前）**：只读角色 shell 默认 deny；复合命令、管道和 `2>&1` 会被直接拒绝。1.4.2 起改为 Shell-first：所有角色 shell 默认 allow，复合命令不再默认拒绝。

**1.6.0 仍会被拒的只有破坏性命令**：

- `git reset --hard*`、`git clean*`、`git restore*`、`git checkout --*`、`git checkout -f*`；
- force push/mirror/delete、history rewrite、删除分支/tag/stash/worktree；
- `rm -rf*`、`Remove-Item -Recurse*`、`docker * prune*`、`terraform destroy*`、`kubectl delete*`。

commit/push、publish/deploy、`.env`/密钥、`git add -A` 都**不再**被权限拒绝。

**处理**：

1. 先确认版本 ≥ `1.6.1`（在团队仓库根目录；安装副本不含 `scripts/`）：

```bash
node scripts/version.mjs --update
```

   如果刚执行过 `--update`，必须**新开 OpenCode 会话**；旧会话仍使用旧权限缓存，会继续拒绝普通命令。

2. 用 `permission-doctor` 看最终匹配规则；不要为了绕过破坏性 deny 扩大 `node *`/`git *`：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\permission-doctor.mjs" `
  --agent ai-team/engineer --command "<完整命令>"
```

3. `java -version` 输出到 stderr，PowerShell 可能显示 `NativeCommandError`；这不是权限失败。需要干净输出时：

```powershell
cmd /c "java -version 2>&1"
```

**项目外目录**：1.5.1 起 agent 级 `external_directory` 规则已移除，base 默认允许；shell 由 OS 权限和人工审查约束。

### 3.2.1 `brief-lint` 报缺字段 / brief 手抄参数

**现象**：`brief-lint` 报 `MISSING script_help`、`MISSING contract_ref`、`MISSING encoding`，或 brief 里手抄的 `--file`/`--report` 与脚本实际参数不一致。

**处理**：不要手写骨架；用生成器：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-new.mjs" `
  --task TASK-xxxx --agent ai-team/engineer --out .ai-team/tasks/TASK-xxxx-BRIEF.md
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\brief-lint.mjs" `
  --brief .ai-team/tasks/TASK-xxxx-BRIEF.md --agent ai-team/engineer
```

脚本参数一律写“以 `<script> --help` 实跑为准”；契约只引 `API-CONTRACTS`/ADR 章节号或字段名，不复制定义。

### 3.3 有未提交改动但没人提交

**现象**：

- HANDOFF 写着 “Wave X 未提交”；
- 工作区有几十个文件，但一直没人提交；
- 旧会话可能记录 “git add 权限受限”（1.4.x 及以前）。

**原因**：1.5.1 起 `git add`/`git commit` 权限已 allow。正确动作仍是流程上由 DevOps 做 checkpoint；Chief 不应自己提交，但不再是权限拒绝。

**处理**：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\checkpoint-check.mjs" --project .
```

- 到期 → 建 `TASK-GIT-*`，brief 列出明确路径，派 DevOps 提交；流程建议不要写 `git add -A`。
- 只提交精选 `.ai-team` 路径；不提交 `work/**` 原始日志、截图、tmp、未脱敏安全报告。
- 提交后 DevOps 运行 `checkpoint-check --mark --sync-docs`；`--sync-docs` 会自动更新 `HANDOFF` 的 Git/Baseline 和 `STATUS` 的 Checkpoint。若 HEAD 含原始日志/密钥/构建产物或证据含明文凭据，`--mark` 会拒绝，先修正再标记。
- 用户明确要求暂不提交 → 在 HANDOFF 写 `Checkpoint: WAIVED` + 原因 + `RISK-*`。

### 3.3.1 `growth-check` 报提案缺少处置状态

**现象**：`growth-check` 报 `missing row in 提案处置索引`，或 `done requires 落地版本/任务`。

**处理**：在 `.ai-team/team/GROWTH.md` 的“提案处置索引”为每条提案补一行：`ID / RETRO / 提案 / 状态 / 落地版本或任务 / 证据 / 更新日期`。处置完的提案用 `done/rejected/superseded`，未处置用 `proposed/accepted/in_progress/deferred/partial`。全部处置且不是最近一轮的 RETRO，可用 `growth-check --archive --yes` 归档到 `team/archive/`。

### 3.4 `/ai-resume` 大量 Permission denied（历史）

**现象**：

```text
Shell git status --short 2>&1; echo "---EXIT:$LASTEXITCODE"   Permission denied
Shell git -C D:\Development\riccon-ai status --short          Permission denied
Shell Get-Content .ai-team\state\RUN_LOG.md -Tail 40          Permission denied
Shell mvn -v                                                  Permission denied
```

**原因（1.4.1 及以前）**：

- Chief/Reviewer 等角色 shell 是 allowlist；
- `;`/`&&`/`2>&1` 被当作复合命令直接 deny；
- `git -C ...`、`Get-Content`、`mvn -v` 等旧版未匹配；
- 模型被拒后反复换写法重试，放大成“大量 Permission denied”。

**1.6.0 Shell-first strict 处理**：

- 所有角色 shell 默认 allow；以上命令现在都应直接通过；
- 只有破坏性命令仍会被拒；commit/push/publish/`.env`/`git add -A` 不再由权限拦截；
- 仍被拒时用 `permission-doctor` 看最终规则，不要为了绕过破坏性 deny 扩大 `node *`/`git *`；
- `read`/`glob`/`grep` 仍是读文件的首选，但不是权限强制要求。

## 4. 一直弹权限确认

1.6.0 起 shell 不再配置 `ask`。如果仍弹确认，通常是旧会话仍在用旧配置。

处理：

1. 看提示里的 action/resource；
2. 确认已安装 1.6.1：`node scripts/version.mjs --check`；
3. 重开 `/ai-resume` 或新会话，让 OpenCode 重新加载 agent 配置；`version.mjs --update` 后会提示 `RESTART REQUIRED`；
4. 如果新会话仍弹 `ask`，用 `permission-doctor` 检查是否有旧的 `ask` 规则；
5. 项目级可覆盖：项目 `.opencode/opencode.jsonc` 的 `agents`。

## 5. 读取 `.env`

1.5.1 起 agent 的 `read` 规则对 `*.env` / `*.env.*` 显式 `allow`，覆盖 base 的 `.env` ask；shell 也不再拦截。

建议：

- 优先读 `.env.example` / `.env.sample` / `.env.template` 了解变量名；
- 需要新变量：改 `.env.example` 并说明；
- 需要真实密钥：由用户在本地/Secret Manager 配置，不交给 agent；
- 不要把密钥贴进聊天、日志或提交。

### 5.1 证据里出现明文 Cookie/Authorization/口令

**现象**：`state-check`/`artifact-check`/`checkpoint-check --mark` 报 `credential-plaintext`，或 `secret-check` 找到明文。

**处理**：

```powershell
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\secret-check.mjs" --project .
node "$HOME\.config\opencode\skills\ai-team-workflow\scripts\secret-check.mjs" --project . --fix
```

`--fix` 会把值替换为 `<redacted len=NN sha256=前12位>`，保留长度和交叉核对能力。已经提交到历史的明文不能靠 `--fix` 消除；需要用户决定轮换、接受或改写历史（force push 属于破坏性操作，必须明确批准）。

## 6. 技能没有出现在可用列表

检查：

1. `SKILL.md` 是否在 `.opencode/skills/<id>/SKILL.md` 或根级 `skills/<id>.md`；
2. frontmatter 是否有 `description`；
3. 是否设置了 `metadata.opencode/autoinvoke: false`（会隐藏）；
4. 技能 ID 是否与目录名一致；
5. 是否被全局/项目配置禁用（`skill` 规则或 autoinvoke）；
6. 运行 `/reload`；
7. 仍不可见时检查是否安装到了错误的配置目录。

## 7. 模型不可用/报 provider 错误

- `opencode models` 查看可用模型；
- agent 里 `model:` 必须是 `provider/model` 或 `provider/model#variant`；
- 不确定就删掉 `model`，让 subagent 继承当前会话模型；
- 不要在团队里硬编码只有你有权访问的模型。

## 8. Windows 路径/脚本问题

- 安装用 PowerShell：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

- 路径含空格要加引号；
- 不要用 `/home/...` 假设；
- 行尾 CRLF/LF 不影响 Markdown agent；脚本用对应平台；
- `~` 的展开取决于 shell/脚本；不确定时写绝对路径。

### 8.1 中文显示乱码

PowerShell 5.1 默认按本地 ANSI 代码页解码 `opencode debug ...` 的输出，可能显示乱码；文件本身是 UTF-8，OpenCode 读取正常。需要看清输出时：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

这不影响团队运行。

## 9. 安装后旧文件还在/冲突

安装器会把同名内容移动到：

```text
~/.config/opencode-backups/ai-team/<YYYYMMDD-HHmmss>/
  agents/ai-team/
  commands/
  skills/
```

该目录在 OpenCode 配置目录之外，不会被扫描成 agent/command/skill。

恢复：把备份目录里的内容移回 `~/.config/opencode/` 对应位置。不要直接删除你不确定来源的文件。

## 10. `.ai-team/` 没有创建

- 确认 Chief 被正确选中（`/ai` 或 `ai-team/chief`）；
- 确认当前目录可写；
- 检查 Chief 是否能写当前目录（OS 权限）；1.5.1 起不再用 `edit` 权限拦截；
- 让 Chief “初始化 `.ai-team/`”；
- 仍失败：手动复制 `.opencode/skills/ai-team-workflow/templates/` 到 `.ai-team/state/`。

## 11. 团队问太多问题/太慢

- 确认用的是 T1/T2，而不是 T3；小任务应裁剪；
- 在目标里写清范围/技术栈/验收；
- 检查是否触发了 L3（生产/删数据/密钥/支付）——这些必须问；
- 1.6.0 起不应有 shell `ask`；若仍弹窗，按第 4 节确认版本并新开会话；
- 如果 Chief 反复澄清，检查 `PROJECT.md` 是否为空/矛盾。

## 12. 团队改了不该改的文件

1. 立即停止；
2. `git diff` 确认范围；
3. 由用户确认后恢复非预期改动（`git restore`/`git checkout --` 属于破坏性命令，agent 权限会 deny）；
4. 检查 brief/所有权/prompt 是否给了错误范围（权限层没有 `edit` 边界）；
5. 在 Chief 的 `RISK` 记录；
6. 如属流程缺口，更新 brief/review/checkpoint 规则并重跑验证。

## 13. 验证脚本失败

- 看 FAIL 行；
- 常见：agent 数量变了、manifest 没同步、命令 `agent` 引用不存在、模板缺失；
- 修完后重跑；
- `--installed` 模式检查的是安装目录，不是源码目录；
- `--opencode` 会调用 CLI，可能较慢/输出很大，失败时先单独跑 `opencode agent list`。

## 14. 生产发布被阻断

这是设计：

- 生产发布是 L3，必须用户明确批准；
- 先做 staging + 冒烟 + 回滚验证；
- 检查 QA/安全是否放行；
- 检查 `deploy/` 是否有回滚命令；
- 批准后在 `/ai-deploy production` 中明确说明。

## 14.1 版本状态异常

先看：

```bash
node scripts/version.mjs
```

| 状态 | 原因 | 处理 |
|---|---|---|
| `legacy` | 旧安装，没有 `ai-team-install.json` | `node scripts/version.mjs --update` |
| `drift` | 源内容变了但版本没 bump，或已安装副本被改 | `--update`；维护者 bump `team-manifest.json` |
| `incomplete` | 上次安装不完整 | `--update`，再跑 `verify.mjs --installed` |
| `unknown` | 标记 JSON 损坏/缺字段 | `--update --force` |
| `installed-newer` | 已安装版本高于源 | 更新源，或 `--force` 降级 |
| `not-installed` | 目标目录没有团队文件 | `--update` 或 `install.ps1` |

`--update` 成功后必须新开 OpenCode 会话/重启（`RESTART REQUIRED`）；旧会话可能仍使用旧权限缓存。

标记文件位置：

```text
~/.config/opencode/ai-team-install.json
```

如果 marker 与真实文件不一致，以 `verify.mjs --installed` 和实际文件为准。

## 15. 卸载

删除以下内容（先备份）：

```text
~/.config/opencode/agents/ai-team/
~/.config/opencode/commands/ai*.md
~/.config/opencode/skills/ai-team-*/
```

项目内删除对应 `.opencode/` 内容。不会影响其他 agent/command/skill。

## 16. 收集诊断

```bash
opencode --version
opencode agent list
node scripts/verify.mjs --root ~/.config/opencode --installed
```

附：操作系统、OpenCode 版本、安装路径、失败命令、原始错误（脱敏）。
