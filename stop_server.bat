@echo off
echo 正在查找并关闭服务器进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do (
    taskkill /F /PID %%a
    echo 已关闭进程 PID: %%a
)
echo 完成！
pause