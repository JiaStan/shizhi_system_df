# -*- coding: utf-8 -*-
"""更新爬虫配置，启用飞书数据源"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import execute, query_all

def main():
    print("检查当前爬虫配置...")
    
    rows = query_all("SELECT * FROM system_params WHERE param_key = 'crawler_enabled_sources'")
    if rows:
        current = rows[0].get("param_value", "")
        print(f"当前启用的数据源: {current}")
        
        if "feishu" not in current:
            new_value = current + ",feishu" if current else "wms,feishu"
            execute("UPDATE system_params SET param_value = %s WHERE param_key = 'crawler_enabled_sources'", (new_value,))
            print(f"已更新为: {new_value}")
        else:
            print("飞书数据源已经启用")
    else:
        execute("INSERT INTO system_params (param_key, param_value, description) VALUES (%s, %s, %s)", 
                ("crawler_enabled_sources", "wms,feishu", "启用的数据源"))
        print("已创建配置: wms,feishu")

if __name__ == "__main__":
    main()