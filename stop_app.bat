@echo off
title EduRetain - Stopping Services
color 0C

echo ===============================================================================
echo                      EduRetain: Stopping Services...
echo ===============================================================================
echo.

:: 1. Terminate titled windows
echo [1/2] Terminating EduRetain console windows...
taskkill /f /fi "WINDOWTITLE eq EduRetain - *" >nul 2>&1

:: 2. Terminate any orphan processes on ports (5000, 8000, 5173, 27017)
echo [2/2] Freeing ports (5000, 8000, 5173, 27017)...
for %%p in (5000 8000 5173 27017) do (
    for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr ":%%p "') do (
        if not "%%a"=="0" (
            taskkill /f /pid %%a >nul 2>&1
        )
    )
)

echo.
echo ===============================================================================
echo               Done! All EduRetain services have been stopped.
echo ===============================================================================
ping 127.0.0.1 -n 3 >nul 2>&1
