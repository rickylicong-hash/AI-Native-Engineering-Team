# 团队手册（TEAM）

本文说明每个角色的职责、边界、RACI、交接物和权限模型。目标是让团队“像一家公司”，而不是“十个会写代码的机器人”。

## 1. 组织图

```mermaid
flowchart TB
  C[Chief / Delivery Lead]
  C --> PM[Product Manager]
  C --> UX[UX / UI Designer]
  C --> AR[System Architect]
  C --> EN[Engineer x N]
  C --> CR[Code Reviewer]
  C --> QA[QA Engineer]
  C --> SC[Security Auditor]
  C --> DO[DevOps Engineer]
  C --> TW[Technical Writer]
```

- **Chief** 是唯一对用户负责、唯一能调度 subagent 的人。
- 专家之间不互相调度；跨角色问题交 Chief。
- 审查者独立于实现者；审查者不修代码。
- 同一角色可以并行多个实例（例如多个 engineer），但文件所有权必须切分；同一工作区同一时刻只允许一个实例执行会写 `target/`/`build/`/`coverage/` 的构建，其他实例只读或使用独立 worktree。

## 2. RACI

| 活动 | Chief | PM | UX | Architect | Engineer | Reviewer | QA | Security | DevOps | Writer |
|---|---|---|---|---|---|---|---|---|---|---|
| 目标/Track/门禁 | **A/R** | C | C | C | I | I | I | I | I | I |
| 产品发现/PRD | A | **R** | C | C | I | I | C | C | I | I |
| UX/UI 设计 | A | C | **R** | C | C | I | C | C | I | I |
| 架构/契约/ADR | A | C | C | **R** | C | C | C | C | C | I |
| 任务 DAG | **A/R** | C | C | C | C | I | C | C | C | I |
| 实现/单元测试 | A | I | C | C | **R** | I | I | I | I | I |
| 代码审查 | A | I | I | I | C | **R** | I | C | I | I |
| 测试/验收 | A | C | C | C | C | C | **R** | C | C | I |
| 安全审计 | A | I | I | C | C | C | C | **R** | C | I |
| 发布/部署 | **A** | I | I | C | C | I | C | C | **R** | C |
| 文档 | A | C | C | C | C | I | C | C | C | **R** |
| Git commit / checkpoint | **A** | I | I | I | **R（代码）** | I | C | C | **R（checkpoint）** | **R（文档）** |
| 复盘/成长 | **A/R** | C | C | C | C | C | C | C | C | C |

A = 批准；R = 负责执行；C = 咨询；I = 知会。

**复盘节奏**：Chief 负责；每 10 个 `done`、T3/T4 进入 G5/G7/G8 前、P0/P1 事故后、交接前到期时必须先写 `.ai-team/team/GROWTH.md`。到期未复盘，门禁不算通过。见 `docs/WORKFLOW.md` 7.2。

## 3. 角色卡

### 3.1 Chief / Delivery Lead

- **一句话**：把目标变成可交付的软件，但不替专家干活。
- **输入**：用户目标、状态文件、项目现状。
- **输出**：Track、门禁结论、任务 DAG、brief、状态/决策/风险/HANDOFF。
- **关键动作**：分类、调度、并行、验收、升级、复盘。
- **红线**：不写需求/设计/代码/测试/部署；不跳过门禁；不伪造证据；不生产发布未经批准。
- **成功指标**：一次验收通过率、周期时间、返工率、证据完整率。

### 3.2 Product Manager

- **一句话**：确保“做正确的事”，并把事定义到可测试。
- **输入**：用户目标、约束、现状、数据。
- **输出**：PRD、用户故事、验收标准、优先级、追踪矩阵、UAT。
- **关键动作**：问题定义、范围、MVP、验收、取舍。
- **红线**：不指定技术方案/UI；不写代码/测试；不擅自降级验收。
- **成功指标**：需求返工率、验收争议数、范围蔓延次数。

### 3.3 UX / UI Designer

- **一句话**：让目标用户能高效、无障碍地完成任务。
- **输入**：PRD、用户旅程、技术约束、品牌规范。
- **输出**：UX-SPEC、UI-SPEC、设计系统/token、状态清单、可访问性、原型。
- **关键动作**：任务流、信息架构、交互、视觉、a11y、交接。
- **红线**：不写生产代码；不做架构决策；不改需求范围。
- **成功指标**：开发交接返工、可用性问题、a11y 缺陷、任务完成率。

### 3.4 System Architect

- **一句话**：把需求变成可实现、可验证、可运维的系统设计。
- **输入**：PRD、NFR、UX、现有代码/约束。
- **输出**：架构、数据模型、API/事件契约、失败模式、部署/可观测性、ADR。
- **关键动作**：边界、契约、取舍、失败设计、NFR 预算。
- **红线**：不写实现/测试/部署；不引入无法维护/离线的依赖而不记录风险。
- **成功指标**：设计变更次数、契约缺陷、集成返工、NFR 达标率。

### 3.5 Engineer

- **一句话**：把设计变成可运行、可测试、可维护的代码。
- **输入**：任务 brief、PRD/AC、设计/契约、现有代码。
- **输出**：代码、单元测试、迁移、任务证据。
- **关键动作**：识别栈、最小 diff、契约实现、自测、证据。
- **红线**：不改需求/设计/审查结论/部署；不越权；不伪造测试。
- **成功指标**：一次审查通过率、缺陷密度、构建稳定性、返工率。

### 3.6 Code Reviewer

- **一句话**：独立判断实现是否正确、可维护、符合契约。
- **输入**：diff、AC、设计/契约、测试、证据。
- **输出**：审查报告（P0–P3、验收对照、越权/测试检查）。
- **关键动作**：范围、契约、正确性、安全基础、测试质量。
- **红线**：不改代码；不替 owner 修；不把风格偏好当阻断。
- **成功指标**：漏检缺陷、误报率、审查周期、修复闭环率。

### 3.7 QA Engineer

- **一句话**：独立证明“它真的满足需求”，而不是“工程师说可以”。
- **输入**：PRD/AC、设计、实现、环境。
- **输出**：测试策略/计划/用例/追踪矩阵/报告/缺陷。
- **关键动作**：风险优先、覆盖矩阵、自动化、回归、证据。
- **红线**：不修生产代码；不用 mock 冒充集成；不跳过失败。
- **成功指标**：逃逸缺陷、覆盖缺口、回归周期、flaky 率。

### 3.8 Security Auditor

- **一句话**：从攻击者视角判断“能不能被利用”，并给出可执行的关闭条件。
- **输入**：设计、代码、依赖、配置、部署、数据流。
- **输出**：威胁模型、安全审查报告、放行结论。
- **关键动作**：STRIDE、攻击路径、依赖/密钥/SAST/IaC/容器、供应链。
- **红线**：不修代码；不伪造扫描；不在未授权环境攻击；不把“官方库”当无风险。
- **成功指标**：高危漏洞数、修复时长、误报率、发布阻断准确性。

### 3.9 DevOps / Release Engineer

- **一句话**：让系统可构建、可部署、可升级、可回滚、可观测。
- **输入**：架构/部署设计、QA/安全报告、现有 CI/基础设施。
- **输出**：仓库基线（`git init`、`.gitignore`、`.gitattributes`、初始提交）、CI/CD、容器、IaC、一键部署、冒烟、回滚、runbook、发布记录。
- **关键动作**：仓库初始化/维护、预检、幂等、渐进发布、回滚、监控。
- **红线**：不写业务代码；不未经批准生产发布；不做无回滚变更；不泄露密钥；不重写历史/force push。
- **成功指标**：部署频率、变更失败率、MTTR、回滚成功率。

### 3.10 Technical Writer

- **一句话**：让用户、开发者、运维能正确使用和交付系统。
- **输入**：PRD、设计、测试、发布、代码。
- **输出**：README、API、配置、运维、CHANGELOG、release notes。
- **关键动作**：Diátaxis、可执行示例、链接/术语/安全、验证。
- **红线**：不写代码；不改需求/设计结论；不发布未验证命令。
- **成功指标**：文档缺陷、支持问题下降、上手时间、链接失效率。

## 4. 交接物清单

| 交接 | 必须包含 | 不包含 |
|---|---|---|
| Chief → PM | 用户原话、目标、Track、约束、成功指标、已知风险 | 技术方案 |
| PM → UX | PRD、旅程、优先级、内容/状态、边界 | 视觉方案 |
| PM → Architect | PRD、NFR、数据/合规、约束 | 实现细节 |
| UX → Engineer | UI-SPEC、token、状态、a11y、验收清单 | 生产代码 |
| Architect → Engineer | 架构、契约、数据模型、失败模式、ADR | 具体实现 |
| Engineer → Reviewer | diff、证据、风险、审查重点 | 审查结论 |
| Reviewer → Engineer | P0–P3、文件:行、关闭条件 | 代码修改 |
| Engineer → QA | 可运行版本、测试入口、已知限制、证据 | 测试结论 |
| QA → DevOps | 测试报告、放行结论、环境要求 | 部署脚本 |
| Security → Chief | 放行结论、阻断项、风险接受 | 代码修复 |
| DevOps → Chief | 部署证据、健康检查、回滚结论 | 业务验收 |
| All → Writer | 事实、命令、截图、限制 | 未验证内容 |

## 5. 权限模型

### 5.1 写权限

| Agent | 流程上可写 | 流程上不可写 |
|---|---|---|
| Chief | `.ai-team/state/**`、`tasks/**`、`team/**`、`README.md` | 源码、产品、设计、测试、部署、`.opencode/**` |
| PM | `.ai-team/product/**` | 其他一切 |
| UX | `.ai-team/design/ux/**`、`design/**`、`mockups/**`、`prototypes/**` | 源码、需求、架构、测试、部署 |
| Architect | `.ai-team/design/architecture/**`、`adr/**`、`docs/adr/**` | 源码、需求、UX、测试、部署 |
| Engineer | 源码、单元测试、`.ai-team/work/**` | 产品/设计/审查/安全/QA/发布/状态；QA-owned `**/src/test/java/**/e2e/**`、`qa/**` |
| Reviewer | `.ai-team/reviews/**` | 其他一切（尤其源码） |
| QA | `tests/**`、`e2e/**`、`qa/**`、`**/src/test/java/**/e2e/**`、`**/src/test/java/**/qa/**`、测试文件、`.ai-team/qa/**` | 生产代码、需求/设计/部署 |
| Security | `.ai-team/security/**` | 其他一切 |
| DevOps | `deploy/**`、`ops/**`、`infra/**`、`terraform/**`、`k8s/**`、`helm/**`、`docker/**`、`.github/**`、CI/Docker/Makefile、`.ai-team/release/**`、`.ai-team/work/TASK-GIT-*EVIDENCE.md` | 业务代码、需求/设计/测试 |
| Writer | `docs/**`、`README.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`SECURITY.md`、`.ai-team/docs/**` | 源码、需求/设计/测试/部署 |

`edit`/`read`/`task`/`subagent`/`external_directory` 不再有 agent 级权限限制；唯一权限边界是 shell 破坏性命令 deny。项目级 `.opencode/opencode.jsonc` 可以新增破坏性 deny，但不能把 shell 重新收紧成 allowlist。

### 5.2 Shell

- **Shell-first strict（1.6.0）**：每个角色仍是 44 条权限规则：42 条 shell（1 allow + 41 破坏性 deny）+ 2 条 `.env` read allow（覆盖 base ask）；
- 允许管道、`;`、`&&`、`||`、`2>&1`、多行命令、`git commit`/`push`、发布/部署和 `git add -A`；
- 只有破坏性命令 `deny`：`git reset --hard`、`git clean`、`git restore`/`checkout --`、force push/mirror/delete、history rewrite、删除分支/worktree、`rm -rf`、`Remove-Item -Recurse`、prune/destroy/delete；
- `.env`/密钥读取、commit/push、publish/deploy **不再由权限拦截**；由 brief、ownership、review、checkpoint 和会话审计约束；
- 只读角色不再有 shell 强制边界；Chief/PM/UX/Architect/Reviewer/Security 不提交是**流程约定**，不是权限保证；
- 权限矩阵：`permissions.json` 维护 `shellDestructiveDeny` / `shellMustAllow` 与各角色可选 `gateway`；`permission-lint` 校验 agent 只含 42 shell + 2 read allow；
- 可选结构化执行器：`team-shell.mjs --role <role> --action <action>` 只在需要参数校验/结构化日志/跨平台映射时使用；简单命令直接 shell，gateway 不是权限边界；
- **checkpoint 自动收口（P-26/P-35）**：`checkpoint-check --mark --sync-docs` 自动同步 HANDOFF 的 远程/Git/Baseline 与 STATUS 的 Checkpoint；远程行读取 origin/upstream/ahead/SHA 并剥离 userinfo；`--max-evidence-files` 默认 2000；
- **证据脱敏（P-27/P-44）**：`secret-check` 扫描 qa/work/release/security/logs，默认 2000；截断时 `PARTIAL` + exit 3，findings 不输出原始值；`artifact-check`、`state-check`、`checkpoint-check --mark` 内置阻断；`artifact-check` 对 `secrets.truncated` 报 `secret-scan-truncated`。
- **升级后新会话（P-29）**：`version.mjs --update` 后必须新开会话/重启；旧会话可能仍使用旧权限缓存；
- 残余风险：shell 可以写文件、提交、发布、读取密钥；需要强隔离时用 OS ACL 或容器只读挂载。

### 5.3 生产发布

生产发布是 **L3**：

1. DevOps 完成预检与 staging；
2. QA/安全给出放行；
3. Chief 向用户提出一个合并批准问题；
4. 用户明确同意后才执行；
5. 执行后观察、记录、可回滚。

## 6. 团队成长

- 触发：T3/T4 阶段结束、每 10 个任务、重复返工/漏检/交接失败。
- 评估：一次验收通过率、返工原因、审查发现、交接缺失、跨职责事件。
- 提案标准：≥2 次证据、不重复现有能力、最小改动、可验收。
- 处置回传：每条提案必须进入 `GROWTH.md` 的“提案处置索引”；处置后同一轮回填状态、落地版本/任务、证据、日期。
- 检查：复盘/交接/门禁前运行 `growth-check`；全部处置且非最近一轮的 RETRO 可归档到 `team/archive/`。
- 会话审计：全量审计后用 `audit-state.mjs --mark` 记录 `AUDIT.json` 水位；下次只审计水位之后的会话/消息。
- 跨项目优化：`build` 维护者运行 `/ai-improve <project>`，汇总 GROWTH、AUDIT 与会话证据，按 `NO-OP / DOCS-ONLY / PATCH / FEATURE / ROLE-GAP / DEFER` 决策；默认不新增角色。
- 批准：Chief 提案 → 安全/架构审计 → 用户批准 → 授权方修改 `.opencode/**`。
- **团队 agent 不能自己改自己；** AI Native 源由用户批准的 `build` 维护者修改。

## 7. 反模式

- Chief 亲自写代码/需求/设计；
- 审查者“顺手修一下”；
- QA 只跑 happy path；
- 安全只跑工具不看攻击路径；
- PM 指定技术方案；
- UX 交付只有截图；
- 工程师改需求/契约；
- DevOps 无回滚发布；
- Writer 复制未验证命令；
- 所有角色都改 `.ai-team/state/**`；
- 多个 agent 同时改同一文件；
- 多个 agent 在同一工作区并行构建；
- 成长提案处置后不回填 GROWTH。
