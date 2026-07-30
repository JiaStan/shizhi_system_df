# -*- coding: utf-8 -*-
from fastapi import APIRouter

from backend.crawlers.crawler_manager import crawler_manager
from backend.logger import get_logger
from backend.system.credentials import (
    get_crawler_config, save_crawler_config,
    update_crawler_run_status, update_crawler_last_full_run,
)

logger = get_logger("crawler.router")

router = APIRouter()


def _notify_scheduler_config_changed():
    """通知调度器配置已变更"""
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_service.reconfigure()
    except Exception:
        pass


def _notify_scheduler_pause():
    """通知调度器暂停"""
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_service.pause()
    except Exception:
        pass


def _notify_scheduler_resume():
    """通知调度器恢复"""
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_service.resume()
    except Exception:
        pass


@router.get("/config")
def read_crawler_config():
    """读取爬虫同步配置"""
    return {"success": True, "data": get_crawler_config()}


@router.post("/config")
def save_crawler_config_endpoint(req: dict = None):
    """保存爬虫同步配置"""
    try:
        saved = save_crawler_config(req or {})
        _notify_scheduler_config_changed()
        return {"success": True, "data": saved, "message": "配置已保存"}
    except Exception as e:
        logger.error(f"保存爬虫配置异常: {e}")
        return {"success": False, "error": str(e)}


@router.get("/status")
def get_all_status():
    """获取所有爬虫状态（含当前配置）"""
    return {
        "success": True,
        "data": {
            "crawlers": crawler_manager.get_all(),
            "config": get_crawler_config(),
            "sources": crawler_manager.list_sources(),
        }
    }


@router.get("/status/{source}")
def get_source_status(source: str):
    """获取指定爬虫状态"""
    return {"success": True, "data": crawler_manager.get_status(source)}


@router.get("/task/{task_id}")
def get_task(task_id: str):
    """获取指定任务的元信息（running/result/end_time 等）"""
    task = crawler_manager.get_task(task_id)
    if not task:
        return {"success": False, "error": f"任务 {task_id} 不存在"}
    return {"success": True, "data": task}


@router.post("/run")
def run_crawler(req: dict = None):
    """异步执行爬虫（立即返回 task_id，前端通过 /crawlers/status 轮询日志）

    请求体字段（可选）：
    - source: 数据源名称，不传则全部执行
    - sync_type / mode: auto/full/incremental
    - enabled_sources: 启用的数据源列表
    - force_full: 强制全量
    - blocking: true 则同步阻塞（兼容旧模式），默认 false 异步
    """
    try:
        params = req or {}
        source = params.get("source") or params.get("crawler") or params.get("name")
        sync_type = params.get("sync_type") or params.get("mode") or params.get("type") or "auto"
        if params.get("force_full"):
            sync_type = "full"

        # enabled_sources 优先级：请求传入 > 数据库配置；单源运行时忽略
        enabled_sources = params.get("enabled_sources")
        if not source and not enabled_sources:
            cfg = get_crawler_config()
            enabled_sources = cfg.get("enabled_sources_list") or []

        # 默认异步（非阻塞），便于前端实时日志
        blocking = bool(params.get("blocking", False))

        if blocking:
            # 兼容旧模式：同步阻塞
            result = crawler_manager.run(
                source=source,
                sync_type=sync_type,
                enabled_sources=enabled_sources if not source else None,
            )
            update_crawler_run_status(result.get("status") or "")
            if sync_type == "full":
                update_crawler_last_full_run()
            return {"success": True, "data": result, "message": "爬虫执行完成"}
        else:
            # 暂停调度器，避免与手动触发冲突
            _notify_scheduler_pause()

            # 异步：立即返回 task_id，让前端轮询
            task_info = crawler_manager.run_async(
                source=source,
                sync_type=sync_type,
                enabled_sources=enabled_sources if not source else None,
            )

            return {
                "success": True,
                "async": True,
                "task_id": task_info.get("task_id"),
                "message": "爬虫任务已在后台启动，约每 2 秒刷新一次运行日志",
            }
    except Exception as e:
        logger.exception("run_crawler 异常")
        _notify_scheduler_resume()
        return {"success": False, "error": str(e), "message": "爬虫执行失败"}


@router.get("/summary")
def summary():
    """爬虫执行摘要（用于页面顶部信息栏）"""
    cfg = get_crawler_config()
    statuses = crawler_manager.get_all()
    total = 0
    for s in statuses:
        if isinstance(s, dict):
            total += s.get("total", 0) or 0

    scheduler_status = {}
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_status = scheduler_service.get_status()
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "config": cfg,
            "crawlers": statuses,
            "source_count": len(statuses),
            "total": total,
            "is_running": crawler_manager.is_any_running(),
            "scheduler": scheduler_status,
        }
    }


@router.post("/start_scheduler")
def start_scheduler():
    """启动自动调度器（按配置间隔自动执行增量同步）"""
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_service.start()
        return {"success": True, "message": "自动调度器已启动"}
    except Exception as e:
        logger.error(f"启动调度器异常: {e}")
        return {"success": False, "error": str(e)}


@router.post("/stop_scheduler")
def stop_scheduler():
    """停止自动调度器（停止后不再自动执行增量同步）"""
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_service.stop()
        return {"success": True, "message": "自动调度器已停止"}
    except Exception as e:
        logger.error(f"停止调度器异常: {e}")
        return {"success": False, "error": str(e)}


@router.post("/stop")
def stop_crawler(req: dict = None):
    """停止正在运行的爬虫任务

    请求体字段（可选）：
    - source: 停止指定数据源的爬虫；不传则停止全部
    """
    try:
        params = req or {}
        source = params.get("source")
        if source:
            result = crawler_manager.stop_source(source)
            if not result.get("success"):
                return {"success": False, "error": result.get("error")}
            return {"success": True, "data": result, "message": result.get("message", "已请求停止")}
        else:
            crawler_manager.request_stop()
            _notify_scheduler_resume()
            return {"success": True, "message": "已请求停止所有爬虫任务"}
    except Exception as e:
        logger.exception("stop_crawler 异常")
        return {"success": False, "error": str(e), "message": "停止失败"}