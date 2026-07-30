@echo off
REM ============================================================
REM Step 1: Create MySQL database and user (safe ASCII version)
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Setup Step 1 - Create MySQL Database
echo ============================================================
echo.

where mysql >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 'mysql' command not found in PATH.
    echo         Install MySQL and add its bin folder to system PATH.
    echo         Default: C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo.
    pause
    exit /b 1
)

echo [INFO] Running mysql client found at:
where mysql

echo.
set /p MYSQL_PWD="Enter MySQL root password (will NOT be echoed): "

echo.
echo [INFO] Creating database 'warehouse_data'...
mysql --default-character-set=utf8mb4 -h 127.0.0.1 -P 3306 -u root -p%MYSQL_PWD% < "windows_setup\sql\create_database.sql"

if errorlevel 1 (
    echo.
    echo [ERROR] MySQL failed. Please check:
    echo           - MySQL service running on 127.0.0.1:3306
    echo           - Correct root password
    echo           - Firewall blocking port 3306
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Database 'warehouse_data' created successfully.
echo.
endlocal