@echo off
cd /d "%~dp0"

echo Starting Customer Segmentation web app...
echo.

python -m pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing Python dependencies...
    python -m pip install --user -r requirements.txt
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
    echo Server is already running.
    start "" "http://127.0.0.1:8000"
    exit /b 0
)

start "Customer Segmentation Server" /D "%~dp0" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 3 >nul
start "" "http://127.0.0.1:8000"

echo.
echo Web app opened at http://127.0.0.1:8000
echo Close the server window when you are done.
