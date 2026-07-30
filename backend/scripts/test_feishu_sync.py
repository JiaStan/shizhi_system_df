# -*- coding: utf-8 -*-
"""
测试飞书爬虫同步新表格数据
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.database import execute, query_all
from backend.crawlers.feishu_crawler import FeishuCrawler
from backend.crawlers.base import SyncType

print("清空 feishu_detail 表...")
execute('TRUNCATE TABLE feishu_detail')
rows = query_all('SELECT COUNT(*) AS cnt FROM feishu_detail')
print(f"当前记录数: {rows[0]['cnt']}")

print("\n运行飞书爬虫全量同步...")
crawler = FeishuCrawler()
result = crawler.run(SyncType.FULL)

print(f"\n同步结果:")
print(f"  状态: {result.status.value}")
print(f"  总数: {result.total}")
print(f"  新增: {result.inserted}")
print(f"  消息: {result.message}")

if result.error:
    print(f"  错误: {result.error}")

rows = query_all('SELECT COUNT(*) AS cnt FROM feishu_detail')
print(f"\n同步后记录数: {rows[0]['cnt']}")

rows = query_all('SELECT * FROM feishu_detail LIMIT 3')
print("\n前3条数据:")
for row in rows:
    print(f"  CONTACT_NODE: {row.get('CONTACT_NODE')}")
    print(f"  APPLY_CODE: {row.get('APPLY_CODE')}")
    print(f"  FROM_ORDER_CODE: {row.get('FROM_ORDER_CODE')}")
    print(f"  MATTER_CODE: {row.get('MATTER_CODE')}")
    print(f"  MATTER_NAME: {row.get('MATTER_NAME')}")
    print(f"  ORDER_NUM: {row.get('ORDER_NUM')}")
    print(f"  RECIVE_NUM: {row.get('RECIVE_NUM')}")
    print(f"  PRO_NAME: {row.get('PRO_NAME')}")
    print(f"  STATE: {row.get('STATE')}")
    print(f"  PROGRESS_TRACKING: {row.get('PROGRESS_TRACKING')}")
    print(f"  REPLY_DEADLINE: {row.get('REPLY_DEADLINE')}")
    print(f"  ZYS_USERNAME: {row.get('ZYS_USERNAME')}")
    print(f"  WH_NAME: {row.get('WH_NAME')}")
    print()

rows = query_all("SELECT STATE, COUNT(*) AS cnt FROM feishu_detail GROUP BY STATE ORDER BY cnt DESC")
print("\n状态分布:")
for row in rows:
    print(f"  {row['STATE']}: {row['cnt']}")
