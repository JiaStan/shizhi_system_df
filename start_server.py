# -*- coding: utf-8 -*-
"""
spiderV5 服务器启动脚本
解决 Windows 上 Ctrl+C 无法正常关闭进程的问题
"""

import sys
import os
import signal
import subprocess
import time
import threading

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import settings
from backend.logger import logger


class ServerManager:
    """服务器管理器，处理启动和优雅关闭"""
    
    def __init__(self):
        self._process = None
        self._stop_event = threading.Event()
        self._monitor_thread = None
    
    def start(self):
        """启动服务器"""
        logger.info(f"启动 spiderV5 服务器: http://{settings.SERVER_HOST}:{settings.SERVER_PORT}")
        
        python_path = os.path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe")
        main_path = os.path.join(PROJECT_ROOT, "backend", "main.py")
        
        self._process = subprocess.Popen(
            [python_path, main_path],
            cwd=str(PROJECT_ROOT),
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
        )
        
        logger.info(f"服务器进程已启动，PID: {self._process.pid}")
        
        # 启动监控线程
        self._monitor_thread = threading.Thread(target=self._monitor)
        self._monitor_thread.start()
    
    def _monitor(self):
        """监控进程状态"""
        while not self._stop_event.is_set():
            try:
                result = self._process.poll()
                if result is not None:
                    logger.info(f"服务器进程已退出，返回码: {result}")
                    break
                time.sleep(1)
            except Exception as e:
                logger.error(f"监控进程异常: {e}")
                break
    
    def stop(self):
        """优雅停止服务器"""
        logger.info("正在停止服务器...")
        self._stop_event.set()
        
        if self._process:
            try:
                if sys.platform == "win32":
                    # Windows 上使用 Ctrl+C 信号
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", str(self._process.pid)],
                        capture_output=True,
                    )
                else:
                    self._process.send_signal(signal.SIGTERM)
                    time.sleep(2)
                    if self._process.poll() is None:
                        self._process.kill()
                
                logger.info("服务器已停止")
            except Exception as e:
                logger.error(f"停止服务器失败: {e}")
        
        if self._monitor_thread:
            self._monitor_thread.join(timeout=3)


def main():
    manager = ServerManager()
    
    def handle_exit(signum, frame):
        logger.info(f"收到信号 {signum}，正在关闭服务器...")
        manager.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    
    try:
        manager.start()
        # 主线程等待
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("收到 Ctrl+C，正在关闭服务器...")
        manager.stop()


if __name__ == "__main__":
    main()
