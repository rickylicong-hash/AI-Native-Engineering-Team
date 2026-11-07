---
id: java-spring
applies_to: ["Java", "Spring Boot", "Maven", "Gradle"]
scope: project-profile
version: 1
---

# Java / Spring 项目 Profile

> 只写项目级策略；通用门禁仍以 `ai-team-standards`、`ai-team-workflow` 和团队 brief 为准。

## 1. 适用条件

- JVM 服务端，Spring Boot 3.x，Maven 或 Gradle；
- 有数据库迁移、HTTP API、外部依赖或容器运行时；
- 需要把 BOM/SCA、迁移号、集成测试策略固定到项目侧。

## 2. 项目级覆盖

| 项 | 项目约定 | 证据 |
|---|---|---|
| 依赖基线 | 由项目 BOM 统一版本；CI 每次构建跑 SCA（OSV/Dependabot 等） | `logs/<date>/sca.log` |
| 迁移号 | 使用项目登记表分配；brief 先写“预订号”，冲突先改号再开工 | 迁移目录 + `DATA-MODEL.md` |
| 集成测试 | 数据库/消息依赖用 Testcontainers 或项目固定 fixture；禁止用 mock 替代被校验字段 | `target/surefire-reports`、`logs/<date>/it.log` |
| API 契约 | 契约测试与实现同批；字段变更先更新契约 | `api-contracts` + 契约测试报告 |
| 构建隔离 | 同一工作区同一时间只跑一个 `mvn`/`gradle`；并行任务用独立 worktree | CI 日志/任务记录 |

## 3. 门禁

进入 G4/G5 前：

- `mvn -B verify` 或 `./gradlew check` 通过，退出码 0；
- SCA 0 个未处置 Critical/High；例外写入项目 `RISKS.md`，有 owner 和复查日期；
- 迁移号已登记且不与已合并迁移冲突；
- 运行时能力（容器、数据库、外部服务）有真实命令 + 退出码，单测全绿不能替代；
- 契约测试与实现同一提交，或明确记录差异与批准人。

## 4. 证据

- 构建日志：`logs/<date>/TASK-<id>-<step>.log`；
- 失败日志：`*.failed.log`，保留原始错误；
- 证据编码 UTF-8；根目录 `logs/*.log` 与 UTF-16 判失败；
- 报告引用命令、退出码、时间戳，不引用“应该通过”。

## 5. 裁剪

- 无数据库的项目可关闭迁移号项，由 `system-architect` 在项目 `DECISIONS.md` 记录；
- 无容器运行时的项目可关闭容器取证项，但必须写“不适用（无容器/外部依赖）”；
- 裁剪不改变团队 core 的通用门禁。

## 6. 复查

- 触发：Spring Boot 主版本升级、BOM 策略变化、数据库迁移工具更换、CI provider 更换；
- Owner：`ai-team/system-architect` + `ai-team/devops-engineer`；
- 复查日期：项目下一次 G5 前。
