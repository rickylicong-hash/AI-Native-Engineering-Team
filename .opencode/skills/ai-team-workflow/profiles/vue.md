---
id: vue
applies_to: ["Vue 3", "TypeScript", "Vite"]
scope: project-profile
version: 1
---

# Vue 3 项目 Profile

> 只写项目级策略；通用门禁仍以 `ai-team-standards`、`ai-team-workflow` 和团队 brief 为准。

## 1. 适用条件

- Vue 3 + TypeScript + Vite（或同类构建器）；
- 有组件测试、E2E、可访问性或包体积要求；
- 前端需要与后端 API 契约、mock 边界、浏览器兼容策略对齐。

## 2. 项目级覆盖

| 项 | 项目约定 | 证据 |
|---|---|---|
| 类型/静态检查 | `vue-tsc`/`tsc --noEmit` + ESLint 在 CI 必跑 | `logs/<date>/typecheck.log` |
| 组件测试 | Vitest/组件测试覆盖关键交互；断言用户可见行为，不断言实现细节 | 测试报告 |
| E2E | Playwright/Cypress 跑关键旅程；失败保留 trace/screenshot | `logs/<date>/e2e/` |
| API 边界 | mock 只用于外部不可控依赖；被校验字段不得 mock 掉 | 测试代码 + 契约测试 |
| 包体积 | 项目设定预算；超出预算需 owner 批准并记录 | 构建报告 |
| 可访问性 | 关键页面跑 axe 或等价检查；阻断项按项目标准处理 | a11y 报告 |

## 3. 门禁

进入 G4/G5 前：

- 类型检查、lint、单元/组件测试全部退出码 0；
- E2E 关键旅程通过，或有书面例外 + owner + 复查日期；
- 前端使用的 API 字段与契约一致；契约变更同一提交更新；
- 可访问性阻断项为 0，或已登记 `RISKS.md`；
- 真实浏览器/运行时能力有命令 + 退出码，不接受只看截图。

## 4. 证据

- 构建/类型检查：`logs/<date>/TASK-<id>-<step>.log`；
- E2E：`logs/<date>/e2e/` 下的 trace、截图、HTML 报告；
- 证据编码 UTF-8；根目录 `logs/*.log` 与 UTF-16 判失败；
- 报告引用命令、退出码、浏览器/Node 版本。

## 5. 裁剪

- 纯内部工具可关闭 a11y 项，由 `ux-designer` + 用户批准；
- 无 E2E 环境的项目写 `BLOCKED` + 原始错误，不得用组件测试替代关键旅程；
- 裁剪不改变团队 core 的通用门禁。

## 6. 复查

- 触发：Vue/Vite 主版本升级、测试框架更换、浏览器支持矩阵变化；
- Owner：`ai-team/ux-designer` + `ai-team/qa-engineer`；
- 复查日期：项目下一次 G5 前。
