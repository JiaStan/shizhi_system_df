"""
采购系统爬虫
待后续实现：通过采购系统 API 获取到货数据
"""

from backend.crawlers.base import BaseCrawler, SyncType, CrawlerStatus, CrawlerResult
from backend.logger import get_logger

logger = get_logger('crawler.purchase')


class PurchaseCrawler(BaseCrawler):
    """采购系统爬虫（待实现）"""

    source_name = "purchase"

    def __init__(self):
        self._status = CrawlerStatus.IDLE
        self._last_result = None
        self._logs = []
        self._progress = {"current_page": 0, "total_pages": 0, "inserted": 0, "processed": 0}

    def run(self, sync_type: SyncType = SyncType.AUTO) -> CrawlerResult:
        self._status = CrawlerStatus.RUNNING
        self._logs = []
        self._logs.append({"time": "now", "level": "warn", "source": "purchase", "msg": "采购系统爬虫尚未实现 API 接入"})
        logger.warning("采购系统爬虫尚未实现 API 接入")
        result = CrawlerResult(
            source=self.source_name,
            status=CrawlerStatus.FAILED,
            total=0,
            inserted=0,
            updated=0,
            message="采购系统 API 尚未接入",
            error="采购系统 API 尚未接入，请联系管理员配置"
        )
        self._status = CrawlerStatus.FAILED
        self._last_result = result
        return result

    def get_status(self):
        return {
            "source": self.source_name,
            "status": self._status.value,
            "progress": dict(self._progress),
            "logs": list(self._logs),
            "note": "API 待接入",
            "last_result": self._last_result.to_dict() if self._last_result else None,
        }