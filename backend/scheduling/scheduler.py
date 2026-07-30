# -*- coding: utf-8 -*-
"""
后端定时调度器
负责根据系统配置自动执行爬虫任务，独立于前端页面运行。
"""

import threading
import time
from datetime import datetime

from backend.logger import get_logger

logger = get_logger("scheduler")


class SchedulerService:
    """后端爬虫定时调度器

    设计原则：
    - 在后端独立运行，不受前端页面刷新影响
    - 从数据库读取配置，按配置间隔自动执行
    - 配置变更后自动重建调度
    - 避免与手动触发的任务冲突
    """

    def __init__(self):
        self._thread = None
        self._stop_event = threading.Event()
        self._running = False
        self._current_interval_minutes = 0
        self._last_run_at = None
        self._paused = False

    def start(self):
        """启动调度器后台线程"""
        if self._running:
            logger.info("[Scheduler] 调度器已在运行中，跳过重复启动")
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="crawler-scheduler")
        self._thread.start()
        self._running = True
        logger.info("[Scheduler] 调度器已启动")

    def stop(self):
        """停止调度器"""
        if not self._running:
            return
        self._stop_event.set()
        self._running = False
        logger.info("[Scheduler] 调度器已停止")

    def pause(self):
        """暂停调度（手动触发任务时调用）"""
        self._paused = True
        logger.info("[Scheduler] 调度已暂停（等待手动任务完成）")

    def resume(self):
        """恢复调度"""
        self._paused = False
        logger.info("[Scheduler] 调度已恢复")

    def reconfigure(self):
        """通知调度器配置已变更，下次循环会重新读取"""
        logger.info("[Scheduler] 收到配置变更通知，将在下次循环中重载")

    def get_status(self):
        """获取调度器运行状态"""
        return {
            "running": self._running,
            "paused": self._paused,
            "interval_minutes": self._current_interval_minutes,
            "last_run_at": self._last_run_at,
        }

    def _read_config(self):
        """从数据库读取当前爬虫配置"""
        try:
            from backend.system.credentials import get_crawler_config
            return get_crawler_config()
        except Exception as e:
            logger.warning(f"[Scheduler] 读取配置失败: {e}")
            return None

    def _is_crawler_running(self):
        """检查是否有爬虫正在运行"""
        try:
            from backend.crawlers.crawler_manager import crawler_manager
            return crawler_manager.is_any_running()
        except Exception:
            return False

    def _run_loop(self):
        """调度器主循环"""
        logger.info("[Scheduler] 调度器循环已启动")

        while not self._stop_event.is_set():
            try:
                cfg = self._read_config()
                if cfg is None:
                    logger.warning("[Scheduler] 无法读取配置，30 秒后重试")
                    self._stop_event.wait(30)
                    continue

                mode = cfg.get("crawler_mode", "auto")
                interval_minutes = int(cfg.get("crawler_incremental_interval_minutes", 30) or 30)

                if mode != "auto":
                    logger.info(f"[Scheduler] 当前为手动模式，30 秒后重新检查配置")
                    self._current_interval_minutes = 0
                    self._stop_event.wait(30)
                    continue

                if interval_minutes < 1:
                    logger.warning(f"[Scheduler] 间隔配置无效 ({interval_minutes} 分钟)，使用默认 30 分钟")
                    interval_minutes = 30

                self._current_interval_minutes = interval_minutes

                # 等待间隔时间（每秒检查一次 stop_event 和 paused 状态）
                wait_seconds = interval_minutes * 60
                elapsed = 0
                while elapsed < wait_seconds and not self._stop_event.is_set():
                    if self._paused:
                        time.sleep(1)
                        continue
                    time.sleep(1)
                    elapsed += 1

                if self._stop_event.is_set():
                    break

                if self._paused:
                    continue

                # 重新读取配置（可能在等待期间被修改了）
                cfg = self._read_config()
                if cfg and cfg.get("crawler_mode") != "auto":
                    continue

                # 检查是否有爬虫正在运行
                if self._is_crawler_running():
                    logger.info("[Scheduler] 检测到爬虫正在运行，跳过本次自动执行")
                    continue

                # 执行自动增量同步
                self._execute_auto_sync()

            except Exception as e:
                logger.exception(f"[Scheduler] 调度器异常: {e}")
                self._stop_event.wait(30)

        logger.info("[Scheduler] 调度器循环已退出")

    def _execute_auto_sync(self):
        """执行自动增量同步"""
        try:
            from backend.crawlers.crawler_manager import crawler_manager
            from backend.system.credentials import (
                get_crawler_config,
                update_crawler_run_status,
            )

            cfg = get_crawler_config()
            enabled_sources = cfg.get("enabled_sources_list", [])
            if not enabled_sources:
                logger.warning("[Scheduler] 没有启用的数据源，跳过自动执行")
                return

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            logger.info(f"[Scheduler] 自动增量同步开始 @ {now_str}，数据源: {enabled_sources}")
            self._last_run_at = now_str

            result = crawler_manager.run(
                sync_type="incremental",
                enabled_sources=enabled_sources,
            )

            status = result.get("status", "unknown")
            update_crawler_run_status(status)
            logger.info(
                f"[Scheduler] 自动增量同步完成: status={status}, "
                f"total={result.get('total', 0)}, inserted={result.get('inserted', 0)}"
            )

        except Exception as e:
            logger.exception(f"[Scheduler] 自动同步执行失败: {e}")
            try:
                from backend.system.credentials import update_crawler_run_status
                update_crawler_run_status("failed")
            except Exception:
                pass


# 全局单例
scheduler_service = SchedulerService()