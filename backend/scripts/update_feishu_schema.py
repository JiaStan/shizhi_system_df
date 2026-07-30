# -*- coding: utf-8 -*-
"""
更新飞书明细表结构
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.database import execute

try:
    execute('ALTER TABLE feishu_detail ADD COLUMN CONTACT_NODE VARCHAR(50) DEFAULT NULL AFTER RECIVE_TIME')
    print('✓ 添加 CONTACT_NODE 字段')
except Exception as e:
    print(f'CONTACT_NODE 字段已存在: {e}')

try:
    execute('ALTER TABLE feishu_detail ADD COLUMN PROGRESS_TRACKING TEXT DEFAULT NULL AFTER CONTACT_NODE')
    print('✓ 添加 PROGRESS_TRACKING 字段')
except Exception as e:
    print(f'PROGRESS_TRACKING 字段已存在: {e}')

try:
    execute('ALTER TABLE feishu_detail ADD COLUMN REPLY_DEADLINE VARCHAR(50) DEFAULT NULL AFTER PROGRESS_TRACKING')
    print('✓ 添加 REPLY_DEADLINE 字段')
except Exception as e:
    print(f'REPLY_DEADLINE 字段已存在: {e}')

try:
    execute('ALTER TABLE feishu_detail DROP COLUMN PROFESSIONAL')
    print('✓ 删除 PROFESSIONAL 字段')
except Exception as e:
    print(f'PROFESSIONAL 字段不存在: {e}')

print()
print('表结构更新完成！')
