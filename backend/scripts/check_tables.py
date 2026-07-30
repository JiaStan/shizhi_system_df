# -*- coding: utf-8 -*-
"""检查表结构"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import query_all

def main():
    print("=== delivery_detail 表结构 ===")
    rows = query_all("DESCRIBE delivery_detail")
    for row in rows:
        print(f"  {row['Field']} - {row['Type']}")
    
    print("\n=== feishu_detail 表结构 ===")
    rows = query_all("DESCRIBE feishu_detail")
    for row in rows:
        print(f"  {row['Field']} - {row['Type']}")
    
    print("\n=== 统计数据 ===")
    wms = query_all("SELECT COUNT(*) AS cnt FROM delivery_detail")
    feishu = query_all("SELECT COUNT(*) AS cnt FROM feishu_detail")
    print(f"  delivery_detail 记录数: {wms[0]['cnt']}")
    print(f"  feishu_detail 记录数: {feishu[0]['cnt']}")

if __name__ == "__main__":
    main()