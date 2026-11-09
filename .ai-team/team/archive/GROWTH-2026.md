# GROWTH Archive — 2026

> 归档自 `team/GROWTH.md`，保留完整历史；主文件只保留索引和最近复盘。

## 提案处置索引（归档）

| ID | RETRO | 提案 | 状态 | 落地版本/任务 | 证据 | 更新日期 | scope |
|---|---|---|---|---|---|---|---|
| T-01 | RETRO-0001 | 三层入口、净零与项目 profile | done | 1.9.0 / TASK-IMPROVE-2026-11-07-R4 | `CHANGELOG.md` 1.9.0 | 2026-11-07 | team |
| T-02 | RETRO-0002 | 净零真值与证据扫描自适应 | done | 1.9.1 / TASK-IMPROVE-2026-11-08-R6 | `CHANGELOG.md` 1.9.1 | 2026-11-08 | team |
| T-03 | RETRO-0003 | 团队质量目标与 `/ai-improve` 目标校准 | done | 1.9.2 / commit `c484f74` | `CHANGELOG.md` 1.9.2 | 2026-11-08 | team |
| T-04 | RETRO-0004 | Review-entry 合同与首轮横向面 | done | 1.9.3 / commit `2de7bb0` | `CHANGELOG.md` 1.9.3 | 2026-11-08 | team |
| T-05 | RETRO-0005 | 验证预算与全量基线复用 | done | 1.9.4 / commit `ec6738c` | `CHANGELOG.md` 1.9.4；`TASK-IMPROVE-2026-11-08-R8-EVIDENCE.md` | 2026-11-08 | team |
| T-06 | RETRO-0006 | 质量报告 `quality-report.mjs` | done | 1.10.0 / TASK-IMPROVE-2026-11-09-R9 | `TASK-IMPROVE-2026-11-09-R9-EVIDENCE.md`；`test-gates` 46/46 | 2026-11-09 | team |
| T-07 | RETRO-0006 | CI 门禁 `.github/workflows/verify.yml` | done | 1.10.0 / TASK-IMPROVE-2026-11-09-R9 | `.github/workflows/verify.yml`；`CHANGELOG.md` 1.10.0 | 2026-11-09 | team |
| T-08 | RETRO-0007 | 所有权机器校验 `ownership-check.mjs` | done | 1.11.0 / TASK-IMPROVE-2026-11-09-R10 | `TASK-IMPROVE-2026-11-09-R10-EVIDENCE.md`；`test-gates` 60/60 | 2026-11-09 | team |
| T-09 | RETRO-0007 | 离线端到端冒烟 | done | 1.11.0 / TASK-IMPROVE-2026-11-09-R10 | `test-gates` e2e 6 checks；`CHANGELOG.md` 1.11.0 | 2026-11-09 | team |

## RETRO-0001 — 2026-11-07 — G5 — release-1.9.0

### 1. 范围与指标

- 覆盖：团队源 1.9.0 发布（三层入口、净零、profile）
- 新增完成：1
- 返工任务：0 / 1（0%）
- 审查轮次：REV-IMPROVE-2026-11-07-R4、R4-R1
- 未关闭 P0/P1：0
- 证据：`CHANGELOG.md`、`docs/VERIFICATION.md`、`.ai-team/reviews/REV-IMPROVE-2026-11-07-R4*.md`

### 2. 做得好（保留）

- 把项目特例挡在团队核心之外，profile 与净零同时落地。
- 发布证据、版本、CHANGELOG、VERIFICATION 同轮同步。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-01 | 团队规则持续增加，但团队源没有自己的 GROWTH 台账 | 1.9.0 仅以 TASK 记录 | 2026-11-09 审计 `growth-check` exit 2 | 无法自证净零与债务趋势 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-01 | team | 三层入口、净零与项目 profile | G-01 | 引入 TEAM-CORE/PROJECT-PROFILE/OBSERVE 与净零 | `growth-check` 通过；1.9.0 验证记录 | 2026-11-21 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：T-02
- 下次复盘：1.9.1 发布后

## RETRO-0002 — 2026-11-08 — G5 — release-1.9.1

### 1. 范围与指标

- 覆盖：净零真值、证据扫描自适应
- 新增完成：1
- 返工任务：0 / 1（0%）
- 审查轮次：REV-IMPROVE-2026-11-08-R6、R6-R1
- 未关闭 P0/P1：0
- 证据：`CHANGELOG.md` 1.9.1、`TASK-IMPROVE-2026-11-08-R6-EVIDENCE.md`

### 2. 做得好（保留）

- 从最新 RETRO 推导真值，不再信任 frontmatter 自报。
- 证据扫描自动升限，避免大项目默认失败。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-02 | 净零计数可被同轮合并/陈旧 frontmatter 绕过 | R6 首轮 P1-01 | R6 首轮 P1-02 | 台账可信度下降 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-02 | team | 净零真值与证据扫描自适应 | G-02 | 真值推导 + 2000→20000 自适应 + UTF-16/二进制处理 | `test-gates` 28/28；R6 复审通过 | 2026-11-22 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：T-03
- 下次复盘：1.9.2 发布后

## RETRO-0003 — 2026-11-08 — G5 — release-1.9.2

### 1. 范围与指标

- 覆盖：团队质量目标与 `/ai-improve` 目标校准
- 新增完成：1
- 返工任务：0 / 1（0%）
- 审查轮次：1.9.2 发布验证
- 未关闭 P0/P1：0
- 证据：`docs/TEAM.md` §0.1、`CHANGELOG.md` 1.9.2

### 2. 做得好（保留）

- 把“一次通过率”定义为趋势指标，不设硬门禁。
- `/ai-improve` 每次先复述目标，防止优化偏离使命。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-03 | 目标被声明，但没有自动度量 | 56.8% 基线只在文档 | `improve-scan` 无一次通过率输出 | 无法判断改进是否有效 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-03 | team | 团队质量目标与目标校准 | G-03 | 文档化口径/目标 + 命令复述 | 文档一致；`audit-team-consistency` 通过 | 2026-11-22 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：T-04
- 下次复盘：1.9.3 发布后

## RETRO-0004 — 2026-11-08 — G5 — release-1.9.3

### 1. 范围与指标

- 覆盖：Review-entry 合同、首轮横向面
- 新增完成：1
- 返工任务：0 / 1（0%）
- 审查轮次：1.9.3 发布验证
- 未关闭 P0/P1：0
- 证据：`CHANGELOG.md` 1.9.3、`templates/REVIEW.md`

### 2. 做得好（保留）

- 审查前移：缺语义源对照表直接退回，不进入 full review。
- 首轮横向面覆盖生产装配、异常、权限、迁移、配置默认值。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-04 | 审查范围容易只看 happy path | 1.9.3 前 review 模板无横向面 | 1.9.3 P-61/P-64/P-62 | 首轮漏项导致返工 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-04 | team | Review-entry 合同与首轮横向面 | G-04 | brief 增字段 + REVIEW 模板增检查表 | `test-gates` 32/32；1.9.3 验证 | 2026-11-22 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：T-05
- 下次复盘：1.9.4 发布后

## RETRO-0005 — 2026-11-09 — G5 — release-1.9.4

### 1. 范围与指标

- 覆盖：验证预算 V0–V3、全量基线合同、Reviewer/QA 复用、静态审查并行
- 新增完成：1
- 返工任务：0 / 1（0%）
- 审查轮次：REV-IMPROVE-2026-11-08-R8、R8-R1、R8-R2
- 未关闭 P0/P1：0
- 证据：`CHANGELOG.md` 1.9.4、`TASK-IMPROVE-2026-11-08-R8-EVIDENCE.md`、`.ai-team/work/TASK-IMPROVE-2026-11-08-R8-logs/BASELINE.md`

### 2. 做得好（保留）

- 用真实会话证据（17 次全量 104.4m、审查重复 6 次 39.1m）驱动优化，而不是凭感觉。
- 审查真实发现 P1（canonical“跑 1 条”不被识别），已修复并回归。
- 保留 G5/G7 全量、独立验证、P1/flaky 关闭条件，没有用“省时间”换质量。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-05 | 规则改动缺少正式提案/观察窗口 | 1.9.4 仅以 TASK-R8 记录 | 团队源无 GROWTH | 无法验证净零与改善 |
| G-06 | 质量目标仍未被自动度量 | 56.8% 基线为历史值 | 无一次通过率报告 | 目标可能漂移 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-05 | team | 验证预算与全量基线复用 | G-05 | V0–V3 + 基线合同 + 复用校验 + brief 字段 | verify 206/206；test-gates 36/36；基线 `ec6738c` 有效 | 2026-11-23 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：T-06（质量度量）与 T-07（CI）
- 下次复盘：第 10 个 `done` 任务或 1.9.5 发布前

## RETRO-0006 — 2026-11-09 — G5 — release-1.10.0

### 1. 范围与指标

- 覆盖：质量报告与 CI 门禁
- 新增完成：2
- 返工任务：1 / 2（首轮 code-review 不通过，R1 通过）
- 审查轮次：REV-IMPROVE-2026-11-09-R9 → R9-R1；SEC-IMPROVE-2026-11-09-R9 → R9-R1
- 首轮未关闭 P0/P1：P1=2（GROWTH 提前标 done、EVIDENCE 缺失），R1 关闭
- 最终未关闭 P0/P1：0
- 证据：`CHANGELOG.md` 1.10.0、`TASK-IMPROVE-2026-11-09-R9-EVIDENCE.md`、`.ai-team/reviews/REV-IMPROVE-2026-11-09-R9-R1.md`、`.ai-team/security/SEC-IMPROVE-2026-11-09-R9-R1.md`

### 2. 做得好（保留）

- 把“一次通过率”从文档声明变成可运行报告，且明确是趋势/代理指标。
- CI 与本地使用同一组门禁，减少“本机通过、合并后失败”。
- 质量报告带 data-quality 警告，不把不可推断的 checkpoint/跨角色返工伪装成精确值。
- 首轮审查发现 2 个 P1（提前 done、证据缺失）并在 R1 关闭，说明审查有效。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-07 | 质量目标缺少自动度量 | 56.8% 基线为历史值 | `improve-scan` 无一次通过率 | 无法判断改进是否有效 |
| G-08 | 发布/验证依赖本机 | 无 `.github/` | R7-06 第三方扫描未安装 | 安全/发布纪律不可持续 |
| G-09 | 规则改动容易提前标 done | R9 首轮 P1-1 | R8 曾用 provisional 证据 | 证据链失真 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-06 | team | 质量报告 `quality-report.mjs` | G-07 | 从 TASKS/reviews/security/qa 计算趋势指标 | `test-gates` 46/46；strict 探针通过 | 2026-11-23 | 用户 |
| T-07 | team | CI 门禁 `.github/workflows/verify.yml` | G-08 | push/PR 跑 verify/test-gates/permission/artifact/secret/review-check/quality-report | 本地同命令全绿；CI 首次运行待 push 回填 | 2026-11-23 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：T-08（角色边界机器校验）与 T-09（离线 E2E）
- 下次复盘：第 12 个 `done` 任务或 1.10.1 发布前

## RETRO-0007 — 2026-11-09 — G5 — release-1.11.0

### 1. 范围与指标

- 覆盖：所有权机器校验、离线 E2E、review-check node 白名单
- 新增完成：2
- 返工任务：2 / 2（code/security 首轮均不通过，R1/R2 修复后通过）
- 审查轮次：REV-...-R10 → R10-R1 → R10-R2；SEC-...-R10 → R10-R1 → R10-R2
- 首轮未关闭 P0/P1：code P1=3、security P1=2；R2 关闭
- 最终未关闭 P0/P1：0
- 证据：`TASK-IMPROVE-2026-11-09-R10-EVIDENCE.md`、`REV-...-R10-R2.md`、`SEC-...-R10-R2.md`

### 2. 做得好（保留）

- 把“无越权”从人工判断变成可执行检查，并让本次变更自己先通过 ownership-check。
- 离线 E2E 串起 brief-lint → review-check → quality-report → ownership-check → artifact-check，不依赖 provider。
- 首轮审查发现空 diff、禁止段 fail-open、零证据 review 等真实 P1，R1/R2 关闭。

### 3. 问题（每条至少 2 次证据）

| ID | 现象 | 证据 1 | 证据 2 | 影响 |
|---|---|---|---|---|
| G-10 | 所有权检查可被空 diff/自报 diff 空转 | R10 首轮 P1-1 | 安全 R10 首轮 P1-2 | 机器证据可能失真 |
| G-11 | 离线 E2E 之前不存在 | 2026-11-09 审计 P3-01 | 无 e2e fixture | 门禁链未持续验证 |

### 4. 改进提案

| ID | scope | 提案 | 对应问题 | 最小改动 | 验收方式 | 复查日期 | 需要谁批准 |
|---|---|---|---|---|---|---|---|
| T-08 | team | 所有权机器校验 `ownership-check.mjs` | G-10 | 反引号 glob + diff + strict/realpath | `test-gates` 60/60；本次 brief PASS | 2026-11-23 | 用户 |
| T-09 | team | 离线端到端冒烟 | G-11 | test-gates e2e fixture 串起五个门禁 | 6 个 e2e checks PASS；无 provider | 2026-11-23 | 用户 |

### 5. 结论

- 本周期结论：保持
- 下一周期重点：处理 R7 P3 债务与 `RISK-R10-01..04`；观察 1.11.0 实际使用
- 下次复盘：第 13 个 `done` 任务或 1.11.1 发布前
