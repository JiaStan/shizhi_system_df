# -*- coding: utf-8 -*-
"""
爬虫基类
定义所有爬虫的通用接口，新增数据源只需继承此类
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from enum import Enum


class SyncType(str, Enum):
    AUTO = "auto"
    FULL = "full"
    INCREMENTAL = "incremental"


class CrawlerStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CrawlerResult:
    """爬虫执行结果"""

    def __init__(self, source: str, status: CrawlerStatus, total: int = 0, inserted: int = 0,
                 updated: int = 0, message: str = "", error: Optional[str] = None):
        self.source = source
        self.status = status
        self.total = total
        self.inserted = inserted
        self.updated = updated
        self.message = message
        self.error = error

    def to_dict(self):
        return {
            "source": self.source,
            "status": self.status.value,
            "total": self.total,
            "inserted": self.inserted,
            "updated": self.updated,
            "message": self.message,
            "error": self.error,
        }


class BaseCrawler(ABC):
    """爬虫抽象基类"""

    source_name: str = "unknown"

    @abstractmethod
    def run(self, sync_type: SyncType = SyncType.AUTO) -> CrawlerResult:
        """执行爬取，返回结果"""
        pass

    @abstractmethod
    def get_status(self) -> Dict:
        """获取爬虫状态"""
        pass

    def get_source(self) -> str:
        return self.source_name