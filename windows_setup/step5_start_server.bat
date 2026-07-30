@echo off
REM ============================================================
REM Step 5: Start FastAPI server on Windows
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Setup Step 5 - Start FastAPI Server
echo ============================================================
echo.

if not exist "backend\.env" (
    echo [WARNING] backend\.env not found - running step2...
    call "windows_setup\step2_configure_env.bat"
)

echo [INFO] Server will start. Open http://localhost:8000 in your browser.
echo [INFO] Press Ctrl+C to stop.
echo.
echo ============================================================
echo.

python backend\main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Server failed to start. Review the output above.
    echo.
    pause
)

endlocal