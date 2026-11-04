---
name: AI Team Release
description: 一键部署与发布手册：环境预检、Docker/Compose/K8s/CI 模板、冒烟、可观测性、回滚与发布证据。DevOps 与 Chief 在 G7 使用。
---

# AI Team Release

目标：任何项目都能用**一条命令**完成可重复、可验证、可回滚的部署。没有回滚的发布不算完成。

## 1. 选择部署形态

| 项目形态 | 推荐 | 一键入口 |
|---|---|---|
| 静态站点/SPA | 对象存储 + CDN，或 Nginx 容器 | `npm run build` + `deploy/static.sh` |
| Web 全栈 | Docker Compose（小）/ K8s（大） | `docker compose up -d --build` / `helm upgrade --install` |
| API/Worker | 容器 + 托管 DB/队列 | Compose/K8s/平台 CLI |
| Serverless | 平台 CLI/IaC | `sam deploy` / `serverless deploy` / `cdk deploy` |
| 移动端 | 商店/内测分发 | `fastlane` / `flutter build` |
| 桌面端 | 安装包/自动更新 | 打包脚本 + 签名 |
| 数据/ML | 容器 + 任务编排 | `docker run` / `kubectl create job` |

默认选择：**能用托管就用托管；能用 Compose 就不上 K8s；能单容器就不拆微服务。**

## 2. 一键部署契约

项目必须提供：

```text
deploy/
  README.md          # 前置、命令、验证、回滚
  deploy.sh          # 或 Makefile / compose
  rollback.sh
  smoke.sh
```

或根目录 `Makefile`：

```makefile
deploy:
	./deploy/deploy.sh $(ENV)

rollback:
	./deploy/rollback.sh $(ENV)

smoke:
	./deploy/smoke.sh $(ENV)
```

要求：

- `deploy.sh <env>` 幂等；重复执行结果一致；
- `--dry-run`/`--check` 可行时提供；
- 读取 `.env.<env>` 或 Secret Manager，不把密钥写死；
- 失败非零退出码；输出可诊断；
- 部署后自动跑 `smoke.sh`；
- `rollback.sh <env>` 可回到上一个已知良好版本。

## 3. 发布前预检

- [ ] CI 全绿（lint/typecheck/test/build）；
- [ ] QA 测试报告通过；无 P0/P1；
- [ ] 安全放行；无 Critical/High；
- [ ] 版本号/制品/digest 确定；
- [ ] 数据库迁移已测试；备份完成；
- [ ] 配置/密钥/证书有效；
- [ ] 容量/配额/限流检查；
- [ ] 依赖服务（DB/Redis/队列/对象存储）健康；
- [ ] 回滚包/命令可用；回滚演练过；
- [ ] 监控/告警/runbook 就绪；
- [ ] 生产变更已获用户批准（L3）；
- [ ] 变更窗口/联系人确定。

## 4. 部署流程

```text
1. 冻结版本（tag/commit/digest）
2. 构建制品（镜像/包/静态资源）
3. 扫描（镜像/依赖/密钥）
4. 推送/归档（私有 registry/制品库）
5. 部署 staging
6. 冒烟 + 回归
7. 生产灰度/蓝绿（按风险）
8. 观察指标（错误率/延迟/饱和度/业务）
9. 全量或回滚
10. 记录 REL-* / release notes / 监控窗口
```

## 5. 冒烟清单

- [ ] 健康端点 200；
- [ ] 关键 API 200/正确 schema；
- [ ] 登录/核心旅程；
- [ ] 静态资源/页面加载；
- [ ] 数据库读写；
- [ ] 队列消费；
- [ ] 外部依赖连通；
- [ ] 错误率/延迟在预算内；
- [ ] 日志无异常堆栈；
- [ ] 版本/commit 正确。

## 6. 回滚

触发条件（示例）：

- 错误率 > 基线 2× 持续 5 分钟；
- p95 延迟 > 预算 2×；
- 核心旅程失败；
- 数据迁移异常；
- 安全事件。

回滚步骤：

1. 停止继续放量；
2. 回滚应用版本（镜像 tag/上一个 release）；
3. 回滚配置/feature flag；
4. 数据回滚（如迁移不兼容，按预案）；
5. 冒烟；
6. 记录事故/根因/后续。

**数据迁移优先 expand/contract**：先加列/双写，再迁移，最后删旧；避免不可逆迁移。

## 7. 可观测性

- 日志：结构化、request/trace id、脱敏；
- 指标：RED/USE + 业务指标；
- Trace：关键路径、采样；
- 告警：症状导向、可执行、runbook；
- SLO：可用性/延迟/错误率；错误预算；
- 仪表盘：发布后首屏。

## 8. 安全

- 容器非 root、只读根 FS、最小基础镜像、digest pin；
- 不把 `.env`/密钥/`.git` 打进镜像；
- Secret Manager/KMS；短期凭据/OIDC；
- 网络默认拒绝；只开必要端口；
- TLS；安全 Headers；
- CI 权限最小化；不在日志打印 secrets；
- 镜像/依赖扫描；SBOM/签名。

## 9. 模板

- `templates/Dockerfile`：多阶段、非 root、健康检查
- `templates/docker-compose.yml`：本地/小规模
- `templates/ci-github.yml`：GitHub Actions
- `templates/ci-gitlab.yml`：GitLab CI
- `templates/RELEASE-PLAN.md`：发布计划
- `templates/ROLLBACK.md`：回滚手册

## 10. 反模式

- 手工改生产；
- 部署没有版本/digest；
- 没有健康检查/冒烟；
- 没有回滚；
- 迁移不可逆且无备份；
- 生产密钥进镜像/日志；
- CI 用长期管理员密钥；
- 发布后不看指标；
- 把“容器起来了”当“服务可用”。
