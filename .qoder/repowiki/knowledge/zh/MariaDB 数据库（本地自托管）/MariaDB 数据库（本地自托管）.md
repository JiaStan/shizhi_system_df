---
kind: external_dependency
name: MariaDB 数据库（本地自托管）
slug: mariadb
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
source_files:
    - backend/config.py
    - backend/database.py
    - setup/mariadb-10.11.18-winx64/my.ini
    - windows_setup/step1_create_mysql_db.bat
---

### MariaDB
- 角色：本项目的持久化存储，承载仓库到货、PBOM、关键件评分、QR到件、试制资源等全部业务表。
- 集成点：`backend/config.py` 通过 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_DATABASE` 配置连接；`backend/database.py` 基于 PyMySQL + DBUtils 提供连接池与 `query_all/query_one/execute/execute_all` 统一访问接口。