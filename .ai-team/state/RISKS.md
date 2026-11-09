# RISKS — AI Native 团队源

> 一次性问题与观察项；只有 ≥2 次证据才升级为 GROWTH 提案。

| ID | 级别 | 内容 | Owner | 复查日期 | 关闭条件 |
|---|---|---|---|---|---|
| RISK-2026-11-08-R8-03 | P3 | `验证预算` 为关键词匹配，堆砌关键词仍可通过 | code-reviewer / Chief | 2026-11-23 | 观察误放；必要时结构化 brief |
| RISK-2026-11-08-R8-04 | P3 | 占位符检测把省略号 `...`/`…` 当占位符，合规句可能被 fail-closed 拒绝 | build | 2026-11-23 | 观察误伤；必要时只拒绝独立占位符 token |
| RISK-2026-11-09-R7-06 | P3 | 第三方 SCA/secret 扫描未安装（gitleaks/semgrep/trivy/osv-scanner）；接受人：用户 2026-11-09；范围：本机 + 当前 CI action 已 pin；当前由本地 `secret-check` + `artifact-check` 覆盖 | build | 2026-11-23 | CI 安装并记录版本/退出码，或书面继续接受；接受不豁免 P0/P1 |
| RISK-2026-11-09-R9-01 | P3 | `quality-report` 的任务类型/标题/轮次启发式可能误分类 | build | 2026-11-23 | 观察 2 个项目；补充 owner/type 字段或结构化 TASKS |
| RISK-2026-11-09-R9-02 | P3 | CI 只覆盖 GitHub Actions，其他托管平台未覆盖 | build | 2026-11-23 | 如使用 GitLab/Jenkins，补等价流水线或书面接受 |
| RISK-2026-11-09-R9-03 | P3 | `p1_escapes` 为代理指标，security/QA P1 可能重复计数 | build | 2026-11-23 | 人工核对 2 个项目报告；必要时按 P1 ID 去重 |
| RISK-2026-11-09-R9-05 | P3 | 分支保护/首次贡献者审批属仓库外设置，未验证 | build | 2026-11-23 | 在 GitHub 仓库启用并记录截图/规则 |
| RISK-2026-11-09-R10-01 | P2 | `ownership-check` 要求 brief 用反引号 glob；未强制时只能 SKIP | build | 2026-11-23 | 观察 2 个项目；必要时在 brief-lint 加可解析性检查 |
| RISK-2026-11-09-R10-02 | P3 | `ownership-check` 的 glob/路径启发式仍有边界（`..` 已归一化、ignored 路径、尺寸上限、Windows/Linux 差异、realpath/symlink） | build | 2026-11-23 | 收集误判；补 ignored/realpath/尺寸 fixture；忽略路径需 reviewer 自证 diff 来源 |
| RISK-2026-11-09-R10-03 | P3 | 离线 E2E 不覆盖真实 LLM 编排/网络/provider | build | 2026-11-23 | 有凭据时补一次真实 `/ai` smoke，或书面接受 |
| RISK-2026-11-09-R10-04 | P3 | `review-check` 只认“退出码/exit + 数字”，表格型证据会误伤；hardlink/绝对路径 glob 未覆盖 | build | 2026-11-23 | 观察误伤；必要时支持表格列或 `--exit-code-column` |
| RISK-2026-11-09-R11-01 | P3 | `growth-check --archive` 跨年归档导航可能把旧 RETRO 指向当前年份 archive（errors 前 exit 已修） | build | 2026-11-23 | 保留旧导航行或记录 `team/archive` 无年份；补跨年 fixture |
| RISK-2026-11-09-R11-02 | P3 | `multi-table-retro` 只有正向用例，缺“多表索引不一致”负向 | build | 2026-11-23 | 增加 legacy + `### 5` mismatch fixture |
| RISK-2026-11-09-R11-03 | P3 | HAR/JSONL 中 `Authorization`/Cookie 的 JSON 键未被启发式识别；>5 MiB 只阻断不扫描 | build | 2026-11-23 | 增加 JSON key 扫描或明确接受 best-effort |

## 已关闭

| ID | 关闭日期 | 关闭证据 |
|---|---|---|
| RISK-2026-11-08-R8-01 | 2026-11-08 | 1.9.4 提交 `ec6738c` + 正式基线 `TASK-IMPROVE-2026-11-08-R8-ec6738c-1` |
| RISK-2026-11-08-R8-02 | 2026-11-09 | 1.11.0 `review-check` 加入 node/npx/tsc/vitest/jest/playwright 等 + e2e 零证据负向用例 |
| RISK-2026-11-09-R7-01 | 2026-11-09 | `growth-check --archive` 导航合并旧 archived RETRO + fixture |
| RISK-2026-11-09-R7-02 | 2026-11-09 | `secret-check --fix` 非 UTF-8 拒绝改写 + `encoding-unsupported` + fixture |
| RISK-2026-11-09-R7-03 | 2026-11-09 | GROWTH 表格严格列数校验 + `pipe-injection` fixture |
| RISK-2026-11-09-R7-04 | 2026-11-09 | `secret-check --max-file-bytes`/`--max-duration-ms` + oversized/timed-out fixture |
| RISK-2026-11-09-R7-05 | 2026-11-09 | `multi-table-retro` fixture 覆盖 `### 4` + `### 5` |
| RISK-2026-11-09-R9-04 | 2026-11-09 | CI action pin 到 checkout/setup-node v4.4.0 40 位 SHA；Node 24.15.0 |
