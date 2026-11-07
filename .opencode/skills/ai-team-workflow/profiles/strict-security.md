---
id: strict-security
applies_to: ["regulated", "high-risk", "multi-tenant", "public-internet"]
scope: project-profile
version: 1
---

# 严格安全项目 Profile

> 只写项目级安全策略；通用安全门禁仍以 `ai-team-standards` 和 `ai-team-security-auditor` 为准。

## 1. 适用条件

- 受监管行业、公开互联网、多租户或高风险数据处理；
- 需要固定 ASVS/供应链基线、发布签字和例外流程；
- 需要把安全证据从“建议”变成“门禁”。

## 2. 项目级覆盖

| 项 | 项目约定 | 证据 |
|---|---|---|
| 威胁模型 | 进入 G2/G3 前更新；新增外部接口、权限、租户边界必须重审 | `security/THREAT-MODEL-*.md` |
| SAST/SCA/secret | CI 常驻；Critical/High 阻断，例外有 owner + 到期日 | `logs/<date>/sast.log`、`sca.log`、`secret.log` |
| 容器/镜像 | 镜像扫描、非 root、最小权限、固定 digest | 扫描报告 + Dockerfile/K8s 清单 |
| SBOM | 每次发布生成并归档；依赖变更可追溯 | `release/sbom-*.json` |
| ASVS 基线 | 项目选定等级；未覆盖项写例外与补偿控制 | `security/ASVS-*.md` |
| VEX/例外 | 只接受有依据的 VEX；到期自动复查 | `security/VEX-*.md` + `RISKS.md` |
| 发布签字 | 安全审计通过后才能 G7/G8；紧急发布需用户书面批准 | `security/SEC-*.md` + `release/` |

## 3. 门禁

进入 G5/G6/G7 前：

- SAST/SCA/secret 扫描 0 个未处置 Critical/High；
- 威胁模型覆盖新增攻击面；
- 容器/镜像扫描通过，非 root 与最小权限有证据；
- SBOM 已生成并归档；
- 例外有 owner、补偿控制、到期日；
- 安全审计结论为“通过/修改后通过”，且 P0/P1=0。

## 4. 证据

- 扫描日志：`logs/<date>/`，保留工具版本、规则集、退出码；
- 安全报告：`.ai-team/security/SEC-*.md`，包含独立验证命令；
- 敏感值脱敏：Cookie/Authorization/token/口令只保留掩码 + 长度/hash；
- 证据编码 UTF-8；根目录 `logs/*.log` 与 UTF-16 判失败。

## 5. 裁剪

- 低风险内部项目可降低 ASVS 等级，但必须由 `security-auditor` + 用户批准；
- 无容器项目可关闭镜像扫描，但仍需依赖与 secret 扫描；
- 裁剪必须在项目 `DECISIONS.md` 记录，不得静默跳过。

## 6. 复查

- 触发：新增外部接口/租户边界、依赖重大升级、监管要求变化、安全事件；
- Owner：`ai-team/security-auditor`；
- 复查日期：每次 G7 前，或例外到期日。
