# -*- coding: utf-8 -*-
"""spiderV5 主应用入口。"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from backend.config import settings
from backend.logger import logger
from backend.core.exceptions import BusinessError

# 导入各模块路由
from backend.projects.router import router as projects_router
from backend.crawlers.router import router as crawlers_router
from backend.pbom.router import router as pbom_router
from backend.qr_arrival.router import router as qr_arrival_router
from backend.delivery.router import router as delivery_router
from backend.critical_parts.router import router as critical_router
from backend.scheduling.router import router as scheduling_router
from backend.system.router import router as system_router
from backend.modules.resource.router import router as resource_router

app = FastAPI(
    title="spiderV5 PBOM 智能装配系统",
    description="提供 PBOM 解析、多源到货融合、关键件风险识别与智能排程能力。",
    version="5.0.0",
)


@app.on_event("startup")
def startup_event():
    """应用启动时自动启动后端调度器"""
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_service.start()
        logger.info("后端爬虫调度器已启动")
    except Exception as e:
        logger.error(f"启动调度器失败: {e}")


@app.on_event("shutdown")
def shutdown_event():
    """应用关闭时停止调度器"""
    try:
        from backend.scheduling.scheduler import scheduler_service
        scheduler_service.stop()
        logger.info("后端爬虫调度器已停止")
    except Exception as e:
        logger.error(f"停止调度器失败: {e}")

# 生产模式：托管前端静态资源目录。
_static_dir = PROJECT_ROOT / 'static'
_index_file = _static_dir / 'index.html'
_is_frontend_available = _index_file.is_file()

if _is_frontend_available:
    logger.info(f"前端静态首页已加载: {_index_file}")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(projects_router, prefix="/api/projects", tags=["项目管理"])
app.include_router(crawlers_router, prefix="/api/crawlers", tags=["爬虫管理"])
app.include_router(pbom_router, prefix="/api/pbom", tags=["PBOM 解析匹配"])
app.include_router(qr_arrival_router, tags=["QR码现场到件"])
app.include_router(delivery_router, prefix="/api/delivery", tags=["多源去重合并"])
app.include_router(critical_router, prefix="/api/critical", tags=["关键件评分"])
app.include_router(scheduling_router, prefix="/api/schedule", tags=["BFWS排程"], include_in_schema=False)
app.include_router(system_router, prefix="/api/system", tags=["系统设置"])
app.include_router(resource_router, prefix="/api/resource", tags=["试制资源"])

# 全局异常处理
@app.exception_handler(BusinessError)
async def business_error_handler(request, exc: BusinessError):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=exc.code,
        content={"error": exc.message},
    )

@app.get("/api/health")
def health_check():
    """健康检查接口"""
    return {"status": "ok", "message": "spiderV5 PBOM 智能装配系统运行中"}

# SPA 路由回退：所有非 API 请求返回 index.html
if _is_frontend_available:
    @app.get("/")
    async def serve_index():
        from fastapi.responses import Response
        with open(_index_file, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('</body>', '<script>console.log("index.html loaded v2");</script></body>')
        return Response(content, media_type="text/html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        static_file = _static_dir / full_path
        if full_path and static_file.is_file():
            return FileResponse(static_file, headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"})
        from fastapi.responses import Response
        with open(_index_file, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('</body>', '<script>console.log("index.html loaded v2");</script></body>')
        return Response(content, media_type="text/html")

logger.info(f"spiderV5 应用初始化完成: http://{settings.SERVER_HOST}:{settings.SERVER_PORT}")

if __name__ == '__main__':
    import uvicorn
    import signal
    import atexit
    
    logger.info(f"启动服务器: http://{settings.SERVER_HOST}:{settings.SERVER_PORT}")
    
    def handle_exit(signum=None, frame=None):
        """处理进程退出，确保所有后台线程正确停止"""
        logger.info("收到退出信号，正在清理资源...")
        try:
            from backend.scheduling.scheduler import scheduler_service
            scheduler_service.stop()
            logger.info("调度器已停止")
        except Exception as e:
            logger.error(f"停止调度器失败: {e}")
        try:
            from backend.crawlers.crawler_manager import crawler_manager
            crawler_manager.request_stop()
            logger.info("爬虫管理器已停止")
        except Exception as e:
            logger.error(f"停止爬虫管理器失败: {e}")
        logger.info("资源清理完成，进程即将退出")
    
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    atexit.register(handle_exit)
    
    try:
        uvicorn.run(
            "backend.main:app",
            host=settings.SERVER_HOST,
            port=settings.SERVER_PORT,
            reload=settings.DEBUG,
            log_level="info",
        )
    except KeyboardInterrupt:
        logger.info("服务器已关闭")