-- ================================================================
-- spiderV5 PBOM 智能装配系统 —— Windows MySQL 建库脚本
-- 说明：创建数据库 warehouse_data 和专用用户（可选）
-- 用法：
--   方法1：在 MySQL 客户端执行  source D:\spiderV5\windows_setup\sql\create_database.sql
--   方法2：双击 1_install_mysql.bat，脚本会自动执行本文件
-- ================================================================

-- 1) 创建数据库（如已存在则不报错）
CREATE DATABASE IF NOT EXISTS warehouse_data
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 2) （可选）创建专用用户 spider_v5，并授予 warehouse_data 库全部权限
--    如需使用 root 账号可注释或跳过下面两行
CREATE USER IF NOT EXISTS 'spider_v5'@'localhost' IDENTIFIED BY 'Spider@2024!';
GRANT ALL PRIVILEGES ON warehouse_data.* TO 'spider_v5'@'localhost';

FLUSH PRIVILEGES;

-- 3) 提示信息（在 SQL 客户端会以结果集形式返回）
SELECT
    '================================================' AS '步骤',
    '数据库 warehouse_data 创建成功'                AS '说明'
UNION ALL
SELECT
    '默认账号',
    '用户名: spider_v5  密码: Spider@2024!（建议修改）'
UNION ALL
SELECT
    '下一步',
    '请回到命令行执行:  4_init_database.bat  以创建业务表';

-- ================================================================
-- 完成。后续业务表由 backend\scripts\init_db.py 创建。
-- ================================================================