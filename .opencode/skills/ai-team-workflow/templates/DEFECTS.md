---
schema: 1
project: <project-name>
owner: ai-team/qa-engineer
status: active
---

# DEFECTS — 缺陷台账

> QA 开单，owner 修复，QA 独立回归后关单。**owner 只能把状态置为 `fixed`，不得自行置 `verified` / `closed`。**

## 1. 缺陷模板（必填，缺项退回）

```text
DEF-0001
标题：<动词 + 对象 + 条件，可搜索>
严重级别：S1 阻断 / S2 严重 / S3 一般 / S4 轻微
优先级：P0 / P1 / P2 / P3（QA 建议，Chief/PM 定）
组件：
发现阶段：G4 自测 / G5 集成 / G5 E2E / G5 性能 / G6 安全 / G7 部署 / 生产
环境：<ENV + commit + OS/浏览器>
关联：<FR/AC/用例 ID>
前置：
步骤：
  1. ...
期望：
实际：
复现率：<x/10>
证据：<日志/命令/响应/trace/截图路径>
影响：
建议 owner：engineer / devops / ux / architect
状态：open / in-progress / fixed / verified / closed / wontfix / duplicate
回归：<用例 ID + 命令 + 退出码 + 日期>
```

## 2. 状态与责任

| 状态 | 进入条件 | 退出条件 | 谁可以设置 |
|---|---|---|---|
| `open` | QA 提交且字段齐全 | 指派 owner | QA |
| `in-progress` | owner 接单 | 提交修复 | owner |
| `fixed` | 修复已合并/可回归 | QA 回归 | owner |
| `verified` | 回归用例通过 + 证据 | 关闭 | **QA only** |
| `closed` | 回归通过、无新增关联缺陷、证据归档 | — | **QA only** |
| `wontfix` | 书面接受 + `RISK-*` | — | **QA/Chief** |
| `duplicate` | 指向主单 | — | QA |

## 3. 关闭条件（缺一不可）

1. 修复已合并（附 commit/PR）；
2. QA 回归用例通过（用例 ID + 命令 + 退出码）；
3. 关联 AC 复跑通过；
4. 相邻用例通过，未引入新缺陷；
5. S1/S2 有根因说明和防止复发的回归用例；
6. 证据归档到 `qa/runs/<date>-<milestone>-<suite>/`。

## 4. 台账

| DEF | 标题 | 级别 | 组件 | 关联 AC | 状态 | Owner | 回归 |
|---|---|---|---|---|---|---|---|
| DEF-0001 | ... | S1/S2/S3/S4 | ... | ... | open | engineer | ... |
