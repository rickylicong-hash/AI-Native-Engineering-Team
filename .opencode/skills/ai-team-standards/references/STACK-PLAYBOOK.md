# Stack Playbook — 技术栈识别与命令入口

> 原则：**先识别，再行动。** 以项目现有脚本/CI/README 为准；下面的命令只是候选，不是强制。命令不存在时记录 `BLOCKED`，不要伪造。

## 1. 识别清单

| 文件/目录 | 技术栈 | 关键信息 |
|---|---|---|
| `package.json` | Node/JS/TS | scripts、packageManager、workspaces、engines |
| `pnpm-workspace.yaml` | pnpm monorepo | packages |
| `turbo.json` / `nx.json` | monorepo | task pipeline |
| `tsconfig.json` | TypeScript | strict、paths、target |
| `vite.config.*` / `next.config.*` / `nuxt.config.*` / `angular.json` / `svelte.config.*` | 前端框架 | build/dev/test |
| `pyproject.toml` / `requirements*.txt` / `Pipfile` / `poetry.lock` / `uv.lock` | Python | 构建、测试、lint |
| `go.mod` / `go.sum` | Go | module、go version |
| `Cargo.toml` / `Cargo.lock` | Rust | workspace、features |
| `pom.xml` / `build.gradle*` / `settings.gradle*` / `gradlew` | Java/Kotlin | JDK、模块、测试 |
| `*.sln` / `*.csproj` / `global.json` | .NET | target framework、测试 |
| `Gemfile` / `Gemfile.lock` / `Rakefile` | Ruby | Rails/RSpec |
| `composer.json` / `composer.lock` | PHP | Laravel/Symfony/PHPUnit |
| `Package.swift` / `*.xcodeproj` / `*.xcworkspace` | Swift/iOS | scheme、测试 |
| `pubspec.yaml` | Dart/Flutter | flutter test/build |
| `CMakeLists.txt` / `Makefile` / `meson.build` | C/C++ | build dir、测试 |
| `Dockerfile` / `docker-compose*.yml` / `compose*.yaml` | 容器 | 服务、端口、依赖 |
| `Chart.yaml` / `values*.yaml` | Helm | 部署 |
| `*.tf` / `terraform.tfstate*` | Terraform | provider、workspace |
| `k8s/` / `manifests/` | Kubernetes | namespace、资源 |
| `serverless.yml` / `sam.yaml` / `cdk.json` | Serverless | 部署入口 |
| `.github/workflows/` / `.gitlab-ci.yml` / `Jenkinsfile` | CI | 真实命令来源 |

## 2. Node / TypeScript

**识别**：`package.json` 的 `packageManager` 字段优先（pnpm/yarn/npm/bun）。

**常用命令（按 lockfile 选择包管理器）：**

```bash
# 安装
npm ci
pnpm install --frozen-lockfile
yarn install --immutable
bun install --frozen-lockfile

# 质量
npm run lint
npm run typecheck
npm test
npm run build

# 单测（示例）
npx vitest run
npx jest --runInBand
```

**注意：**

- 不要混用包管理器；lockfile 是事实源；
- monorepo 用 workspace 命令（`pnpm -r`、`turbo run`、`nx run-many`）；
- 前端构建产物不要提交（除非项目约定）；
- Node 版本看 `.nvmrc`/`engines`/`volta`；
- E2E 常用 Playwright/Cypress，检查 `playwright.config.*`。

## 3. Python

**识别**：`pyproject.toml` 的 `[tool.poetry]`/`[tool.uv]`/`[project]`；`requirements*.txt`。

```bash
# 安装（按项目）
uv sync
poetry install
pip install -r requirements.txt

# 质量
ruff check .
ruff format --check .
mypy .
pytest -q
pytest --cov=src --cov-report=term-missing

# 构建
python -m build
```

**注意：**

- 虚拟环境不要提交；用 `uv`/`poetry`/`venv`；
- Django 检查 `manage.py test`、迁移；
- FastAPI 检查 OpenAPI schema；
- 不要用系统 Python 污染全局环境。

## 4. Go

```bash
go mod download
go test ./...
go test -race ./...
go vet ./...
golangci-lint run
go build ./...
```

**注意：**

- `go.sum` 必须提交；不要 `go get` 未 pin 的版本；
- 集成测试可能用 Testcontainers/Docker；
- 检查 `Makefile` 的真实入口。

## 5. Rust

```bash
cargo test
cargo test --all-features
cargo clippy --all-targets -- -D warnings
cargo fmt --check
cargo build --release
```

**注意：**

- workspace 用 `--workspace`；
- `cargo audit` 检查 CVE；
- 不要随意改 `Cargo.lock`（应用项目通常提交）。

## 6. Java / Kotlin

```bash
# Maven
mvn -q test
mvn -q verify
mvn -q package

# Gradle
./gradlew test
./gradlew build
./gradlew check
```

**注意：**

- 确认 JDK 版本（`java -version`、`maven.compiler.release`、`toolchains.xml`）；
- 多模块项目从根构建；
- Spring Boot 检查 `application*.yml`、profile、Actuator；
- 不要跳过集成测试（Failsafe/Testcontainers）。

## 7. .NET

```bash
dotnet restore
dotnet build --no-restore
dotnet test --no-build
dotnet format --verify-no-changes
```

**注意：**

- 确认 `global.json` SDK 版本；
- solution 级别构建；
- ASP.NET Core 检查 `appsettings*.json`、健康检查。

## 8. Ruby / PHP

```bash
# Ruby
bundle install
bundle exec rspec
bundle exec rubocop

# PHP
composer install
vendor/bin/phpunit
vendor/bin/phpstan analyse
```

## 9. 移动端

```bash
# Flutter
flutter pub get
flutter test
flutter analyze
flutter build apk --release

# iOS
xcodebuild -scheme <scheme> test
xcodebuild -scheme <scheme> archive

# Android
./gradlew test
./gradlew assembleRelease
```

**注意：**

- 签名/证书/密钥不入库；
- 真机/模拟器要求记录；
- 商店发布需用户批准。

## 10. C / C++

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure
```

## 11. 数据 / AI / ML

| 场景 | 检查 | 命令示例 |
|---|---|---|
| 数据管道 | 输入 schema、幂等、分区、回填 | `dbt build`、`pytest`、`spark-submit` |
| Notebook | 可复现、参数化、输出清理 | `papermill`、`jupyter nbconvert --execute` |
| 训练 | 数据版本、seed、指标、checkpoint | `python train.py`、`torchrun` |
| 推理服务 | 延迟/吞吐/批处理/降级 | `uvicorn`、`bentoml serve`、`vllm` |
| LLM 应用 | eval、prompt 版本、成本、guardrails | 见 `ai-team-ai-native` |

## 12. 基础设施 / 部署

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=200

helm lint ./helm/<app>
helm template <app> ./helm/<app> -f values-staging.yaml
kubectl diff -f k8s/
terraform fmt -check
terraform validate
terraform plan
```

**注意：**

- `apply/upgrade/delete` 是变更操作；生产需批准；
- 先 `plan`/`diff`/`--dry-run`；
- 不把 `.env`/state/密钥提交；
- 记录镜像 digest/版本。

## 13. 命令选择优先级

1. 项目 README/CI 中已有的命令；
2. `package.json` scripts / `Makefile` / `justfile` / `Taskfile`；
3. 语言生态标准命令；
4. 本文档候选命令。

不要发明项目不存在的脚本；不要跳过 lockfile；不要用全局安装的旧版本工具替代项目版本。

## 14. 环境记录模板

```text
OS:
Runtime:
Package manager:
Build:
Test:
Lint:
DB/Redis/Queue:
Container:
Network:
```

每次测试/构建报告至少记录以上相关项。
