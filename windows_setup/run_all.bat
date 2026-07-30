@echo off
REM ============================================================
REM SpiderV5 - One-Click Deployment for Windows
REM   Runs steps 1 to 5 in sequence.
REM   Prerequisites:
REM     - Python 3.8+ in PATH
REM     - MySQL 5.7/8.0 running on 127.0.0.1:3306
REM     - Know MySQL root password
REM ============================================================
setlocal

chcp 65001 >nul

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo   spiderV5 - One-Click Windows Deployment
echo ============================================================
echo.
echo This script will run the following steps:
echo   [1/5] Create MySQL database `warehouse_data`
echo   [2/5] Generate backend\.env config and folders
echo   [3/5] Install Python dependencies (via Tsinghua mirror)
echo   [4/5] Initialize database tables
echo   [5/5] Start FastAPI server on http://localhost:8000
echo.
pause

echo.
echo --- Step 1/5: Create MySQL database ---
call "windows_setup\step1_create_mysql_db.bat"
if errorlevel 1 (
    echo [ERROR] Step 1 failed. Check MySQL connection/password and retry.
    pause
    exit /b 1
)

echo.
echo --- Step 2/5: Generate configuration ---
call "windows_setup\step2_configure_env.bat"

echo.
echo --- Step 3/5: Install Python dependencies ---
call "windows_setup\step3_install_python_deps.bat"
if errorlevel 1 (
    echo [ERROR] Step 3 failed. Check network and retry.
    pause
    exit /b 1
)

echo.
echo --- Step 4/5: Initialize database tables ---
call "windows_setup\step4_init_db_tables.bat"
if errorlevel 1 (
    echo [ERROR] Step 4 failed. Check backend\.env DB settings.
    pause
    exit /b 1
)

echo.
echo --- Step 5/5: Start FastAPI server ---
call "windows_setup\step5_start_server.bat"

endlocal