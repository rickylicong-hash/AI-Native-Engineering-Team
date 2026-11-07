# 项目 Profile 示例

> 目的：把**单项目策略**留在项目侧，团队核心保持通用、可分享。1.9.0 起，单项目特例不再写进团队 `GROWTH.md` 的 `TEAM-CORE`。

## 1. 什么时候用 Profile

| 现象 | 归属 |
|---|---|
| 跨项目复用的脚本/模板缺陷、通用门禁 | `TEAM-CORE`（团队源） |
| 迁移号规则、worktree 合并、CI BOM、状态格式、VEX 例外 | `PROJECT-PROFILE`（项目 profile） |
| 一次性现象 | `OBSERVE`（项目 `RISKS.md` + 复查日期） |

Profile 不是新角色，也不是新命令；它是一份项目侧约定，供 `engineer`/`reviewer`/`qa-engineer`/`devops-engineer` 在 brief 和门禁中引用。

## 2. 文件格式

每个 profile 使用 Markdown，建议 frontmatter：

```yaml
---
id: <kebab-case>
applies_to: ["<stack/framework>"]
scope: project-profile
version: 1
---
```

正文至少包含：

- **适用条件**：什么项目/技术栈使用；
- **项目级覆盖**：迁移号、worktree、CI、状态格式、例外；
- **门禁**：进入 G4/G5/G6 前必须跑什么；
- **证据**：日志/报告位置与格式；
- **裁剪**：哪些项可关闭、由谁批准；
- **复查**：触发点与 owner。

## 3. 内置示例

| Profile | 适用 |
|---|---|
| `java-spring.md` | Java + Spring Boot + Maven/Gradle 服务端 |
| `vue.md` | Vue 3 + TypeScript + Vite 前端 |
| `strict-security.md` | 受监管/高风险项目，需更严格的供应链与发布门禁 |

## 4. 使用方式

1. 新项目初始化时读本目录，选择一个或多个 profile；
2. 在项目 `.ai-team/state/PROJECT.md` 或 `DECISIONS.md` 记录：`profile: java-spring`、覆盖项、owner、复查日期；
3. 在 brief 的“约束/必须执行”中引用 profile 条目，不复制团队核心规则；
4. 项目 checkpoint 前跑 profile 要求的门禁，把证据放到 `logs/<date>/` 或 `.ai-team/work/<TASK>-logs/`；
5. 如果某个策略在 **≥2 个项目** 重复出现，再按 `TEAM-CORE` 提提案，不在项目 profile 里复制团队规则。

## 5. 规则

- 团队核心不写项目名、项目路径、迁移号、内部版本号、租户默认值；
- 项目 profile 可以写项目值，但不回写团队源；
- Profile 变更按项目 `DOCS-ONLY`/`PATCH` 处理，不单独发团队版本；
- 没有验收方式或复查日期的 profile 条目视为未完成。

## 6. 维护

- 新示例必须通过 `node scripts/verify.mjs` 与 `audit-team-consistency.mjs`；
- profile 内容不得包含真实凭据、生产地址、租户 ID；
- 每季度或团队 minor 版本时复查一次示例是否仍与团队门禁一致。
