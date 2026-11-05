# Handoff

- 时间：YYYY-MM-DD HH:mm
- Track/Stage：
- 目标：
- 已完成：
- 未完成：
- 关键决策：
- 阻塞/风险：
- Retro：not due / done YYYY-MM-DD / DUE — 先补
- Checkpoint：clean / done <commit> / DUE — 先派 DevOps / WAIVED
- Growth：open N / done M / 最近处置 YYYY-MM-DD（`growth-check`）
- Git：<last code checkpoint SHA>
- Baseline：<last code checkpoint SHA；默认同 Git；用于区分后续纯文档提交>
- 下一条指令：
- 必读文件：
  - `.ai-team/state/STATUS.md`
  - `.ai-team/state/TASKS.md`
  - `.ai-team/state/DECISIONS.md`
  - ...

## 给下一次会话的最小上下文

<不超过 10 行>

## 新会话首条消息（可直接粘贴）

~~~text
读取 .ai-team/state/HANDOFF.md 继续项目。
当前 Track/Stage：<T? / G?>。
下一条指令：<一句话>。
先核对 STATUS/TASKS，禁止重复已完成任务；遇到 L3 决策再问我。
~~~
