@echo off
REM ============================================================
REM Step 4: Initialize database tables via backend/scripts/init_db.py
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Setup Step 4 - Initialize Database Tables
echo ============================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 'python' not found in PATH.
    pause
    exit /b 1
)

if not exist "backend\.env" (
    echo [WARNING] backend\.env not found; running step2 first...
    call "windows_setup\step2_configure_env.bat"
)

echo [INFO] Executing backend\scripts\init_db.py ...
python backend\scripts\init_db.py

if errorlevel 1 (
    echo.
    echo [ERROR] Database initialization failed.
    echo         Common issues:
    echo           - Wrong DB_PASSWORD in backend\.env
    echo           - MySQL service not running
    echo           - warehouse_data database missing (run step1)
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Database tables initialized successfully.
echo.
endlocal