# Integration — <candidate>

## 1. 候选

- 集成候选 commit：`<sha>`
- 工作区指纹：`git status --porcelain` 为空 / `diffHash=<sha>`
- 集成分支/目标分支：
- 集成负责人：ai-team/devops-engineer
- 日期：

## 2. 合并顺序

| 顺序 | Workstream | Commit | 依赖 | 状态 |
|---:|---|---|---|---|
| 1 | WS-01 | `<sha>` | - | merged / pending / conflict |
| 2 | WS-02 | `<sha>` | WS-01 | merged / pending / conflict |

## 3. 全量基线（每个集成候选只跑 1 条）

- `baseline_id`：`INTEGRATION-<commit>-<run>`
- 命令：
- 退出码：
- 计数：`Tests run / Failures / Errors / Skipped`
- 日志路径（UTF-8）：
- 是否复用 workstream 基线：是/否；指纹校验结果：

## 4. 冒烟与回滚

- 冒烟命令/退出码：
- 健康检查：
- 回滚命令：
- 回滚验证：
- 观察窗口：

## 5. 结果

- 结论：通过 / 修改后通过 / 不通过
- 阻断项：
- 例外/风险（`RISK-*`）：
- 下一步：
