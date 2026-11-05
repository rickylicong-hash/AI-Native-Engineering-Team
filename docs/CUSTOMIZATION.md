# 定制手册（CUSTOMIZATION）

团队是 Markdown + YAML frontmatter，所有内容都可改。改完跑 `node scripts/verify.mjs`，并在一个临时项目做 smoke test。

## 1. 给角色指定模型

默认 subagent 继承当前会话模型。需要差异化时，在 agent frontmatter 加：

```yaml
---
description: ...
mode: subagent
model: provider/model-id#variant
---
```

建议（按能力/成本，不是硬性）：

| 角色 | 建议模型特征 |
|---|---|
| Chief | 强规划/长上下文/工具调用稳定 |
| PM / UX | 强写作/结构化/共情 |
| Architect | 强推理/系统设计 |
| Engineer | 强代码/工具调用/大上下文 |
| Reviewer / Security | 强分析/谨慎/低温度 |
| QA | 强代码/测试设计 |
| DevOps | 强脚本/云原生 |
| Writer | 强写作/一致性 |

不要硬编码一个用户没有的模型；先在 `opencode models` 里确认。

## 2. 增加角色

1. 新建 `.opencode/agents/ai-team/<role>.md`；
2. frontmatter：`description`、`mode: subagent`、`color`、`permissions`；
3. 复制现有角色的权限块，按新角色调整写范围；
4. 在 `team-manifest.json` 的 `agents` 加条目；
5. 在 `chief.md` 的名册/调度矩阵加一行；
6. 在 `docs/TEAM.md` 角色卡加一节；
7. 跑 `node scripts/verify.mjs`（agent 计数会变更，需同步验证脚本预期）；
8. 做一次真实任务 smoke test。

原则：**先问“现有角色是否已覆盖”**；能扩展现有角色就不新增。

## 3. 删除/停用角色

- 删除或重命名 agent 文件；
- 从 manifest、chief 名册、docs 移除；
- 检查命令/其他角色是否引用该 ID；
- 跑验证。

不建议用 `disabled: true` 处理自定义角色（那是给内置 agent 用的）；直接移除文件更清晰。

## 4. 调整权限

权限是**有序规则，最后匹配生效**。常用模式：

```yaml
permissions:
  - action: "*"            # 先宽
    resource: "*"
    effect: allow
  - action: edit           # 再收紧
    resource: "*"
    effect: deny
  - action: edit
    resource: ".ai-team/product/*"
    effect: allow
```

注意：

- `*` 必须加引号（YAML alias）；
- 路径匹配是整路径，`*` 可跨 `/`；Windows 反斜杠会归一化；
- shell 规则匹配原始命令文本；1.5.0 Shell-first strict 下只有破坏性命令 deny；
- 最后匹配生效；破坏性 deny 放在 allow 后面；
- 不要给审查者 `edit` 源码权限；
- `.env`/密钥的 `read` 工具权限仍 deny，但 shell 不再拦截。

## 5. 项目级覆盖

在项目 `.opencode/opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "agents": {
    "ai-team/engineer": {
      "permissions": [
        { "action": "shell", "resource": "docker compose down -v *", "effect": "deny" }
      ]
    }
  }
}
```

Shell-first strict 下 shell 已默认 allow；项目级通常用于**新增破坏性命令 deny**，而不是补 allow。项目规则会追加在全局/agent 规则之后，可覆盖为更具体的行为。`.env` 的 `read` 工具限制仍在；shell 不再拦截。

## 6. 修改流程/门禁

- 流程：`.opencode/skills/ai-team-workflow/SKILL.md`；
- 门禁清单：`.opencode/skills/ai-team-standards/references/QUALITY-GATES.md`；
- 角色职责：对应 agent `.md`；
- 命令：`.opencode/commands/ai*.md`；
- 模板：`.opencode/skills/ai-team-workflow/templates/`。

改流程时同步更新：

1. `docs/WORKFLOW.md`；
2. `chief.md` 的门禁表；
3. manifest 的 tracks（如变）；
4. 验证脚本的预期数量/字段。

## 7. 修改命令

命令是 Markdown + frontmatter：

```md
---
description: ...
agent: ai-team/chief
---

$ARGUMENTS
```

- `agent` 必须是存在的 agent ID；
- `$ARGUMENTS` 接收完整参数；`$1/$2` 接收位置参数；
- `!` 反引号 shell 块会在命令展开时执行，**不要放不可信参数**；
- 命令默认在当前会话执行；`subagent: true` 可后台跑。

## 8. 增加技能

```text
.opencode/skills/<id>/SKILL.md
.opencode/skills/<id>/references/*.md
.opencode/skills/<id>/templates/*
```

frontmatter 至少：

```yaml
---
name: ...
description: ...
---
```

描述要写“何时使用”，否则模型不会发现。技能 ID 由目录名决定，建议 `ai-team-*` 前缀避免冲突。

## 9. 修改语言

- agent 提示词默认中文，要求“使用用户语言”；
- 产物模板中文；可翻译为英文；
- 代码/命令/标识符保持英文；
- 代码注释默认中文；项目明确要求英文时，由 Chief 在任务 brief 记录 `DEC-*` 覆盖，不改全局规则；
- 如需纯英文团队，批量翻译 `.opencode/**` 与 docs，保留 ID/路径不变。

## 10. 离线/私有化

- 安装脚本只复制本地文件，不需要网络；
- 模型通过 OpenCode provider 配置，团队不绑定供应商；
- 技能/模板全部本地；
- 依赖安装/构建可能需要网络，按项目配置镜像/离线仓库；
- 不要把密钥写进 agent/技能/命令。

## 11. 团队进化

1. 复盘写 `.ai-team/team/GROWTH.md`；首次在第 10 个 `done` 任务时创建，之后每 10 个、T3/T4 进入 G5/G7/G8 前、事故后追加；
2. 提案：证据（≥2 次）、影响、最小改动、验收指标；
3. 安全/架构审计；
4. 用户批准；
5. 授权方修改 `.opencode/**`；
6. bump `team-manifest.json` 的 `version` + 更新 `CHANGELOG.md`；
7. 发布：`node scripts/version.mjs --update`（或 `publish.ps1` / `publish.sh`）；
8. 版本校验：`node scripts/version.mjs --check` 应为 0；
9. 在临时项目做 smoke test。

## 12. 嵌套编排（可选）

正常用法是顶层会话选择 `ai-team/chief`，Chief 直接调度专家，不需要嵌套。

如果你希望把 Chief 作为 subagent 调用（例如另一个 primary agent 委派整支团队），需要提高深度：

```jsonc
{
  "experimental": {
    "subagent_depth": 3
  }
}
```

否则会报：

```text
Subagent depth limit reached (1). Increase "experimental.subagent_depth" to allow nested subagents.
```

这是平台限制。深度不足时 Chief 必须报 `BLOCKED`，不能代写专家报告。

## 13. 改完后的检查

推荐一键发布（源验证 → 安装 → 安装后验证）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish.ps1
```

或手动：

```bash
node scripts/verify.mjs
node scripts/verify.mjs --root ~/.config/opencode --installed --opencode
```

只改某个项目时，不需要全局发布：直接改该项目的 `.opencode/**` 或 `opencode.jsonc`，项目级优先级高于全局。

再在一个临时项目：

```text
/ai 做一个最小的 hello world API，带测试和 Dockerfile
```

检查：

- 是否创建 `.ai-team/`；
- 是否按 Track 调度；
- 是否有证据；
- 是否没有越权；
- 是否没有问你无意义的问题。
