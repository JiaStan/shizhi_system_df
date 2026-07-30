# -*- coding: utf-8 -*-
"""测试配置API"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.system.credentials import get_crawler_config

def main():
    cfg = get_crawler_config()
    print("爬虫配置:")
    print(f"  crawler_enabled_sources: {cfg.get('crawler_enabled_sources')}")
    print(f"  enabled_sources_list: {cfg.get('enabled_sources_list')}")
    print(f"  是否包含 feishu: {'feishu' in cfg.get('enabled_sources_list', [])}")

if __name__ == "__main__":
    main()