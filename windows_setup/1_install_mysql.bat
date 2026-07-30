@echo off
REM ============================================================
REM Step 1: Create MySQL database and user
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Windows Setup - Step 1/5: Create MySQL Database
echo ============================================================
echo.

where mysql >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 'mysql' command not found in PATH.
    echo         Please install MySQL first, or add its bin directory to PATH.
    echo         MySQL default install path: C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo.
    pause
    exit /b 1
)

echo Please enter your MySQL root password (input is hidden):
echo.
set "MYSQL_PWD="
set "psCmd=powershell -Command "$pwd = read-host 'Enter MySQL root password' -AsSecureString; $BSTR=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd); [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)""
for /f "usebackq delims=" %%I in (`%psCmd%`) do set "MYSQL_PWD=%%I"

echo.
echo [INFO] Connecting to MySQL and creating database 'warehouse_data'...
mysql --default-character-set=utf8mb4 -h 127.0.0.1 -P 3306 -u root -p%MYSQL_PWD% < "windows_setup\sql\create_database.sql"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to connect to MySQL or execute SQL.
    echo         Possible reasons:
    echo           - Wrong password
    echo           - MySQL service is not running on 127.0.0.1:3306
    echo           - root user cannot login from localhost
    echo         Please fix and retry.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Database 'warehouse_data' created successfully.
echo      Next step: 2_config.bat
echo.
endlocal