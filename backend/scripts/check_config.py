# -*- coding: utf-8 -*-
"""检查爬虫配置"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import query_all

def main():
    rows = query_all("SELECT param_value FROM system_params WHERE param_key = 'crawler_enabled_sources'")
    if rows:
        print(f"数据库配置: {rows[0]['param_value']}")
    else:
        print("配置不存在")

if __name__ == "__main__":
    main()