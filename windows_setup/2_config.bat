@echo off
REM ============================================================
REM Step 2: Generate .env config file and create runtime dirs
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Windows Setup - Step 2/5: Generate Configuration
echo ============================================================
echo.

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo [INFO] Copied backend\.env.example to backend\.env
) else (
    echo [INFO] backend\.env already exists, keeping existing settings.
)

if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads

echo [INFO] Created runtime directories: logs\, uploads\
echo.
echo ============================================================
echo  IMPORTANT - Please edit backend\.env now.
echo ============================================================
echo.
echo Common settings to review:
echo   DB_HOST      = 127.0.0.1
echo   DB_PORT      = 3306
echo   DB_USER      = root     (or spider_v5)
echo   DB_PASSWORD  = your_mysql_password
echo   DB_DATABASE  = warehouse_data
echo   SERVER_PORT  = 8000
echo.
echo Do you want to open backend\.env in Notepad now? (Y/N)
set /p "choice=> "
if /i "%choice%"=="Y" (
    notepad "backend\.env"
)
echo.
echo [OK] Configuration ready. Next step: 3_install_python_deps.bat
echo.
endlocal