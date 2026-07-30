@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ============================================================
echo    spiderV5 —— Windows 一键部署
echo ============================================================
echo.

echo 本脚本将依次执行：
echo   [1/5] 创建 MySQL 数据库 warehouse_data
echo   [2/5] 生成配置文件 backend\.env 并创建目录
echo   [3/5] 安装 Python 依赖
echo   [4/5] 初始化数据库表结构
echo   [5/5] 启动 FastAPI 服务
echo.
echo 运行前请确保：
echo   1. 已安装 Python 3.8+ 并加入 PATH
echo   2. 已安装 MySQL 5.7 / 8.0 并启动
echo   3. 已知 MySQL root 账号密码
echo.
pause

cd /d "%~dp0"
cd ..

call "%~dp01_install_mysql.bat
if errorlevel 1 (
    echo [警告] 数据库步骤出错，请检查 MySQL 连接。
    pause
    exit /b 1
)

call "%~dp02_config.bat
call "%~dp03_install_python_deps.bat
call "%~dp04_init_database.bat
call "%~dp05_start_server.bat

endlocal