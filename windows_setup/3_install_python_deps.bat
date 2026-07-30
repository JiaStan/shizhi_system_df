@echo off
REM ============================================================
REM Step 3: Install Python dependencies
REM ============================================================
setlocal

cd /d "%~dp0"
cd ..

echo.
echo ============================================================
echo  SpiderV5 Windows Setup - Step 3/5: Install Python Dependencies
echo ============================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 'python' not found in PATH.
    echo         Please install Python 3.8+ from https://www.python.org/downloads/
    echo         and tick "Add Python to PATH" during installation.
    pause
    exit /b 1
)

python --version
echo.
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

echo.
echo [INFO] Installing packages from backend\requirements.txt using Tsinghua mirror...
python -m pip install -r backend\requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn

if errorlevel 1 (
    echo.
    echo [WARNING] Mirror failed, retrying with default PyPI...
    python -m pip install -r backend\requirements.txt
)

if errorlevel 1 (
    echo.
    echo [ERROR] Python dependency installation failed. Please check network or install manually.
    pause
    exit /b 1
)

echo.
echo [OK] Python dependencies installed successfully. Next step: 4_init_database.bat
echo.
endlocal