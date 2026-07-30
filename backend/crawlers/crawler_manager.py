# -*- coding: utf-8 -*-
"""
爬虫管理器
管理所有爬虫实例，提供统一调度接口
支持同步阻塞 / 后台线程异步 两种模式
"""

import threading
import time
import uuid
from typing import Dict, List, Optional

from backend.crawlers.base import BaseCrawler, SyncType, CrawlerResult
from backend.crawlers.wms_crawler import WMSCrawler
from backend.crawlers.feishu_crawler import FeishuCrawler
from backend.crawlers.purchase_crawler import PurchaseCrawler
from backend.logger import get_logger

logger = get_logger('crawler.manager')


class CrawlerManager:
    """爬虫管理器

    新增数据源：
    1. 创建新爬虫类继承 BaseCrawler
    2. 在 _init_crawlers() 中注册
    3. 不需要修改其他代码
    """

    def __init__(self):
        self._crawlers: Dict[str, BaseCrawler] = {}
        self._init_crawlers()
        # 任务状态：task_id -> { running, start_time, last_result, ... }
        self._tasks: Dict[str, Dict] = {}
        # 全局停止标志：爬虫循环中检测到 True 则退出
        self._stop_requested: bool = False

    def request_stop(self) -> None:
        """请求停止所有正在运行的爬虫（优雅退出）"""
        self._stop_requested = True
        logger.info("[Stop] 已设置停止标志，正在运行的爬虫将在下一次循环检查时退出")
        for name, c in self._crawlers.items():
            try:
                c._stop_requested = True
            except Exception:
                pass

    def reset_stop_flag(self) -> None:
        """启动新任务前重置停止标志"""
        self._stop_requested = False
        for c in self._crawlers.values():
            try:
                c._stop_requested = False
            except Exception:
                pass

    def is_any_running(self) -> bool:
        """是否有爬虫正在运行"""
        for c in self._crawlers.values():
            try:
                if c._status.value == "running":
                    return True
            except Exception:
                pass
        return False

    def stop_source(self, source: str) -> Dict:
        """停止指定数据源的爬虫"""
        if source not in self._crawlers:
            return {"success": False, "error": f"未知数据源: {source}"}
        c = self._crawlers[source]
        try:
            c._stop_requested = True
        except Exception:
            pass
        was_running = False
        try:
            if c._status.value == "running":
                was_running = True
        except Exception:
            pass
        return {
            "success": True,
            "source": source,
            "was_running": was_running,
            "message": "已请求停止，爬虫将在当前页处理完成后退出",
        }

    def _init_crawlers(self):
        """初始化所有爬虫实例"""
        self._crawlers["wms"] = WMSCrawler()
        self._crawlers["feishu"] = FeishuCrawler()
        self._crawlers["purchase"] = PurchaseCrawler()

    def list_sources(self) -> List[str]:
        return list(self._crawlers.keys())

    def get_all(self) -> List[Dict]:
        """获取所有爬虫状态（每个爬虫的 status 里含 progress 和 logs）"""
        return [c.get_status() for c in self._crawlers.values()]

    def get_status(self, source: str) -> Dict:
        """获取指定爬虫状态"""
        if source not in self._crawlers:
            return {"error": f"未知数据源: {source}"}
        return self._crawlers[source].get_status()

    def get_task(self, task_id: str) -> Optional[Dict]:
        return self._tasks.get(task_id)

    # ===== 同步阻塞（兼容旧逻辑） =====
    def run(self, source: str = None, sync_type: str = "auto",
            enabled_sources=None) -> Dict:
        """同步执行（阻塞直到完成）"""
        return self._do_run(source=source, sync_type=sync_type,
                            enabled_sources=enabled_sources)

    # ===== 后台线程非阻塞（前端实时日志用） =====
    def _reset_crawler(self, crawler) -> None:
        """重置爬虫状态（运行前调用，保证 logs/进度都是干净的）"""
        try:
            crawler._status = CrawlerStatus.RUNNING
            crawler._logs = []
            crawler._progress = {
                "current_page": 0,
                "total_pages": 0,
                "inserted": 0,
                "processed": 0,
            }
        except Exception:
            pass

    def run_async(self, source: str = None, sync_type: str = "auto",
                  enabled_sources=None) -> Dict:
        """立即返回 task_id，后台线程跑。前端通过 /status 轮询日志。"""
        task_id = str(uuid.uuid4())[:12]

        # 重置停止标志（如果有），保证新任务能正常运行
        self.reset_stop_flag()

        # 先重置所有将要运行的爬虫状态，前端能拿到干净的 logs
        run_names = []
        if source:
            if source in self._crawlers:
                run_names = [source]
        else:
            if enabled_sources:
                run_names = [s for s in enabled_sources if s in self._crawlers]
            else:
                run_names = list(self._crawlers.keys())
        for name in run_names:
            self._reset_crawler(self._crawlers[name])

        # 记录任务元信息
        task_meta = {
            "task_id": task_id,
            "source": source or "all",
            "sync_type": sync_type,
            "enabled_sources": enabled_sources or [],
            "running": True,
            "start_time": time.time(),
            "end_time": None,
            "result": None,
        }
        self._tasks[task_id] = task_meta

        def worker():
            try:
                result = self._do_run(source=source, sync_type=sync_type,
                                      enabled_sources=enabled_sources)
                task_meta["result"] = result
                task_meta["status"] = result.get("status", "success")
            except Exception as e:
                logger.exception(f"异步爬虫异常: {e}")
                task_meta["status"] = "failed"
                task_meta["error"] = str(e)
            finally:
                task_meta["running"] = False
                task_meta["end_time"] = time.time()
                # 异步任务完成后恢复后端调度器，避免手动触发后调度器永久暂停
                try:
                    from backend.scheduling.scheduler import scheduler_service
                    scheduler_service.resume()
                    logger.info("[Async] 异步爬虫任务完成，已恢复调度器")
                except Exception:
                    pass

        t = threading.Thread(target=worker, daemon=True)
        t.start()

        return {
            "task_id": task_id,
            "running": True,
            "sources": run_names,
            "message": "爬虫已启动，请通过 /crawlers/status 轮询获取实时日志",
        }

    # ===== 内部执行核心 =====
    def _do_run(self, source: str = None, sync_type: str = "auto",
                enabled_sources=None) -> Dict:
        """真正的执行逻辑（同步/异步模式都用这个）"""
        try:
            typed_sync = SyncType(sync_type)
        except Exception:
            typed_sync = SyncType.AUTO

        total = 0
        inserted = 0
        updated = 0
        all_results: List[Dict] = []
        success_count = 0
        failed_count = 0
        skipped_sources = []

        if source:
            if source not in self._crawlers:
                return {
                    "source": source or "",
                    "status": "failed",
                    "total": 0,
                    "inserted": 0,
                    "updated": 0,
                    "message": f"未知数据源: {source}",
                    "results": []
                }
            crawler = self._crawlers[source]
            logger.info(f"运行爬虫: {source}, sync_type={typed_sync.value}")
            r = crawler.run(typed_sync).to_dict()
            all_results.append(r)
            total += r.get("total", 0)
            inserted += r.get("inserted", 0)
            updated += r.get("updated", 0)
            if r.get("status") == "failed":
                failed_count += 1
            else:
                success_count += 1
            overall = r.get("status", "success")
        else:
            logger.info(f"运行全部爬虫, sync_type={typed_sync.value}")
            run_names = []
            if enabled_sources:
                for name in enabled_sources:
                    if name in self._crawlers:
                        run_names.append(name)
                    else:
                        skipped_sources.append(name)
            else:
                run_names = list(self._crawlers.keys())

            if not run_names:
                return {
                    "source": "all", "status": "failed",
                    "total": 0, "inserted": 0, "updated": 0,
                    "message": "没有配置任何启用的数据源",
                    "results": []
                }

            for name in run_names:
                try:
                    r = self._crawlers[name].run(typed_sync).to_dict()
                except Exception as e:
                    logger.exception(f"爬虫 {name} 执行异常")
                    r = {
                        "source": name,
                        "status": "failed",
                        "message": f"爬虫执行异常: {e}",
                        "error": str(e),
                        "total": 0, "inserted": 0, "updated": 0
                    }
                all_results.append(r)
                total += r.get("total", 0) or 0
                inserted += r.get("inserted", 0) or 0
                updated += r.get("updated", 0) or 0
                if r.get("status") == "failed":
                    failed_count += 1
                else:
                    success_count += 1

            # 部分成功/部分失败
            if success_count > 0 and failed_count > 0:
                overall = "partial"
            elif failed_count > 0 and success_count == 0:
                overall = "failed"
            else:
                overall = "success"

        summary = f"爬虫执行完成: 总记录 {total}, 新增 {inserted}, 更新/跳过 {updated}"
        if skipped_sources:
            summary += f" (已跳过未启用数据源: {', '.join(skipped_sources)})"
        return {
            "source": source if source else "all",
            "status": overall,
            "total": total,
            "inserted": inserted,
            "updated": updated,
            "message": summary,
            "results": all_results,
            "success_count": success_count,
            "failed_count": failed_count,
        }


# 全局单例
crawler_manager = CrawlerManager()