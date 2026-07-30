# -*- coding: utf-8 -*-
"""更新feishu_detail表结构"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import execute

def main():
    print("更新 feishu_detail 表结构...")
    execute("ALTER TABLE feishu_detail ADD COLUMN PROFESSIONAL VARCHAR(50) DEFAULT NULL COMMENT '调度员/专业师'")
    print("✓ 已添加 PROFESSIONAL 字段")
    
    execute("ALTER TABLE feishu_detail ADD COLUMN WAREHOUSE VARCHAR(100) DEFAULT NULL COMMENT '库区/货架号'")
    print("✓ 已添加 WAREHOUSE 字段")
    
    print("表结构更新完成")

if __name__ == "__main__":
    main()