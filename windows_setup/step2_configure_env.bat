@echo off
REM ============================================================
REM Step 2: Generate backend\.env and create runtime directories
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Setup Step 2 - Generate Configuration
echo ============================================================
echo.

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo [INFO] Copied backend\.env.example to backend\.env
) else (
    echo [INFO] backend\.env already exists - keeping current values.
)

if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
echo [INFO] Ensured directories exist: logs\, uploads\

echo.
echo ------------------------------------------------------------
echo  Edit backend\.env and set your MySQL credentials:
echo    DB_HOST=127.0.0.1
echo    DB_PORT=3306
echo    DB_USER=root          (or spider_v5)
echo    DB_PASSWORD=YOUR_MYSQL_ROOT_PASSWORD
echo    DB_DATABASE=warehouse_data
echo    SERVER_PORT=8000
echo ------------------------------------------------------------
echo.

:ASK_EDIT
set "choice="
set /p "choice=Open backend\.env in Notepad now? [Y/N]: "
if /i "%choice%"=="Y" (
    notepad "backend\.env"
    goto DONE
)
if /i "%choice%"=="N" goto DONE
goto ASK_EDIT

:DONE
echo.
echo [OK] Configuration ready.
echo.
endlocal