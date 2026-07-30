# -*- coding: utf-8 -*-
import os
import logging
from logging.handlers import RotatingFileHandler
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FORMAT = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'


def get_logger(name='spider_v5'):
    """获取或创建 logger 实例"""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    level = logging.DEBUG if settings.DEBUG else logging.INFO
    logger.setLevel(level)

    # 文件处理器：单文件最大 10MB，最多保留 7 个历史文件。
    file_handler = RotatingFileHandler(
        filename=os.path.join(LOG_DIR, f'{name}.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=7,
        encoding='utf-8',
    )
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(file_handler)

    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(console_handler)

    return logger


# 默认 logger
logger = get_logger('spider_v5')
