@echo off
REM ============================================================
REM Step 3: Install Python dependencies
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Setup Step 3 - Install Python Dependencies
echo ============================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 'python' not found in PATH.
    echo         Install Python 3.8+ and check "Add Python to PATH".
    pause
    exit /b 1
)

python --version

echo.
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

echo.
echo [INFO] Installing packages (using Tsinghua mirror for speed)...
python -m pip install -r backend\requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn

if errorlevel 1 (
    echo.
    echo [WARNING] Mirror failed, retrying with default PyPI...
    python -m pip install -r backend\requirements.txt
)

if errorlevel 1 (
    echo.
    echo [ERROR] Dependency installation failed. Check network and retry.
    pause
    exit /b 1
)

echo.
echo [OK] Python dependencies installed.
echo.
endlocal