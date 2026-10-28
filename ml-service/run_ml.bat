@echo off
title EduRetain - ML Service (FastAPI)
cd /d "%~dp0"
set "PY_CMD=%~1"
if "%PY_CMD%"=="" (
    if exist "%~dp0venv\Scripts\python.exe" (
        set "PY_CMD=%~dp0venv\Scripts\python.exe"
    ) else (
        set "PY_CMD=python"
    )
)
("%PY_CMD%" -m uvicorn app:app --host 127.0.0.1 --port 8000) 2>&1 | node "%~dp0..\scripts\tee.js" "%~dp0..\logs\ml.log"
pause
