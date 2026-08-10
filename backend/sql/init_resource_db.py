# -*- coding: utf-8 -*-
"""数据库建表和初始化脚本"""
import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
# __file__ 是 backend/sql/init_resource_db.py
# .parent 是 backend/sql/
# .parent.parent 是 backend/
# .parent.parent.parent 是项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# 切换工作目录到 backend，使 .env 能被正确加载
os.chdir(PROJECT_ROOT / 'backend')

from backend.database import get_conn
from backend.logger import logger

def execute_sql_file(file_path: str):
    """执行SQL文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # 分割多语句
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
    
    conn = get_conn()
    try:
        with conn.cursor() as cursor:
            for stmt in statements:
                try:
                    cursor.execute(stmt)
                    logger.info(f"执行成功: {stmt[:80]}...")
                except Exception as e:
                    logger.warning(f"执行警告: {stmt[:80]}... - {e}")
        conn.commit()
        logger.info("SQL文件执行完成")
    except Exception as e:
        conn.rollback()
        logger.error(f"执行失败: {e}")
        raise
    finally:
        conn.close()

def main():
    sql_dir = Path(__file__).resolve().parent
    
    # 执行建表脚本
    schema_file = sql_dir / 'resource_schema.sql'
    if schema_file.exists():
        logger.info(f"执行建表脚本: {schema_file}")
        execute_sql_file(str(schema_file))
    else:
        logger.error(f"建表脚本不存在: {schema_file}")
        sys.exit(1)
    
    # 执行初始化数据脚本
    init_data_file = sql_dir / 'resource_init_data.sql'
    if init_data_file.exists():
        logger.info(f"执行初始化数据脚本: {init_data_file}")
        execute_sql_file(str(init_data_file))
    else:
        logger.error(f"初始化数据脚本不存在: {init_data_file}")
        sys.exit(1)
    
    logger.info("数据库初始化完成！")

if __name__ == '__main__':
    main()
