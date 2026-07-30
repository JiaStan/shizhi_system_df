===================================================================
 spiderV5 PBOM 智能装配系统 —— Windows 一键部署说明
===================================================================

本目录包含在 Windows 系统上运行 spiderV5 所需的所有脚本与说明。
原始代码未做任何修改，仅增加 Windows 专属的启动 / 建库脚本。


一、系统要求
-------------------------------------------------------------------
1) 操作系统：Windows 10 / 11 / Server 2016+（64 位）
2) Python 版本：Python 3.8 ~ 3.11（推荐 3.10）
   · 下载：https://www.python.org/downloads/
   · 安装时请勾选 "Add Python to PATH"
3) 数据库：MySQL 5.7 或 8.0（推荐 8.0）
   · 下载：https://dev.mysql.com/downloads/mysql/
   · 或使用 MariaDB 10.5+
   · 安装时设置 root 密码，端口默认 3306
4) 浏览器：Chrome / Edge（用于访问管理界面）


二、部署步骤（按顺序执行）
-------------------------------------------------------------------

▶ 步骤 1：安装 MySQL 并创建数据库

   方法 A —— 双击运行：
      双击 windows_setup\1_install_mysql.bat
      按提示输入 MySQL root 密码，脚本将自动创建 warehouse_data 数据库
      以及本项目专用的 MySQL 用户（可选）。

   方法 B —— 手动执行 SQL：
      在 MySQL 命令行或 Navicat 中执行：
          windows_setup\sql\create_database.sql
      创建数据库后，再执行：
          backend\scripts\init_db.py  （见步骤 4）

   提示：如果已有 MySQL 实例，只需确保 127.0.0.1:3306 可连接，
   并创建名为 warehouse_data 的数据库即可。


▶ 步骤 2：创建并配置环境变量

   双击 windows_setup\2_config.bat
   该脚本会：
      · 复制 backend\.env.example -> backend\.env
      · 提示你修改数据库连接信息
      · 自动创建 logs 与 uploads 目录

   或者手动编辑 backend\.env，修改以下字段：
      DB_HOST=127.0.0.1
      DB_PORT=3306
      DB_USER=root
      DB_PASSWORD=你的MySQL密码
      DB_DATABASE=warehouse_data


▶ 步骤 3：安装 Python 依赖

   双击 windows_setup\3_install_python_deps.bat
   该脚本会调用 pip 安装 backend\requirements.txt 中的所有依赖。

   如果提示"pip 不是内部命令"，请先确保 Python 已加入系统 PATH，
   或手动执行：
      python -m pip install -r backend\requirements.txt


▶ 步骤 4：初始化数据库表结构

   双击 windows_setup\4_init_database.bat
   该脚本会执行 backend\scripts\init_db.py，自动创建所有业务表、
   系统参数表，并写入默认参数。


▶ 步骤 5：启动服务

   双击 windows_setup\5_start_server.bat
   启动成功后会显示：
      spiderV5 应用初始化完成: http://0.0.0.0:8000
   请在浏览器访问：
      http://localhost:8000


三、一键部署（推荐）
-------------------------------------------------------------------
如果已安装好 MySQL 并记录了 root 密码，可以直接运行：
    windows_setup\0_一键部署.bat
该脚本会依次执行步骤 1 ~ 步骤 5，实现"开箱即用"。


四、常见问题
-------------------------------------------------------------------

Q1. 启动时提示"数据库连接失败"
A1. 检查 backend\.env 中的 DB_HOST / DB_PORT / DB_USER / DB_PASSWORD
    是否与本地 MySQL 实例一致；确认 warehouse_data 数据库已存在。

Q2. pip 安装依赖时报错 / 速度慢
A2. 3_install_python_deps.bat 已内置清华镜像源。如果仍失败，可手动：
    python -m pip install -r backend\requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

Q3. 端口 8000 被占用
A3. 修改 backend\.env 中的 SERVER_PORT=8000 为其他端口（如 8080）。

Q4. 中文字段显示乱码
A4. MySQL 数据库、表、连接均需使用 utf8mb4。
    建库脚本 create_database.sql 已设置 CHARACTER SET utf8mb4。

Q5. 如何停止服务
A5. 在运行窗口按 Ctrl+C；或直接关闭 cmd 窗口。

Q6. 如何让服务后台运行（开机自启）
A6. 可以使用 NSSM（Non-Sucking Service Manager）将 Python 进程注册为
    Windows 服务，或使用任务计划程序。示例见 windows_setup\docs\nssm.txt。


五、目录结构
-------------------------------------------------------------------
windows_setup\
├── 0_一键部署.bat           （顺序执行所有部署步骤）
├── 1_install_mysql.bat      （创建 MySQL 数据库与用户）
├── 2_config.bat             （配置 .env 文件与目录）
├── 3_install_python_deps.bat（安装 Python 依赖）
├── 4_init_database.bat      （初始化数据库表结构）
├── 5_start_server.bat       （启动 FastAPI 服务）
├── sql\
│   └── create_database.sql  （数据库创建脚本）
└── README_WINDOWS.txt       （本说明文件）

===================================================================
 祝你使用愉快！如需更多帮助，请查看项目根目录的 README.md。
===================================================================