# SPIKE-0001 文档覆盖度评审：安装 → 启动 → 验证

> **历史 smoke-test 产物。** 本文由 `ai-team/technical-writer` 在 2026-11-04 的受控端到端测试中产出，用于证明团队能独立评审并给出文件:行号证据。文中行号对应测试时的文档版本；它指出的 5 个问题已在当前版本修复，详见 `docs/VERIFICATION.md`。保留原文是为了展示真实输出，而不是作为当前文档状态的依据。

| 项 | 值 |
|---|---|
| 任务 | TASK-0001 |
| 角色 | ai-team/technical-writer |
| Track / 阶段 | T0 Spike / G0 已通过 |
| 评审对象 | `README.md`（303 行）、`INSTALL.md`（193 行） |
| 评审日期 | 2026-11-04 |
| 评审方式 | 静态全文阅读 + 只读命令验证 |
| 总体结论 | **部分（Partial）** |

## 1. 范围与方法

### 1.1 范围

本次只回答三个问题：

- (a) 全局安装是否清晰；
- (b) 一句话入口是否清晰、可发现；
- (c) 安装后如何验证是否清晰、可执行。

同时核对 README 与 INSTALL 在安装目标、安装内容、`verify.mjs` 参数上是否互相矛盾。

**不在范围**：修复文档、修改安装脚本、执行安装、执行 `/ai` 端到端 smoke test、评价代码质量。

### 1.2 方法

1. 完整读取 `README.md`（1–303 行）与 `INSTALL.md`（1–193 行）。
2. 交叉读取只读依赖：`scripts/verify.mjs`、`scripts/install.ps1`、`scripts/install.sh`、`scripts/merge-default.mjs`、`.opencode/agents/ai-team/` 目录、`.opencode/commands/` 目录、`docs/TROUBLESHOOTING.md`、`docs/CUSTOMIZATION.md`。
3. 执行只读验证命令（见 1.3）；**未执行** `install.ps1` / `install.sh` / `merge-default.mjs`，未修改任何配置或文档。
4. 判定口径：
   - `covered`：步骤、成功标准齐全，按文档可复现；
   - `partial`：主体存在，但缺少关键要素或按文档不能可靠复现；
   - `missing`：没有对应内容。

### 1.3 实际执行的命令

| # | 命令 | 退出码 | 关键结果 |
|---|---|---|---|
| 1 | `node --version` | 0 | `v24.15.0` |
| 2 | `node scripts/verify.mjs` | **1** | `checks: 181, passed: 179, failed: 2`；错误：`agent count: expected 10, found 11`、`agent ai-team/chief-smoke in manifest` |
| 3 | `node scripts/verify.mjs --root "$env:USERPROFILE\.config\opencode" --installed` | 0 | `checks: 174, passed: 174, failed: 0`；`OK: package is structurally valid.` |
| 4 | `node scripts/verify.mjs --root ~/.config/opencode --installed` | **1** | `root: D:\Documents\AI Native\~\.config\opencode`；`checks: 8, passed: 3, failed: 5` |
| 5 | `node -e "...path.resolve(process.argv[1])" "~/.config/opencode"` | 0 | 解析为 `D:\Documents\AI Native\~\.config\opencode` |
| 6 | `opencode --version` | 0 | `0.0.0-dev-202610161232` |
| 7 | `opencode agent list \| Select-String "ai-team/"` | 0 | 列出 11 个 `ai-team/*`，含 `ai-team/chief (primary)`、`ai-team/chief-smoke (all)` |
| 8 | `Test-Path "$env:USERPROFILE\.config\opencode"` | n/a | `True`（本机已有全局安装） |

说明：测试 #4 未加 `--opencode`，因为该 flag 只追加 OpenCode CLI 检查，不影响 `--root` 解析（`scripts/verify.mjs:26-28`、`319-333`）。

> 环境：Windows + PowerShell，Node `v24.15.0`，OpenCode CLI `0.0.0-dev-202610161232`。本会话 `shell` 可用；未伪造任何命令输出。安装脚本按约束未执行。

### 1.4 未执行项与原因

- 未执行 `scripts/install.ps1` / `scripts/install.sh`：任务约束“不执行安装脚本”。
- 未执行 `scripts/merge-default.mjs`：会改配置，超出只读范围。
- 未执行 `/ai ...` 交互式 smoke test：需要 OpenCode 会话内交互，且会创建 `.ai-team/` 状态；本次只做文档评审。
- 未执行 OpenCode 写操作；仅执行 `opencode --version` 与 `opencode agent list` 两个只读命令。

## 2. 三项判定

### (a) 全局安装 — `covered`

**证据**

- `README.md:147-174`：独立“安装”章节；`README.md:149` 明确“全局安装（推荐，任何项目可用）”；`README.md:153-156` Windows 命令；`README.md:160-163` Linux/macOS 命令；`README.md:165-172` 安装目标 `~/.config/opencode/` 及三类文件；`README.md:174` 同名备份说明。
- `INSTALL.md:10-47`：独立“全局安装（推荐）”章节；`INSTALL.md:16-17` / `25-26` 先 dry-run 再安装；`INSTALL.md:29-32` 分平台安装目标（含 `XDG_CONFIG_HOME`）；`INSTALL.md:34-40` 安装内容；`INSTALL.md:42-45` 明确“不会动”的范围；`INSTALL.md:47` 备份规则。
- `INSTALL.md:3-8` 给出前置条件（OpenCode V2、PowerShell 5.1+/Bash、目录可写、离线可装）。

**判定理由**：安装来源、目标目录、复制内容、dry-run、备份、前置条件均有明确说明；两份文档在安装目标与内容上一致。按“文档完整性”判为 covered。

**不影响判定的不足**（详见第 3 节）：

- Windows 命令硬编码 `D:\Documents\AI Native`（`README.md:154`、`INSTALL.md:15`），换机器/换克隆目录不可直接复制。
- 没有“如何获取仓库”的步骤；`INSTALL.md:3-8` 只列环境前置，`README.md:147-154` 的第一条命令直接是 `cd`。
- `README.md:155` 直接安装，未像 `INSTALL.md:16` 那样先给 `-DryRun`。

### (b) 一句话入口 — `covered`

**证据**

- `README.md:10-16`：第一节即“一句话启动”，给出 `/ai 做一个支持多人协作的周报工具，...` 示例。
- `README.md:99`：命令表将 `/ai <目标>` 标为“一句话启动完整流程（主入口）”。
- `README.md:111`：所有命令默认进入 `ai-team/chief`；`README.md:286` 明确“`/ai` 只是最短入口”。
- `INSTALL.md:91`：“不设置也可以：每次用 `/ai ...`，或在 TUI 选择 `ai-team/chief`。”
- `INSTALL.md:132-134`：smoke test 直接给出 `/ai 做一个最小的 hello world API，带单元测试和 Dockerfile`。
- 辅助证据：`.opencode/commands/` 下存在 11 个 `ai*.md`（含 `ai.md`）；`node scripts/verify.mjs` 对 `command /ai` 的检查全部 PASS；`opencode agent list` 能列出 `ai-team/chief (primary)`。

**判定理由**：README 把 `/ai` 放在首屏第一节，INSTALL 也两次给出 `/ai` 用法；新用户读完 INSTALL 可以知道下一步输入 `/ai <目标>`。判为 covered。

**可发现性弱点**（低严重度，见第 3 节第 5 条）：`INSTALL.md` 没有在全局安装章节后立即给出“下一步”；首次 `/ai` 出现在可选配置节（`INSTALL.md:91`），smoke test 在验证节末尾（`INSTALL.md:128-134`）。

### (c) 验证 — `partial`

**证据**

- `README.md:206-211`：只有两条命令，没有期望输出、退出码含义、package/installed 模式区别，也没有 smoke test。
- `INSTALL.md:93-142`：验证分四层：
  - 结构验证 `INSTALL.md:95-106`，期望 `checks: 174+, passed: ..., failed: 0` 与 `OK: package is structurally valid.`；
  - 安装验证 `INSTALL.md:108-112`；
  - OpenCode 识别验证 `INSTALL.md:114-126`，期望看到 `ai-team/chief (primary)` 等；
  - 真实 smoke test `INSTALL.md:128-142`，列出 5 项检查。
- 实际执行 `node scripts/verify.mjs`（`README.md:209` / `INSTALL.md:98`）：**退出码 1**，`checks: 181, passed: 179, failed: 2`，与 `INSTALL.md:103-106` 的期望不符。
- 失败原因：`.opencode/agents/ai-team/chief-smoke.md:2-3` 是“SMOKE TEST ONLY — temporary copy of Chief with mode all”的临时 agent；`team-manifest.json` 未登记它。安装脚本会整目录复制 `agents/ai-team`（`scripts/install.ps1:75-78`、`scripts/install.sh:50-52`），因此**从当前源码新装**会把该文件带入全局目录，进而使 `--installed` 验证也可能出现 11 个 agent（推断，未执行安装验证）。
- 反证：把路径展开后执行 `node scripts/verify.mjs --root "$env:USERPROFILE\.config\opencode" --installed`，**退出码 0**，`checks: 174, passed: 174, failed: 0`。说明验证脚本本身可用，问题在源码状态与文档路径写法。
- Windows 路径问题：按 `README.md:210` / `INSTALL.md:111` 原样执行 `--root ~/.config/opencode`，PowerShell 不展开 `~`；实际 root 为 `D:\Documents\AI Native\~\.config\opencode`，**退出码 1**，`checks: 8, passed: 3, failed: 5`。`scripts/verify.mjs:26` 使用 `path.resolve`，不会做 tilde 展开。
- `INSTALL.md:117` 的 `opencode agent list` 步骤实际退出码 0，能看到 `ai-team/chief (primary)` 等；本仓库内因本地 `.opencode` 额外出现 `ai-team/chief-smoke (all)`，与 `INSTALL.md:120-126` 的示例不完全一致（示例用 `...` 省略，故不是直接矛盾）。

**判定理由**：验证“有文档”，但按文档执行不能可靠得到成功结果：主验证命令在当前源码退出 1；Windows 安装验证命令因 `~` 解析错误退出 1；README 单独阅读还没有成功标准。因此判为 **partial**，而非 covered。

## 3. 一致性 / 缺口

### 3.1 README 与 INSTALL 的直接一致性

| 项目 | README | INSTALL | 判定 |
|---|---|---|---|
| 全局安装目标 | `README.md:168` `~/.config/opencode/` | `INSTALL.md:31-32` `%USERPROFILE%\.config\opencode` / `~/.config/opencode`（含 XDG） | 一致；INSTALL 更精确 |
| 安装内容 | `README.md:169-171` agents/commands/skills | `INSTALL.md:37-39` 同三类 | 一致 |
| 基础结构验证 | `README.md:209` `node scripts/verify.mjs` | `INSTALL.md:98` 同一命令 | 一致 |
| 安装后验证 | `README.md:210` `--root ~/.config/opencode --installed --opencode` | `INSTALL.md:111` `--root ~/.config/opencode --installed` | 不矛盾；README 多一个 `--opencode` 增强检查 |
| Windows 源路径 | `README.md:154` `D:\Documents\AI Native` | `INSTALL.md:15`、`64-66` 同一路径 | 一致地硬编码，均不可移植 |

**结论**：README 与 INSTALL 在安装目标、安装内容、verify 命令上**没有直接矛盾**。问题集中在两者共同依赖的 Windows `~` 写法、当前源码状态，以及 README 缺少成功标准。

### 3.2 按严重度排序的发现（5 条）

1. **高 — `chief-smoke.md` 使文档化的结构验证失败，并可能污染新安装。**
   - 证据：`README.md:209`、`INSTALL.md:98`、`INSTALL.md:101-106`；`README.md:267` 写明“10 个角色”；`.opencode/agents/ai-team/chief-smoke.md:2-3`；`scripts/install.ps1:75-78`、`scripts/install.sh:50-52`。
   - 实测：退出码 1，`checks: 181, passed: 179, failed: 2`；错误为 `agent count: expected 10, found 11` 与 `agent ai-team/chief-smoke in manifest`。
   - 影响：新用户按 `INSTALL.md:101-106` 期望 `failed: 0`，实际看到失败；若从当前源码安装，整目录复制会把 `chief-smoke.md` 带入全局目录，`--installed` 验证也可能失败（推断，未执行安装）。
   - 归属：这是源码/安装包状态问题，不是文档能单独修复的；需工程师确认该文件是否为其他任务的临时 smoke fixture。

2. **高 — Windows PowerShell 中 `--root ~/.config/opencode` 不会展开 `~`，按文档原样执行验证会失败。**
   - 证据：`README.md:210`、`INSTALL.md:111`；`README.md:208` / `INSTALL.md:97` 将验证代码块标为 `bash`，未给 PowerShell 版本；`scripts/verify.mjs:26` 使用 `path.resolve`。
   - 实测：原样执行退出码 1，root 解析为 `D:\Documents\AI Native\~\.config\opencode`，`checks: 8, passed: 3, failed: 5`；换成 `$env:USERPROFILE\.config\opencode` 后退出码 0，`174/174`。
   - 影响：Windows 是文档明确支持的一等平台（`INSTALL.md:6`、`README.md:151-156`），但安装后的验证步骤在 Windows PowerShell 中不可直接复制。
   - 同类写法：`README.md:201`、`INSTALL.md:85-86`（`merge-default.mjs --config ~/...`）有同样问题，`scripts/merge-default.mjs:30` 同样使用 `path.resolve`；`docs/TROUBLESHOOTING.md:31`、`docs/TROUBLESHOOTING.md:192`、`docs/CUSTOMIZATION.md:180` 也复用了该写法（交叉参考，非本次评审对象）。

3. **中 — README 的验证章节只有命令，没有成功标准。**
   - 证据：`README.md:206-211`；对照 `INSTALL.md:101-106`、`120-126`、`136-142`。
   - 缺口：缺少期望输出、退出码含义、package/installed 模式区别、smoke test 检查项。
   - 影响：只读 README 的用户可以“跑命令”，但无法判断结果是否正常；这与 `README.md:222` 自己强调的“没有命令、退出码、输出和文件路径的‘完成’不算完成”不一致。

4. **中 — Windows 安装命令硬编码 `D:\Documents\AI Native`，且缺少“获取仓库”前置步骤。**
   - 证据：`README.md:154`、`INSTALL.md:15`、`INSTALL.md:64-66`；对照 Linux 占位符 `README.md:161`、`INSTALL.md:23`。
   - 缺口：`INSTALL.md:3-8` 的前置条件没有“克隆/下载仓库”；用户克隆到其他目录后，Windows 命令不能直接复制。
   - 影响：降低首次安装成功率，尤其对非作者机器。

5. **低 — INSTALL 中“一句话入口”的可发现性弱。**
   - 证据：`INSTALL.md:91` 首次出现 `/ai`，位于“设为默认 agent（可选）”节；`INSTALL.md:132-134` 的 smoke test 位于验证节最后；全局安装节 `INSTALL.md:10-47` 结束后没有“下一步”提示。
   - 缓解：安装脚本会打印下一步（`scripts/install.ps1:141-144`、`scripts/install.sh:80`）；README 首节 `README.md:10-16` 很醒目。
   - 影响：只读 INSTALL 且在安装后停下的用户，可能不知道立即输入 `/ai <目标>`。

## 4. 总体结论

**部分（Partial）**：文档足以让新用户完成“安装 → 启动”，但不足以稳定完成“验证”。

- 安装：`covered`。步骤、目标、内容、备份、dry-run 都有；缺“获取仓库”和可移植路径。
- 启动：`covered`。`/ai <目标>` 在 README 首节和 INSTALL 中均可发现；命令文件存在。
- 验证：`partial`。INSTALL 的四层验证设计完整，但主验证命令在当前源码退出 1，Windows 安装验证命令按原样执行也退出 1；README 单独阅读没有成功标准。

因此，新用户可能顺利装好并启动，却在“验证”一步看到失败输出，从而误判安装失败。**闭环未完全成立**。

## 5. 建议（仅建议，未执行）

按优先级：

1. **先处理源码状态**：由工程师/Chief 确认 `.opencode/agents/ai-team/chief-smoke.md` 是否为临时 smoke fixture；若是，移出安装目录，或让安装脚本排除该文件，并重跑 `node scripts/verify.mjs`，使 `INSTALL.md:101-106` 的期望重新成立。
2. **修 Windows 验证路径**：将 `README.md:210`、`INSTALL.md:111`、`README.md:201`、`INSTALL.md:85-86` 的 `~/.config/opencode` 改为 PowerShell 可用的 `$env:USERPROFILE\.config\opencode`，并同时给 bash 版本。
3. **给 README 补成功标准**：在 `README.md:206-211` 增加期望输出片段、退出码 0/1 含义，并链接到 `INSTALL.md:93-142`。
4. **去掉硬编码路径 / 补获取步骤**：`README.md:154`、`INSTALL.md:15`、`INSTALL.md:64-66` 改用 `<path-to-repo>` 或 `$PWD`；`INSTALL.md:3-8` 增加“获取仓库”前置。
5. **INSTALL 增加“安装后下一步”**：在 `INSTALL.md:47` 之后加 3 行 callout：`/ai <目标>`、验证命令、失败时看 `docs/TROUBLESHOOTING.md`。

## 6. 未决 / 需确认

- `chief-smoke.md` 的归属：是临时测试产物还是有意保留？若保留，`verify.mjs` 的“10 agents”预期和 `team-manifest.json` 需要同步；若移除，是否影响其他正在进行的 smoke test？
- Windows 是否为一等支持平台？文档写的是（`INSTALL.md:6`），但验证示例没有 PowerShell 版本。
- `--opencode` 参数是否需要在文档中解释？`scripts/verify.mjs:9` 有定义，README/INSTALL 均未说明其作用（会调用 `opencode agent list`，可能较慢）。
- 备份命名的细节：`INSTALL.md:47` 说 `.bak-YYYYMMDD-HHmmss`，但命令文件实际备份到 `commands/.backup-<stamp>/`（`scripts/install.ps1:88-91`、`scripts/install.sh:56-61`）。不影响本次三项判定，建议后续文档任务核对。

## 附录 A：证据索引（文件:行号）

| 结论 | 证据 |
|---|---|
| (a) 全局安装 | `README.md:147-174`；`INSTALL.md:10-47`；前置 `INSTALL.md:3-8` |
| (b) 一句话入口 | `README.md:10-16`、`README.md:99`、`README.md:111`、`README.md:286`；`INSTALL.md:91`、`INSTALL.md:132-134` |
| (c) 验证 | `README.md:206-211`；`INSTALL.md:93-142`；失败期望 `INSTALL.md:101-106` |
| 验证失败 | 命令输出（1.3 #2）；`.opencode/agents/ai-team/chief-smoke.md:2-3`；`scripts/install.ps1:75-78` |
| Windows `~` | `README.md:210`；`INSTALL.md:111`；`scripts/verify.mjs:26`；命令输出（1.3 #4/#5） |
| 硬编码路径 | `README.md:154`；`INSTALL.md:15`、`INSTALL.md:64-66` |
| 入口可发现性 | `INSTALL.md:91`、`INSTALL.md:128-134`；安装器输出 `scripts/install.ps1:141-144`、`scripts/install.sh:80` |
