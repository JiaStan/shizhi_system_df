@echo off
REM ============================================================
REM Step 5: Start the FastAPI server
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Windows Setup - Step 5/5: Start FastAPI Server
echo ============================================================
echo.

if not exist "backend\.env" (
    echo [WARNING] backend\.env not found, running 2_config.bat first...
    call "windows_setup\2_config.bat
)

echo [INFO] Starting spiderV5 backend server...
echo        Open browser at: http://localhost:8000
echo        Press Ctrl+C to stop.
echo.

echo ============================================================
python backend\main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start. Please check above messages.
    echo.
    pause
)

endlocal