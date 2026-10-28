@echo off
setlocal enabledelayedexpansion
title EduRetain - System Bootstrapper
color 0B

echo ===============================================================================
echo                EduRetain: AI-Powered Student Dropout System
echo ===============================================================================
echo.

:: -----------------------------------------------------------------------------
:: Step 1: Environment & Runtime Verification
:: -----------------------------------------------------------------------------
echo [1/8] Verifying required runtimes (Node.js, npm, Python)...

:: Clean up any leftover processes on EduRetain ports before starting
for %%p in (5000 8000 5173 27017) do (
    for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr ":%%p "') do (
        if not "%%a"=="0" (
            taskkill /f /pid %%a >nul 2>&1
        )
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ===============================================================================
    echo [ERROR] Node.js is not found on your system PATH!
    echo Please install Node.js ^(v18 or newer^) from: https://nodejs.org
    echo After installing, restart this script.
    echo ===============================================================================
    goto fatal_error
)

where npm.cmd >nul 2>&1
if %errorlevel% neq 0 (
    where npm >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo ===============================================================================
        echo [ERROR] npm is not found on your system PATH!
        echo Please ensure npm is installed and added to PATH.
        echo ===============================================================================
        goto fatal_error
    )
)

:: Detect Python or Python launcher (py)
set "PYTHON_CMD="
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
) else (
    py -3 --version >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=py -3"
    ) else (
        echo [INFO] Python not found on PATH. The backend will use rule-based fallback.
    )
)

echo [OK] Runtime checks passed.

:: -----------------------------------------------------------------------------
:: Step 2: Environment (.env) Configuration Check
:: -----------------------------------------------------------------------------
echo [2/8] Checking environment configuration files...

if not exist "%~dp0logs" (
    mkdir "%~dp0logs"
)

if not exist "%~dp0server\.env" (
    if exist "%~dp0server\.env.example" (
        echo [CONFIG] Creating server\.env from .env.example...
        copy "%~dp0server\.env.example" "%~dp0server\.env" >nul
    )
)

if not exist "%~dp0client\.env" (
    if exist "%~dp0client\.env.example" (
        echo [CONFIG] Creating client\.env from .env.example...
        copy "%~dp0client\.env.example" "%~dp0client\.env" >nul
    )
)

if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
    )
)

echo [OK] Configuration files verified.

:: -----------------------------------------------------------------------------
:: Step 3: Dependencies Verification (server, client, ml-service)
:: -----------------------------------------------------------------------------
echo [3/8] Checking dependencies...

if not exist "%~dp0server\node_modules" (
    echo [INSTALL] Installing server dependencies ^(npm install^)...
    cd /d "%~dp0server"
    call npm.cmd install
    if errorlevel 1 goto fatal_error
    cd /d "%~dp0"
)

if not exist "%~dp0client\node_modules" (
    echo [INSTALL] Installing client dependencies ^(npm install^)...
    cd /d "%~dp0client"
    call npm.cmd install
    if errorlevel 1 goto fatal_error
    cd /d "%~dp0"
)

set "ML_PYTHON="
if defined PYTHON_CMD (
    echo [ML Service] Checking Python ML environment...
    cd /d "%~dp0ml-service"
    if not exist "%~dp0ml-service\venv" (
        echo [ML Service] Creating virtual environment ^(venv^)...
        %PYTHON_CMD% -m venv venv >nul 2>&1
        if exist "%~dp0ml-service\venv\Scripts\pip.exe" (
            echo [ML Service] Installing ML dependencies ^(pip install^)...
            "%~dp0ml-service\venv\Scripts\pip.exe" install -r requirements.txt >nul 2>&1
        )
    )

    :: Test if venv runs without policy restrictions
    if exist "%~dp0ml-service\venv\Scripts\python.exe" (
        "%~dp0ml-service\venv\Scripts\python.exe" -c "import app" >nul 2>&1
        if !errorlevel! equ 0 (
            set "ML_PYTHON=%~dp0ml-service\venv\Scripts\python.exe"
        )
    )

    :: If venv failed or blocked by policy, test system python
    if not defined ML_PYTHON (
        %PYTHON_CMD% -c "import app" >nul 2>&1
        if !errorlevel! equ 0 (
            set "ML_PYTHON=%PYTHON_CMD%"
        ) else (
            echo [ML Service] Python ML libraries not fully installed in environment.
            echo [ML Service] Backend will use built-in rule-based scoring engine.
        )
    )
    cd /d "%~dp0"
)

echo [OK] Dependencies verified.

:: -----------------------------------------------------------------------------
:: Step 4: Start MongoDB Database Engine
:: -----------------------------------------------------------------------------
echo [4/8] Starting MongoDB Database Engine (Port 27017)...
start "EduRetain - MongoDB Database" cmd /k call "%~dp0server\run_mongo.bat"

:: Wait for MongoDB on port 27017
set /a MONGO_WAIT=0
:wait_mongo
node -e "const s = require('net').connect(27017, '127.0.0.1').on('connect', () => { s.destroy(); process.exit(0); }).on('error', () => process.exit(1));" >nul 2>&1
if !errorlevel! equ 0 goto mongo_ready
ping 127.0.0.1 -n 2 >nul 2>&1
set /a MONGO_WAIT+=1
if !MONGO_WAIT! geq 25 (
    echo [ERROR] MongoDB did not respond on port 27017 within 25 seconds.
    goto fatal_error
)
goto wait_mongo
:mongo_ready
echo [OK] MongoDB is ready on port 27017.

:: -----------------------------------------------------------------------------
:: Step 5: Seed Database (First-run check)
:: -----------------------------------------------------------------------------
echo [5/8] Checking database status and seeding if empty...
cd /d "%~dp0server"
node src/seeders/seed.js
if !errorlevel! neq 0 echo [WARNING] Database seeder returned a warning or error, continuing startup...
cd /d "%~dp0"
echo [OK] Database status verified.

:: -----------------------------------------------------------------------------
:: Step 6: Start ML Microservice (FastAPI on Port 8000)
:: -----------------------------------------------------------------------------
if not defined ML_PYTHON goto skip_ml

echo [6/8] Starting Python FastAPI ML Microservice (Port 8000)...
start "EduRetain - ML Service (FastAPI)" cmd /k call "%~dp0ml-service\run_ml.bat" "!ML_PYTHON!"

set /a ML_WAIT=0
:wait_ml
node -e "fetch('http://127.0.0.1:8000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >nul 2>&1
if !errorlevel! equ 0 goto ml_ready
ping 127.0.0.1 -n 2 >nul 2>&1
set /a ML_WAIT+=1
if !ML_WAIT! geq 15 (
    echo [ML Service] Notice: ML service did not respond within 15s. Express will use rule-based fallback.
    goto ml_done
)
goto wait_ml
:ml_ready
echo [OK] Python ML Microservice is healthy at http://127.0.0.1:8000/health
goto ml_done

:skip_ml
echo [6/8] Skipping Python ML Microservice (Rule-based fallback active in backend).
:ml_done

:: -----------------------------------------------------------------------------
:: Step 7: Start Express Backend API (Port 5000)
:: -----------------------------------------------------------------------------
echo [7/8] Starting Node.js Express REST API and WebSockets (Port 5000)...
start "EduRetain - Backend API (Express)" cmd /k call "%~dp0server\run_server.bat"

:: Wait for Express API on http://127.0.0.1:5000/api/health (retry loop up to 90s, checking every 2s)
echo [WAIT] Checking backend health at http://127.0.0.1:5000/api/health (up to 90s)...
set /a API_WAIT=0
set /a API_MAX_RETRIES=45

:wait_api
set "HTTP_CODE="
where curl >nul 2>&1
if !errorlevel! equ 0 (
    for /f "delims=" %%c in ('curl -s -o NUL -w "%%{http_code}" http://127.0.0.1:5000/api/health 2^>nul') do (
        set "HTTP_CODE=%%c"
    )
    if "!HTTP_CODE!"=="200" goto api_ready
) else (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5000/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if !errorlevel! equ 0 goto api_ready
)

ping 127.0.0.1 -n 3 >nul 2>&1
set /a API_WAIT+=1
if !API_WAIT! geq !API_MAX_RETRIES! (
    echo.
    echo ===============================================================================
    echo [ERROR] Backend API did not respond at http://127.0.0.1:5000/api/health within 90 seconds.
    echo ===============================================================================
    echo Displaying the last 30 lines of logs\server.log:
    echo -------------------------------------------------------------------------------
    if exist "%~dp0logs\server.log" (
        powershell -NoProfile -Command "Get-Content '%~dp0logs\server.log' -Tail 30"
    ) else (
        echo [ERROR] Log file %~dp0logs\server.log was not found.
    )
    echo ===============================================================================
    goto fatal_error
)
goto wait_api

:api_ready
echo [OK] Backend API is online at http://127.0.0.1:5000/api/health

:: -----------------------------------------------------------------------------
:: Step 8: Start React + Vite Frontend (Port 5173)
:: -----------------------------------------------------------------------------
echo [8/8] Starting React + Vite Frontend (Port 5173)...
start "EduRetain - Web Client (Vite)" cmd /k call "%~dp0client\run_client.bat"

:: Wait for Vite dev server on http://127.0.0.1:5173 (retry up to 45s, checking every 2s)
echo [WAIT] Checking web client health at http://127.0.0.1:5173 (up to 45s)...
set /a CLIENT_WAIT=0
:wait_client
set "CLIENT_CODE="
where curl >nul 2>&1
if !errorlevel! equ 0 (
    for /f "delims=" %%c in ('curl -s -o NUL -w "%%{http_code}" http://127.0.0.1:5173 2^>nul') do (
        set "CLIENT_CODE=%%c"
    )
    if "!CLIENT_CODE!"=="200" goto client_ready
) else (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if !errorlevel! equ 0 goto client_ready
)

ping 127.0.0.1 -n 3 >nul 2>&1
set /a CLIENT_WAIT+=1
if !CLIENT_WAIT! geq 25 (
    echo.
    echo ===============================================================================
    echo [ERROR] Web Client did not respond at http://127.0.0.1:5173 within 50 seconds.
    echo ===============================================================================
    if exist "%~dp0logs\client.log" (
        echo Displaying the last 30 lines of logs\client.log:
        powershell -NoProfile -Command "Get-Content '%~dp0logs\client.log' -Tail 30"
    )
    goto fatal_error
)
goto wait_client

:client_ready
echo [OK] Web Client is online at http://127.0.0.1:5173

:: Open application in default browser
echo.
echo Opening EduRetain Dashboard in your default browser...
start http://localhost:5173

echo.
echo ===============================================================================
echo                      EduRetain is NOW RUNNING!
echo ===============================================================================
echo   - Frontend Portal:  http://localhost:5173 (or http://127.0.0.1:5173)
echo   - Backend REST API: http://127.0.0.1:5000/api (or http://localhost:5000/api)
echo   - Python ML API:    http://127.0.0.1:8000/docs
echo   - Logs Location:    %~dp0logs\
echo.
echo -------------------------------------------------------------------------------
echo                     PRODUCTION AUTHENTICATION & ACCESS
echo -------------------------------------------------------------------------------
echo   - Student & Mentor Self-Registration: http://localhost:5173/register
echo   - Initial Administrator Account:
echo       Configured via ADMIN_EMAIL and ADMIN_PASSWORD in server/.env
echo       (Default: admin@eduretain.com / Admin@123)
echo   - Mentor accounts require approval in Admin - User Management.
echo -------------------------------------------------------------------------------

echo To stop all services, run stop_app.bat or close the console windows.
echo ===============================================================================
echo.
if "%~1"=="--no-pause" goto finish
pause
:finish
exit /b 0

:fatal_error
echo.
echo ===============================================================================
echo [FATAL ERROR] EduRetain failed to start properly.
echo Please review the error message above or examine log files in %~dp0logs\
echo ===============================================================================
pause
exit /b 1
