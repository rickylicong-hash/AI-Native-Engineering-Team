# RISKS — AI Native 团队源

> 一次性问题与观察项；只有 ≥2 次证据才升级为 GROWTH 提案。

| ID | 级别 | 内容 | Owner | 复查日期 | 关闭条件 |
|---|---|---|---|---|---|
| RISK-2026-11-08-R8-02 | P3 | `review-check` 命令白名单不含 `node`，纯 Node 证据可能被误判为“无命令” | build | 2026-11-23 | 加入 node/npx/tsc/vitest/jest 并加 fixture |
| RISK-2026-11-08-R8-03 | P3 | `验证预算` 为关键词匹配，堆砌关键词仍可通过 | code-reviewer / Chief | 2026-11-23 | 观察误放；必要时结构化 brief |
| RISK-2026-11-08-R8-04 | P3 | 占位符检测把省略号 `...`/`…` 当占位符，合规句可能被 fail-closed 拒绝 | build | 2026-11-23 | 观察误伤；必要时只拒绝独立占位符 token |
| RISK-2026-11-09-R7-01 | P3 | `growth-check --archive` 导航块只列本轮新归档 RETRO | build | 2026-11-23 | 归档后导航保留全部 RETRO；fixture 断言 |
| RISK-2026-11-09-R7-02 | P3 | `secret-check --fix` 对 GBK/非 UTF-8 证据按 UTF-8 重写可能破坏内容 | build | 2026-11-23 | 检测非 UTF-8 时拒绝改写并报 `encoding-unsupported` |
| RISK-2026-11-09-R7-03 | P3 | GROWTH 表格 `\|` 注入可伪造 terminal 行 | build | 2026-11-23 | 拒绝未转义 `\|` 或严格列数校验 |
| RISK-2026-11-09-R7-04 | P3 | 扫描无单文件大小/超时上限 | build | 2026-11-23 | 增加单文件上限（如 5 MiB）与总超时 |
| RISK-2026-11-09-R7-05 | P3 | 最新 RETRO 多个 `### 4`/`### 5` 表的精确回归缺失 | build | 2026-11-23 | 增加 legacy + 真实 `### 5` fixture |
| RISK-2026-11-09-R7-06 | P3 | 第三方 SCA/secret 扫描未安装 | build | 2026-11-23 | CI 安装并记录版本/退出码，或书面接受 |
| RISK-2026-11-09-R9-01 | P3 | `quality-report` 的任务类型/标题/轮次启发式可能误分类 | build | 2026-11-23 | 观察 2 个项目；补充 owner/type 字段或结构化 TASKS |
| RISK-2026-11-09-R9-02 | P3 | CI 只覆盖 GitHub Actions，其他托管平台未覆盖 | build | 2026-11-23 | 如使用 GitLab/Jenkins，补等价流水线或书面接受 |
| RISK-2026-11-09-R9-03 | P3 | `p1_escapes` 为代理指标，security/QA P1 可能重复计数 | build | 2026-11-23 | 人工核对 2 个项目报告；必要时按 P1 ID 去重 |
| RISK-2026-11-09-R9-04 | P2 | CI 使用 `actions/checkout@v4`/`setup-node@v4` 可移动 tag，未 pin 到 40 位 SHA | devops-engineer | 2026-11-23 | pin action SHA + 固定 Node patch，或书面接受 |
| RISK-2026-11-09-R9-05 | P3 | 分支保护/首次贡献者审批属仓库外设置，未验证 | build | 2026-11-23 | 在 GitHub 仓库启用并记录截图/规则 |
| RISK-2026-11-09-R10-01 | P2 | `ownership-check` 要求 brief 用反引号 glob；未强制时只能 SKIP | build | 2026-11-23 | 观察 2 个项目；必要时在 brief-lint 加可解析性检查 |
| RISK-2026-11-09-R10-02 | P3 | `ownership-check` 的 glob/路径启发式仍有边界（`..` 已归一化、ignored 路径、尺寸上限、Windows/Linux 差异、realpath/symlink） | build | 2026-11-23 | 收集误判；补 ignored/realpath/尺寸 fixture；忽略路径需 reviewer 自证 diff 来源 |
| RISK-2026-11-09-R10-03 | P3 | 离线 E2E 不覆盖真实 LLM 编排/网络/provider | build | 2026-11-23 | 有凭据时补一次真实 `/ai` smoke，或书面接受 |
| RISK-2026-11-09-R10-04 | P3 | `review-check` 只认“退出码/exit + 数字”，表格型证据会误伤；hardlink/绝对路径 glob 未覆盖 | build | 2026-11-23 | 观察误伤；必要时支持表格列或 `--exit-code-column` |

## 已关闭

| ID | 关闭日期 | 关闭证据 |
|---|---|---|
| RISK-2026-11-08-R8-01 | 2026-11-08 | 1.9.4 提交 `ec6738c` + 正式基线 `TASK-IMPROVE-2026-11-08-R8-ec6738c-1` |
