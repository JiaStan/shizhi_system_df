---
kind: build_system
name: spiderV5 构建与部署体系：Python FastAPI + NestJS 全栈打包与 Windows 一键部署
category: build_system
scope:
    - '**'
source_files:
    - build_windows_package.sh
    - start_server.py
    - backend/requirements.txt
    - windows_setup/run_all.bat
    - windows_setup/0_一键部署.bat
    - windows_setup/step3_install_python_deps.bat
    - windows_setup/step4_init_db_tables.bat
    - windows_setup/step5_start_server.bat
    - webui_ref/package.json
    - backend/scripts/init_db.py
    - backend/sql/resource_schema.sql
---

## 1. 构建/打包系统概览

本项目采用**多语言、多模块的混合构建体系**，围绕 spiderV5 后端（FastAPI + Python）和 webui_ref 前端参考工程（NestJS + React/Vite）分别组织构建流程，并通过 shell/Batch 脚本完成打包与 Windows 平台的一键部署。

- **后端构建**：纯 Python 项目，无 Makefile/Dockerfile；依赖通过 `backend/requirements.txt` 管理，使用 pip 安装。启动入口为 `backend/main.py`，由根目录 `start_server.py` 封装进程管理与优雅关闭。
- **前端构建**：位于 `webui_ref/`，基于 NestJS CLI (`nest build`) 与 Vite (`vite build`)，通过 `package.json` 中 `build:server`、`build:client`、`build:prod` 等脚本组合构建。
- **打包产物**：根级 `build_windows_package.sh` 生成带时间戳的 `spiderV5_for_Windows_YYYYMMDD.zip`，内含 backend、static、windows_setup、webui_ref（排除 node_modules/dist/.git）、docs 及运行时空目录 logs/uploads。
- **Windows 部署**：`windows_setup/` 提供分步 `.bat` 脚本（step1~5）以及 `0_一键部署.bat`、`run_all.bat` 聚合入口，覆盖 MySQL 建库、`.env` 配置、pip 依赖安装、数据库初始化、服务启动全流程。

## 2. 关键文件与职责

| 文件 | 作用 |
|---|---|
| `backend/requirements.txt` | 后端 Python 依赖声明（fastapi、uvicorn、pymysql、openai 等），按 Phase 1/2/3 分层注释 |
| `start_server.py` | 跨平台服务器管理器，以子进程方式拉起 `backend/main.py`，处理 SIGINT/SIGTERM 与 Windows taskkill 优雅停止 |
| `build_windows_package.sh` | Linux/macOS 下执行，收集源码并产出 zip 包，自动清理 `__pycache__`、`.pyc`、真实 `.env` |
| `windows_setup/*.bat` | Windows 部署流水线：建库→配环境→装依赖→初始化表→启动服务 |
| `webui_ref/package.json` | 前端构建脚本入口（dev/build/test/lint/type-check），定义 Node ≥22 / npm ≥10 引擎约束 |
| `backend/scripts/init_db.py` | 数据库表结构初始化脚本，被 step4 调用 |
| `backend/sql/resource_schema.sql` | 数据库 DDL 源文件 |

## 3. 架构与约定

### 3.1 后端构建与运行
- 依赖版本在 `requirements.txt` 中**精确锁定主版本**（如 `fastapi==0.103.2`、`uvicorn==0.22.0`），Phase 3 的 `ortools` 以注释形式预留，体现“按需启用”的分阶段策略。
- 配置文件通过 `python-dotenv` 加载 `backend/.env`，部署时由 `step2_config.bat` 生成，打包脚本刻意剔除真实 `.env` 防止密码泄露。
- 启动路径约定：默认使用项目根目录下 `.venv/Scripts/python.exe`（Windows）或全局 `python`，监听 `SERVER_HOST:SERVER_PORT`（默认 8000）。
- 日志输出到根目录 `logs/`，上传目录为 `uploads/`，打包前会创建空目录占位。

### 3.2 前端构建（webui_ref）
- 使用 NestJS CLI 编译 server 端 TypeScript 至 `dist/server/`，Vite 构建 client 静态资源。
- 开发模式通过 `npm run dev` 同时启动 `dev:server`（watch 模式）与 `dev:client`。
- 类型检查、ESLint、Stylelint、Prettier 格式化均通过 npm scripts 统一编排，`prepare` 钩子自动安装 git pre-commit hook。
- 要求 Node.js ≥22、npm ≥10（见 `engines` 字段）。

### 3.3 打包与分发
- `build_windows_package.sh` 是跨平台打包器：先复制 backend/static/docs/windows_setup/webui_ref，再删除 Python 缓存与真实 `.env`，最后用 `zip` 命令或回退到 `python -m zipfile` 压缩。
- 产物命名含时间戳 `spiderV5_for_Windows_YYYYMMDD_HHMMSS.zip`，便于版本追溯。
- 打包后的 zip 内附带 `Windows_快速部署指南.txt` 与 `Quick_Start_Windows.txt` 中英双语说明。

### 3.4 Windows 一键部署流水线
- `run_all.bat` / `0_一键部署.bat` 顺序调用 step1~5，任一步骤失败立即中止并 pause 提示。
- Step 1：`step1_create_mysql_db.bat` 调用 `mysql` 客户端创建 `warehouse_data` 库。
- Step 2：`step2_configure_env.bat` 生成 `backend/.env` 模板并提示修改密码。
- Step 3：`step3_install_python_deps.bat` 优先使用清华镜像 `https://pypi.tuna.tsinghua.edu.cn/simple`，失败则回退官方 PyPI。
- Step 4：`step4_init_db_tables.bat` 执行 `python backend/scripts/init_db.py` 建表。
- Step 5：`step5_start_server.bat` 直接 `python backend/main.py` 启动服务，浏览器访问 `http://localhost:8000`。

## 4. 约定与约束

- **依赖管理**：后端依赖必须通过 `pip install -r backend/requirements.txt` 安装，禁止手动随意升级版本（版本号已锁定）。
- **环境变量**：所有敏感配置（数据库密码、API Key 等）必须放在 `backend/.env`，该文件不得提交到版本库（已被 `.gitignore` 忽略）；打包脚本会主动删除真实 `.env`。
- **Python 环境**：推荐在项目根目录使用虚拟环境 `.venv`；`start_server.py` 默认从 `.venv/Scripts/python.exe` 拉起后端进程。
- **Node 版本**：webui_ref 前端要求 Node ≥22、npm ≥10，构建前需满足 `engines` 约束。
- **数据库初始化顺序**：必须先执行 step1 建库、step4 建表，再启动服务；`step4` 会自动检测缺失 `.env` 并尝试补跑 step2。
- **打包安全**：构建产物不包含 `__pycache__`、`.pyc`、真实 `.env`、`node_modules`、`dist`、`.git` 等大体积/敏感目录。
- **端口约定**：默认监听 `http://localhost:8000`，可通过 `backend/.env` 中的 `SERVER_HOST`/`SERVER_PORT` 调整。
- **无 CI/CD**：仓库未包含 GitHub Actions、Jenkinsfile、Dockerfile 等持续集成配置，构建与发布完全依赖本地 shell/Batch 脚本。
