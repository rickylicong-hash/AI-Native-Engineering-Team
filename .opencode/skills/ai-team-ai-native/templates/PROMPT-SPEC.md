# PROMPT-SPEC — <prompt_id>@<version>

- Owner：
- 模型：
- 参数：temperature / top_p / max_tokens / stop
- 日期：
- 关联：FR-... / EVAL-...

## 1. 任务

<一句话：输入什么，输出什么，给谁用>

## 2. 输入契约

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ... | ... | ... | ... |

## 3. 输出契约

```json
{
  "field": "type"
}
```

- schema 版本：
- 校验：
- 失败策略：

## 4. Prompt

```text
<system>
...
</system>

<context>
{{context}}
</context>

<user>
{{input}}
</user>
```

## 5. 示例

### 正常

输入：
输出：

### 边界

输入：
输出：

### 对抗

输入：
期望：拒绝/安全响应

## 6. 变更记录

| 版本 | 日期 | 变更 | 评测结果 |
|---|---|---|---|
| v1 | | | |

## 7. 评测

- 数据集：
- 指标：
- 结果：
- 回归：
