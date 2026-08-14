---
kind: dependency_management
name: Python 与 Node.js 双栈依赖管理（requirements.txt + npm 私有镜像）
category: dependency_management
scope:
    - '**'
source_files:
    - backend/requirements.txt
    - webui_ref/package.json
    - webui_ref/package-lock.json
    - webui_ref/.npmrc
    - windows_setup/3_install_python_deps.bat
    - windows_setup/step3_install_python_deps.bat
    - .venv
---

## 1. 使用的系统/工具

本仓库包含两个独立的后端工程，各自使用不同的依赖管理系统：

- **后端（spiderV5 FastAPI）**：使用 Python `pip` 配合 `backend/requirements.txt` 声明依赖；通过根目录 `.venv/` 虚拟环境隔离运行环境。
- **Web UI 参考工程（webui_ref，NestJS + React/Vite）**：使用 `npm`，以 `package.json` + `package-lock.json` 锁定版本，并通过 `.npmrc` 配置华为云 npm 镜像源。

此外，仓库还附带 Windows 一键部署脚本（`windows_setup/*.bat`），在 `3_install_python_deps.bat` 中调用 `pip install -r backend/requirements.txt` 安装 Python 依赖，在 `step3_install_python_deps.bat` 中执行 `npm ci --prefix webui_ref` 安装前端依赖，形成标准化的本地部署流程。

## 2. 关键文件

- `backend/requirements.txt` — Python 后端依赖清单
- `webui_ref/package.json` — Node.js 依赖、脚本、engines 约束、overrides
- `webui_ref/package-lock.json` — npm 依赖锁文件（保证可重复构建）
- `webui_ref/.npmrc` — 指定华为云 npm 镜像源及缓存路径
- `windows_setup/3_install_python_deps.bat` / `windows_setup/step3_install_python_deps.bat` — 自动化安装脚本
- `start_server.py` / `stop_server.bat` — 服务启停入口（依赖已安装后运行）

## 3. 架构与约定

### Python 后端（FastAPI）
- 所有运行时依赖集中在 `backend/requirements.txt`，按功能阶段分组注释：基础依赖、Phase 1（QR/Pillow）、Phase 2（OpenAI LLM）、Phase 3（ortools，当前注释掉）。
- 版本采用**精确 pin**（如 `fastapi==0.103.2`、`uvicorn==0.22.0`、`pymysql==1.1.0`）或**最小版本上限**（如 `qrcode[pil]>=7.4.2`、`openai>=1.3.0`），避免上游破坏性升级。
- 可选依赖（ortools）通过注释保留，待 Phase 3 启用时再取消注释并安装，体现“按需引入”的渐进式依赖策略。
- 虚拟环境位于根目录 `.venv/`，由 `windows_setup/3_install_python_deps.bat` 创建并激活后执行 pip 安装。

### Node.js 前端（webui_ref）
- 依赖分为 `dependencies`（运行时）和 `devDependencies`（构建/测试/类型检查），职责清晰。
- 通过 `package-lock.json` 锁定子依赖树，确保多环境一致。
- 使用 `overrides.dayjs = "^1.11.15"` 强制覆盖传递依赖中的 dayjs 版本，解决潜在冲突。
- 通过 `.npmrc` 将默认 registry 切换为 `https://mirrors.huaweicloud.com/repository/npm/`，缓存目录设为 `/tmp/.npmcache`，适配国内网络环境。
- `engines.node >= 22.0.0, npm >= 10.0.0` 明确最低运行环境要求。
- 提供 `build:server`、`build:client`、`build:prod`、`type:check`、`lint`、`format`、`test` 等标准化脚本，统一开发体验。

### 部署集成
- Windows 一键部署脚本串联 MySQL 初始化、Python 依赖安装、数据库建表、服务启动全流程。
- `windows_setup/README_WINDOWS.txt` 描述分步安装逻辑，`run_all.bat` 可一次性执行全部步骤。

## 4. 约定与约束

- **Python 依赖必须通过 `requirements.txt` 管理**，新增第三方库需在此文件添加并标注所属 Phase。
- **Node.js 依赖必须通过 `package.json` + `package-lock.json` 管理**，禁止手动修改 `node_modules`。
- **前端构建必须走 npm 脚本**（`npm run build:prod` 等），不直接调用 vite/nest 命令。
- **Python 运行环境必须基于 `.venv` 虚拟环境**，避免污染全局 Python 环境。
- **npm 包源固定为华为云镜像**，不得随意更改 `.npmrc` 中的 registry。
- **可选依赖（如 ortools）保持注释状态**，仅在对应 Phase 需要时启用，防止不必要的安装失败。
- 无全局私有 PyPI 镜像配置，Python 依赖直接从官方 PyPI 安装；Node.js 通过 `.npmrc` 指向华为云镜像加速下载。