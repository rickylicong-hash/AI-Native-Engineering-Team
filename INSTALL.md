# 安装手册（INSTALL）

## 1. 前置条件

- OpenCode V2（`opencode --version` 可运行）；
- Windows PowerShell 5.1+，或 Linux/macOS Bash；
- 项目目录可写；
- 已获取本仓库（`git clone` 或下载解压），并进入仓库根目录；
- 不需要联网即可安装（团队文件全部本地）；构建/测试可能需要联网，按项目配置。

## 2. 全局安装（推荐）

### Windows

```powershell
cd <path-to-this-repo>
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

### Linux / macOS

```bash
cd /path/to/ai-native-team
chmod +x scripts/install.sh
./scripts/install.sh --dry-run
./scripts/install.sh
```

安装目标：

- Windows：`%USERPROFILE%\.config\opencode`（或 `%XDG_CONFIG_HOME%\opencode`）
- Linux/macOS：`~/.config/opencode`（或 `$XDG_CONFIG_HOME/opencode`）

安装内容：

```text
agents/ai-team/*.md
commands/ai*.md
skills/ai-team-*/**
ai-team-install.json      # 版本/安装指纹标记
```

不会动：

- 其他 agent/command/skill；
- `opencode.json` 的 MCP/provider 配置（除非你显式 `-SetDefault`；该开关会先备份再合并 `default_agent`）。

备份规则：同名 agent/command/skill 会先移动到

```text
~/.config/opencode-backups/ai-team/<YYYYMMDD-HHmmss>/
```

该目录在 OpenCode 配置目录之外，不会被当成 agent/command/skill 扫描。

**安装后下一步**：先跑第 5 节验证，然后在任意项目输入 `/ai <目标>`。

## 3. 项目内安装

只对当前项目生效，优先级高于全局：

```bash
mkdir -p .opencode
cp -R /path/to/ai-native-team/.opencode/agents/ai-team .opencode/agents/
cp /path/to/ai-native-team/.opencode/commands/ai*.md .opencode/commands/
cp -R /path/to/ai-native-team/.opencode/skills/ai-team-* .opencode/skills/
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force .opencode\agents, .opencode\commands, .opencode\skills | Out-Null
Copy-Item -Recurse "<path-to-this-repo>\.opencode\agents\ai-team" .opencode\agents\
Copy-Item "<path-to-this-repo>\.opencode\commands\ai*.md" .opencode\commands\
Copy-Item -Recurse "<path-to-this-repo>\.opencode\skills\ai-team-*" .opencode\skills\
```

适合：固定团队规范、离线分发、项目级权限覆盖。

## 4. 设为默认 agent（可选）

全局 `~/.config/opencode/opencode.json(c)`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "ai-team/chief"
}
```

或：

```bash
node scripts/merge-default.mjs --config ~/.config/opencode/opencode.jsonc --dry-run
node scripts/merge-default.mjs --config ~/.config/opencode/opencode.jsonc
```

脚本会先备份；无法解析的 JSONC 不会修改。`~` 由脚本展开；PowerShell 也可写 `$env:USERPROFILE\.config\opencode\opencode.jsonc`。

也可以在安装时直接加 `-SetDefault`（会先备份再合并）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -SetDefault
```

不设置也可以：每次用 `/ai ...`，或在 TUI 选择 `ai-team/chief`。

## 5. 验证

### 结构验证

```bash
node scripts/verify.mjs
```

期望：

```text
checks: 195, passed: 195, failed: 0
OK: package is structurally valid.
```

退出码：`0` = 通过；`1` = 有 FAIL，按输出中的 FAIL 行修复。

### 安装验证

```bash
node scripts/verify.mjs --root ~/.config/opencode --installed
```

期望：

```text
checks: 187, passed: 187, failed: 0
OK: package is structurally valid.
```

`~` 由脚本展开；PowerShell 也可写 `$env:USERPROFILE\.config\opencode`。

加 `--opencode` 会额外调用 `opencode agent list`，确认 OpenCode 真正识别 10 个 agent（较慢，但最可靠）：

```bash
node scripts/verify.mjs --root ~/.config/opencode --installed --opencode
```

期望末尾出现：

```text
opencode lists ai-team/chief                             PASS
...
checks: 197, passed: 197, failed: 0
```

### OpenCode 识别验证

```bash
opencode agent list | Select-String "ai-team/"
```

Windows PowerShell 示例。应看到：

```text
ai-team/chief (primary)
ai-team/product-manager (subagent)
...
```

### 真实 smoke test

在一个临时项目：

```text
/ai 做一个最小的 hello world API，带单元测试和 Dockerfile
```

检查：

- `.ai-team/` 被创建；
- `state/PROJECT.md` 有目标/Track；
- 至少一个任务有证据；
- 没有越权/没有伪造；
- 没有无意义追问。

### 嵌套编排（可选）

正常用法是**顶层会话**选择 `ai-team/chief`，它可以直接调度 9 个专家（depth 1）。

如果你希望“另一个 primary agent 把 Chief 当 subagent 调用”，或让 Chief 再派生专家，需要在项目/全局 `opencode.json(c)` 提高深度：

```jsonc
{
  "experimental": {
    "subagent_depth": 3
  }
}
```

没有这个设置时，嵌套调用会返回：

```text
Subagent depth limit reached (1). Increase "experimental.subagent_depth" to allow nested subagents.
```

这是平台限制，不是团队缺陷；Chief 会如实报告 BLOCKED，不会伪造专家报告。

## 5.1 团队自身迭代（维护者）

**源真相**：`<path-to-this-repo>`（你克隆/解压的团队仓库）。

**安装产物**：`~/.config/opencode/agents|commands|skills`。

**原则**：先改源 → 验证 → 发布安装 → 验证安装产物。不要直接改全局安装副本（下次发布会覆盖）。

标准流程：

1. 修改源：
   - 角色：`.opencode/agents/ai-team/*.md`
   - 命令：`.opencode/commands/ai*.md`
   - 技能/模板：`.opencode/skills/ai-team-*/**`
2. 同步元数据：
   - `team-manifest.json`（增删角色/命令/技能时，并 bump `version`）
   - `docs/**`、`README.md`、`CHANGELOG.md`
   - 角色/命令/技能数量变化时同步 `scripts/verify.mjs` 的预期值
3. 源验证：

```bash
node scripts/verify.mjs
```

4. 一键发布（推荐）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish.ps1
```

或 Linux/macOS：

```bash
./scripts/publish.sh
```

发布脚本会依次执行：

```text
源验证 → 安装（自动备份）→ 安装后验证 + OpenCode agent 列表 → 版本校验
```

5. 版本校验：

```bash
node scripts/version.mjs --check
# 期望 exit 0 / status up-to-date
```

6. 在临时项目做一次 smoke test（`/ai` 或 `ai-team/chief`）。

**不需要全局安装的改动**：

- 只影响某个项目：改该项目的 `.opencode/**` 或 `opencode.jsonc`，项目优先级高于全局；
- `.ai-team/**` 项目记忆：属于具体项目，不安装；
- 全局 provider/model/MCP/默认 agent：直接改 `~/.config/opencode/opencode.json(c)`，不要写进团队包（除非你确实想模板化）。

**版本管理**：每次发布建议在 `CHANGELOG.md` 记一条，并 bump `team-manifest.json` 的 `version`；用 `node scripts/version.mjs --check` 确认安装产物与源一致。

## 5.2 版本管理

安装成功后会写入：

```text
~/.config/opencode/ai-team-install.json
```

字段包括：`version`、`installedAt`、`source`、`target`、`agents`、`commands`、`skills`、`sourceHash`、`installedHash`、`manifestHash`。

`sourceHash` / `installedHash` 是包内容指纹（agents + commands + skills），用于发现：

- 源内容变了但版本号没 bump；
- 已安装副本被手改/损坏；
- 上次安装不完整。

### 命令

```bash
# 查看源 vs 已安装
node scripts/version.mjs

# CI/脚本检查
node scripts/version.mjs --check
# 退出码：0=一致；1=需更新/漂移/不完整；2=未安装；3=unknown

# 更新（源验证 → 安装 → 安装后验证 → 写 marker）
# 成功后输出 RESTART REQUIRED；必须新开会话/重启 OpenCode
node scripts/version.mjs --update

# 强制重装/降级
node scripts/version.mjs --update --force

# 机器可读
node scripts/version.mjs --json

# 指定配置目录
node scripts/version.mjs --target "$env:USERPROFILE\.config\opencode" --check
```

### 状态

| 状态 | 含义 | 处理 |
|---|---|---|
| `up-to-date` | 版本与包指纹一致 | 无需操作 |
| `update-available` | 已安装版本低于源 | `--update` |
| `drift` | 版本相同但内容变了 | `--update`；维护者 bump version |
| `incomplete` | sourceHash ≠ installedHash | `--update` |
| `legacy` | 旧安装，无版本标记 | `--update` |
| `not-installed` | 目标目录没有团队文件 | `--update` |
| `installed-newer` | 已安装版本高于源 | 更新源或 `--force` 降级 |
| `unknown` | 标记损坏/缺字段 | `--update --force` |

### 发布时的版本纪律

1. 修改团队内容；
2. bump `team-manifest.json` 的 `version`（SemVer）；
3. 在 `CHANGELOG.md` 加一条；
4. `node scripts/version.mjs --update`（或 `publish.ps1`）；
5. `node scripts/version.mjs --check` 应为 0。

## 6. 升级

1. 备份当前 `.opencode`（或依赖安装器自动备份）；
2. 拉取新版本；
3. 重跑安装脚本或 `node scripts/version.mjs --update`；
4. `node scripts/verify.mjs --root ~/.config/opencode --installed`；
5. 看 `CHANGELOG.md` 的破坏性变更；
6. **新开 OpenCode 会话/重启**（旧会话可能仍使用旧权限缓存）；
7. 在临时项目 smoke test。

## 7. 卸载

删除：

```text
~/.config/opencode/agents/ai-team/
~/.config/opencode/commands/ai*.md
~/.config/opencode/skills/ai-team-*/
```

项目内删除对应 `.opencode/` 内容。

如果改过 `default_agent`，改回原值或删除该字段。

## 8. 离线/私有化

- 安装脚本纯本地复制；
- 团队不依赖任何外部服务/模型供应商；
- 模型由 OpenCode provider 配置决定；
- 技能/模板/命令全部本地；
- 构建/测试的依赖下载按项目配置镜像/离线仓库；
- 不要把密钥写入团队文件。

## 9. 安全说明

- 每个角色只有 44 条权限规则：42 条 shell（1 条 `* -> allow` + 41 条破坏性 `deny`）+ 2 条 `.env` read allow；
- 普通 shell（含 `git commit`/`push`、发布/部署）默认 `allow`，不配置 `ask`；只有破坏性命令 `deny`；
- `read`/`edit`/`task`/`subagent`/`external_directory` 没有 agent 级限制；角色边界靠 prompt、brief、review 和 checkpoint 流程约束；
- `.env`/`.env.*` 的 `read` 由 agent 规则显式 `allow`（覆盖 base ask）；`.ssh`/`.aws` 等仍由平台/OS 权限决定，不要依赖权限层隔离密钥；
- 审查者只读代码、Chief 不提交等是**流程约定**，不是权限保证；需要硬隔离时用 OS ACL 或容器只读挂载；
- 安装器不会删除无关文件；
- 仍建议在受控环境先 `-DryRun`，并检查 `git status`。

## 10. 目录对照

| 包内 | 全局安装后 |
|---|---|
| `.opencode/agents/ai-team/` | `~/.config/opencode/agents/ai-team/` |
| `.opencode/commands/ai*.md` | `~/.config/opencode/commands/` |
| `.opencode/skills/ai-team-*/` | `~/.config/opencode/skills/` |
| `team-manifest.json` | 不复制（包元数据） |
| `scripts/` | 不复制（安装/验证工具） |
