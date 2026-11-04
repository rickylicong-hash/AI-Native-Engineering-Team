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

检查：

1. Chief 的 `permissions` 是否有：

```yaml
- action: subagent
  resource: "ai-team/*"
  effect: allow
```

2. 是否有更后面的 deny 覆盖（最后匹配生效）；
3. 子 agent 的 `mode` 是否为 `subagent`/`all`；
4. 子 agent ID 是否与文件名/目录一致（`agents/ai-team/engineer.md` → `ai-team/engineer`）；
5. 如果运行时仍用旧 `task` 权限，补一条：

```yaml
- action: task
  resource: "ai-team/*"
  effect: allow
```

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

### 3.2 常用版本命令被拒绝（Permission denied: shell）

**现象**：

```text
Write-Output "--- java ---"; java -version 2>&1; mvn -version 2>&1; ...
Permission denied: shell
```

**原因**：当前 agent 是只读角色（Chief/PM/UX/Architect/Reviewer/Security），shell 默认拒绝。  
Chief 从 `1.1.1` 起允许一组只读工具链版本检查；PM/UX/Architect 仍按设计不跑 shell。

**处理**：

1. 确认版本 ≥ `1.1.1`：

```bash
node scripts/version.mjs --update
```

2. 如果仍在只读角色里被拒：
   - 切到 `ai-team/engineer` 或 `ai-team/devops-engineer` 执行；
   - 或让 Chief 调度 engineer 做工具链诊断；
   - 或在源 agent 的 `permissions` 里加精确 allow，然后 `publish`。

3. `java -version` 输出到 stderr，PowerShell 可能显示 `NativeCommandError`；这不是权限失败。需要干净输出时：

```powershell
cmd /c "java -version 2>&1"
```

**管道命令被拒**：`Get-ChildItem ... | Select-Object ...` 会逐段检查，`Select-Object` 也需要白名单。1.1.2 起 Chief 允许：

`Select-Object`、`Sort-Object`、`Measure-Object`、`Format-Table`、`Format-List`、`Out-String`。

**`try { ... } catch { ... }` 被拒**：`try` 是 PowerShell 复合关键字，不是普通命令；不要用它包裹允许的命令。直接运行，或把逻辑写进 `.ps1` 脚本再执行。

**项目外目录**：`D:\Development` 这类目录默认只保证“列目录”可用；读取文件内容、编辑、写入仍不在默认授权内。需要读取时，单独申请只读、限定目录的权限，并保留 `.env`/密钥/`.git` 的 deny。

## 4. 一直弹权限确认

原因：规则没匹配到，默认 `ask`。

处理：

1. 看提示里的 action/resource；
2. 在对应 agent 加精确 allow（放在 deny 之后）：

```yaml
- action: shell
  resource: "pnpm test *"
  effect: allow
```

3. 不要用 `action: "*" / resource: "*" / effect: allow` 解决所有问题；
4. 检查是否有前面的 deny 覆盖了后面的 allow（最后匹配生效，allow 要放后面）；
5. 项目级可覆盖：项目 `.opencode/opencode.jsonc` 的 `agents`。

## 5. 读取 `.env` 被拒

这是**故意设计**。团队不允许读密钥。

处理：

- 读 `.env.example` / `.env.sample` / `.env.template`；
- 需要新变量：改 `.env.example` 并说明；
- 需要真实密钥：由用户在本地/Secret Manager 配置，不交给 agent；
- 不要把密钥贴进聊天。

## 6. 技能没有出现在可用列表

检查：

1. `SKILL.md` 是否在 `.opencode/skills/<id>/SKILL.md` 或根级 `skills/<id>.md`；
2. frontmatter 是否有 `description`；
3. 是否设置了 `metadata.opencode/autoinvoke: false`（会隐藏）；
4. 技能 ID 是否与目录名一致；
5. 权限 `skill` 是否 deny；
6. 运行 `/reload`。

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
- `~` 在权限路径中会展开，shell 命令不会。

### 8.1 中文显示乱码

PowerShell 5.1 默认按本地 ANSI 代码页解码 `opencode debug ...` 的输出，可能显示乱码；文件本身是 UTF-8，OpenCode 读取正常。需要看清输出时：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

这不影响团队运行。

## 9. 安装后旧文件还在/冲突

安装器会备份同名文件：

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
- 检查 Chief 是否有 `.ai-team/state/*` 的 edit 权限；
- 让 Chief “初始化 `.ai-team/`”；
- 仍失败：手动复制 `.opencode/skills/ai-team-workflow/templates/` 到 `.ai-team/state/`。

## 11. 团队问太多问题/太慢

- 确认用的是 T1/T2，而不是 T3；小任务应裁剪；
- 在目标里写清范围/技术栈/验收；
- 检查是否触发了 L3（生产/删数据/密钥/支付）——这些必须问；
- 如果是权限弹窗，按第 4 节加精确 allow；
- 如果 Chief 反复澄清，检查 `PROJECT.md` 是否为空/矛盾。

## 12. 团队改了不该改的文件

1. 立即停止；
2. `git diff` 确认范围；
3. 恢复非预期改动（`git checkout -- <file>`，确认没有用户工作被覆盖）；
4. 检查对应 agent 的 `edit` 权限；
5. 在 Chief 的 `RISK` 记录；
6. 如果是权限过宽，收紧并跑验证。

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
