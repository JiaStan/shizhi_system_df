# 试制资源数智化管理系统（spiderV6）

> 基于 spiderV5_optimized 扩展的**试制车间资源管理子系统**，通过设备台账、人员看板、任务管理、排程调度、异常预警等模块，实现试制车间全资源实时监控与智能调配。
>
> 详细业务规格见《[需求文档_V6_试制资源数智化管理系统](需求文档_V6_试制资源数智化管理系统.md)》。

## 系统架构

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | FastAPI + MariaDB | 提供 `/api/*` 全部 RESTful 接口 |
| 前端（参考工程） | React + TypeScript + Vite + ECharts 5 | 位于 `webui_ref/`，含 9 大模块页面 |
| 演示页（静态） | 原生 HTML/CSS/JS + ECharts | 位于 `demo/`，可直接浏览器打开 |
| 数据库 | MariaDB（`warehouse_data` 库） | 兼容 MySQL 协议 |

## 目录结构

```text
spiderV5_optimized/
├── backend/                  # FastAPI 后端服务
│   ├── modules/resource/     # 试制资源管理模块（设备/人员/任务）
│   ├── sql/                  # 资源模块建表与初始化数据脚本
│   ├── crawlers/             # 爬虫管理（360/WMS/飞书/采购）
│   ├── projects/             # 项目管理（PBOM）
│   ├── pbom/                 # PBOM 解析匹配
│   ├── qr_arrival/           # QR码现场到件
│   ├── delivery/             # 多源到货融合
│   ├── critical_parts/       # 关键件评分
│   ├── scheduling/           # 排程调度器
│   ├── system/               # 系统设置
│   ├── scripts/              # 运维脚本（init_db 等）
│   ├── main.py               # 应用入口
│   ├── config.py / database.py / logger.py
│   ├── requirements.txt
│   └── .env.example          # 环境变量模板
├── demo/                     # 纯静态演示页面（9 大模块原型）
│   ├── index.html            # 演示页入口
│   ├── dashboard.html        # 综合驾驶舱
│   ├── equipment.html        # 设备台账
│   ├── campus-map.html       # 园区地图
│   ├── resource-board.html   # 资源占用看板
│   ├── personnel.html        # 人员看板
│   ├── gantt.html            # 甘特图排程
│   ├── efficiency.html       # 人效分析
│   ├── alerts.html           # 异常预警中心
│   ├── tasks.html            # 任务管理
│   └── assets/ scripts/      # 样式、脚本与模拟数据
├── static/                   # FastAPI 托管的前端静态页面
├── webui_ref/                # React/Nest 前端参考工程源码
├── docs/                     # 业务说明文档
├── setup/                    # 本地 MariaDB 安装包（不入库）
├── .gitignore
└── README.md
```

## 核心功能模块（9 大模块）

| 序号 | 模块 | 说明 | API 前缀 |
|------|------|------|---------|
| 1 | 综合驾驶舱 | 全局 KPI、设备状态分布、车间实时布局、异常告警 | `/api/resource/dashboard/*` |
| 2 | 设备台账 | 设备信息管理、状态监控、维护记录 | `/api/resource/equipment/*` |
| 3 | 园区地图 | 车间平面图、区域分布、设备/人员位置可视化 | `/api/resource/zones/*` |
| 4 | 资源占用看板 | 实时资源占用率、排程矩阵、利用率趋势 | `/api/resource/tasks/*` |
| 5 | 人员看板 | 人员位置、状态、来源、工作负载 | `/api/resource/personnel/*` |
| 6 | 甘特图排程 | 任务时间线、拖拽调度、资源冲突检测 | `/api/resource/tasks/*` |
| 7 | 人效分析 | 人员效率统计、工时分析、来源效率对比 | `/api/resource/personnel/efficiency` |
| 8 | 异常预警中心 | 设备/人员/任务异常实时告警、分级处理 | `/api/resource/alerts/*` |
| 9 | 任务管理 | 零星/ABC类/试制岛任务 CRUD、状态追踪 | `/api/resource/tasks/*` |

> 资源模块后端实现位于 [backend/modules/resource](backend/modules/resource)，数据库脚本位于 [backend/sql](backend/sql)。

## 环境要求

- Python 3.9+
- MariaDB 10.x（或 MySQL 5.7+），数据库名 `warehouse_data`
- Node.js 22+ / npm 10+（仅前端参考工程需要）
- 演示页（demo/）无需任何依赖，浏览器直接打开即可

## 后端运行

```bash
cd spiderV5_optimized

# 1. 安装依赖
python -m pip install -r backend/requirements.txt

# 2. 配置环境变量（复制模板并修改数据库密码等）
cp backend/.env.example backend/.env

# 3. 初始化基础数据库（原有业务表）
python backend/scripts/init_db.py

# 4. 初始化试制资源模块数据库（新增 7 张表 + 初始化数据）
python backend/sql/init_resource_db.py

# 5. 启动服务
python backend/main.py
```

默认服务地址为 `http://localhost:8000`。如需修改数据库、端口、跨域域名或第三方接口密钥，请编辑 `backend/.env`。

### 资源模块数据库表

| 表名 | 说明 |
|------|------|
| `equipment` | 设备台账（举升机/试制岛/工位） |
| `zones` | 车间区域（SZC/SZA/SZB/JP1/JP2/LH 等） |
| `personnel` | 人员（工号/来源/状态/区域） |
| `tasks` | 任务（零星/ABC类/试制岛） |
| `alerts` | 异常预警 |
| `personnel_efficiency` | 人员效率统计 |
| `equipment_maintenance` | 设备维护记录 |

建表及初始化数据脚本：
- [resource_schema.sql](backend/sql/resource_schema.sql) — 建表
- [resource_init_data.sql](backend/sql/resource_init_data.sql) — 区域/设备/人员初始化数据

## 前端参考工程（webui_ref）

```bash
cd spiderV5_optimized/webui_ref
npm install
npm run dev
```

`webui_ref` 为参考工程源码，默认端口 `5173`，已配置代理将 `/api` 转发至 `http://localhost:8000`。生产构建执行 `npm run build` 即可生成 `dist`。

## 静态演示页（demo/）

无需安装依赖，直接使用浏览器打开 [demo/index.html](demo/index.html) 即可预览全部 9 个模块的原型页面（使用模拟数据）。

## API 文档

启动后端后访问 `http://localhost:8000/docs`（Swagger UI）查看全部接口。

接口规范：

| 项目 | 约定 |
|------|------|
| API 前缀 | `/api/resource/*` |
| 数据格式 | JSON |
| 响应格式 | `{ code, message, data }` |
| 时间格式 | ISO 8601（`YYYY-MM-DDTHH:mm:ss`） |

## 打包建议

发布或传输源码时，只保留源码、配置模板、锁文件和必要静态资源。不要打包以下内容：

- `node_modules/`
- `dist/`、`build/`
- `logs/`
- `__pycache__/`、`*.pyc`
- `*.tsbuildinfo`
- `.env`
- `setup/`（本地 MariaDB 安装包，开发者需自行安装）

## 后续开发指南

- **新增模块流程**：参照 [backend/modules/resource](backend/modules/resource) 的后端结构（`router.py` + `services/` + `schemas.py`）在 `backend/modules/` 下新建模块，并在 [backend/main.py](backend/main.py) 中注册路由；前端在 `webui_ref/client/src/pages/` 下新建页面目录。
- **数据库变更**：在 [backend/sql](backend/sql) 下编写建表/初始化脚本，保持与现有脚本风格一致。
- **演示页开发**：在 [demo](demo) 下新建 HTML 页面，复用 [demo/assets/css/theme.css](demo/assets/css/theme.css) 设计体系。
