# -*- coding: utf-8 -*-
import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

ENV_PATH = BASE_DIR / '.env'
ENV_EXAMPLE_PATH = BASE_DIR / '.env.example'

if not ENV_PATH.is_file():
    import sys as _sys
    _sys.stderr.write(
        "[WARNING] 未找到 backend/.env 配置文件，将使用默认值（可能导致数据库连接失败）。\n"
        "          请复制 backend/.env.example 为 backend/.env 并填写真实配置。\n"
    )

load_dotenv(ENV_PATH)


def _get_int(name: str, default: int) -> int:
    """读取整数配置，非法值自动回退到默认值。"""
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_bool(name: str, default: bool = False) -> bool:
    """读取布尔配置，支持 true/false、1/0、yes/no。"""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def _get_list(name: str, default: str = '*') -> List[str]:
    """读取逗号分隔列表配置。"""
    raw = os.getenv(name, default)
    values = [item.strip() for item in raw.split(',') if item.strip()]
    return values or [default]


class Settings:
    """全局配置"""

    # 数据库配置
    DB_HOST: str = os.getenv('DB_HOST', '127.0.0.1')
    DB_PORT: int = _get_int('DB_PORT', 3306)
    DB_USER: str = os.getenv('DB_USER', 'root')
    DB_PASSWORD: str = os.getenv('DB_PASSWORD', '')
    DB_DATABASE: str = os.getenv('DB_DATABASE', 'warehouse_data')

    # 爬虫配置
    SPIDER_INTERVAL_MINUTES: int = _get_int('SPIDER_INTERVAL_MINUTES', 30)
    SPIDER_TIMEOUT_SECONDS: int = _get_int('SPIDER_TIMEOUT_SECONDS', 30)

    # WMS 仓库接口地址
    LOGIN_URL: str = os.getenv('LOGIN_URL', 'https://di360.dfmc.com.cn:24664/user/login')
    QUERY_URL: str = os.getenv('QUERY_URL',
                                'https://di360.dfmc.com.cn:24664/api/tmp/warehouse/buWhDeliveryDetailQuery/list')

    # 飞书共享表（待后续实现）
    FEISHU_APP_ID: str = os.getenv('FEISHU_APP_ID', '')
    FEISHU_APP_SECRET: str = os.getenv('FEISHU_APP_SECRET', '')
    FEISHU_SHEET_URL: str = os.getenv('FEISHU_SHEET_URL', '')

    # 采购系统（待后续实现）
    PURCHASE_API_URL: str = os.getenv('PURCHASE_API_URL', '')
    PURCHASE_API_KEY: str = os.getenv('PURCHASE_API_KEY', '')

    # DeepSeek LLM 配置
    DEEPSEEK_API_KEY: str = os.getenv('DEEPSEEK_API_KEY', '')
    DEEPSEEK_BASE_URL: str = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    DEEPSEEK_MODEL: str = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')

    # 服务配置
    SERVER_HOST: str = os.getenv('SERVER_HOST', '0.0.0.0')
    SERVER_PORT: int = _get_int('SERVER_PORT', 8000)
    DEBUG: bool = _get_bool('DEBUG', True)
    CORS_ORIGINS: List[str] = _get_list('CORS_ORIGINS', '*')

    # QR码到件地址（用于生成二维码中的URL）
    QR_BASE_URL: str = os.getenv('QR_BASE_URL', f'http://localhost:{SERVER_PORT}')

    @property
    def qr_base_url(self) -> str:
        return self.QR_BASE_URL

    # 上传目录
    UPLOAD_DIR: str = os.getenv('UPLOAD_DIR', str(PROJECT_ROOT / 'uploads'))


settings = Settings()

# 确保上传目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
