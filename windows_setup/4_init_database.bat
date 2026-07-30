@echo off
REM ============================================================
REM Step 4: Initialize database table structures
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Windows Setup - Step 4/5: Initialize Database Tables
echo ============================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 'python' not found in PATH.
    pause
    exit /b 1
)

if not exist "backend\.env" (
    echo [WARNING] backend\.env not found, running 2_config.bat first...
    call "windows_setup\2_config.bat
)

echo [INFO] Running backend\scripts\init_db.py ...
echo.
python backend\scripts\init_db.py

if errorlevel 1 (
    echo.
    echo [ERROR] Database init failed.
    echo         Common causes:
    echo           - backend\.env has wrong DB_PASSWORD
    echo           - MySQL is not running or warehouse_data db missing
    echo         Please check and retry.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Database tables initialized successfully. Next step: 5_start_server.bat
echo.
endlocal