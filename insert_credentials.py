# -*- coding: utf-8 -*-
"""插入爬虫凭证占位"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import execute, query_all

# 插入 WMS 爬虫凭证占位
import json
empty_config = json.dumps({'username': '', 'password': '', 'Authorization': ''})

execute(
    'INSERT IGNORE INTO spider_credentials (source, name, config_json, is_active) VALUES (%s, %s, %s, %s)',
    ('wms', 'di360 WMS 仓库', empty_config, 1)
)
execute(
    'INSERT IGNORE INTO spider_credentials (source, name, config_json, is_active) VALUES (%s, %s, %s, %s)',
    ('feishu', '飞书共享表', '{}', 1)
)
execute(
    'INSERT IGNORE INTO spider_credentials (source, name, config_json, is_active) VALUES (%s, %s, %s, %s)',
    ('purchase', '采购系统', '{}', 1)
)

print('✓ 凭证占位插入完成')

# 查询验证
rows = query_all('SELECT source, name FROM spider_credentials')
for row in rows:
    print(f'  {row["source"]}: {row["name"]}')