# -*- coding: utf-8 -*-
"""
手动运行爬虫脚本
用法: python -m backend.scripts.run_crawler [wms|feishu|purchase|all]
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.crawlers.crawler_manager import crawler_manager
from backend.logger import get_logger

logger = get_logger('run_crawler')


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else None
    sync_type = sys.argv[2] if len(sys.argv) > 2 else "auto"

    logger.info(f"手动执行爬虫: source={source}, sync_type={sync_type}")
    result = crawler_manager.run(source, sync_type)
    logger.info(f"爬虫执行结果: {result}")


if __name__ == '__main__':
    main()