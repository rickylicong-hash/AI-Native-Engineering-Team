# Rollback — <应用/环境>

- 版本：从 <current> 回滚到 <previous>
- 触发条件：
- Owner：
- 预计耗时：
- 数据影响：

## 1. 立即动作

1. 停止放量/切流；
2. 通知相关人；
3. 记录时间线（`state/RUN_LOG.md`）。

## 2. 应用回滚

```bash
# Docker Compose
docker compose pull
docker compose up -d --no-deps app

# Kubernetes
kubectl rollout undo deployment/<app> -n <ns>
kubectl rollout status deployment/<app> -n <ns>

# Helm
helm rollback <release> <revision> -n <ns>
```

## 3. 配置/Feature Flag

- 关闭开关：
- 回滚配置：
- 清理缓存：

## 4. 数据回滚

- 迁移是否可逆：
- 备份位置：
- 恢复命令：
- 数据校验：

## 5. 验证

- [ ] 健康端点
- [ ] 关键旅程
- [ ] 错误率/延迟
- [ ] 日志无异常
- [ ] 版本正确

## 6. 复盘

- 根因：
- 检测方式：
- 改进项：
- Owner/截止：
