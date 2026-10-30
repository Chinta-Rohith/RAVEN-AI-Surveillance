@echo off
title RAVEN Surveillance - Backend & Cloudflare Tunnel
echo ===================================================
echo   RAVEN Surveillance Backend & Tunnel Launcher
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting RAVEN FastAPI Backend on http://localhost:8000...
start "RAVEN Uvicorn Backend" cmd /k "backend\venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 >nul

echo [2/2] Starting Cloudflare Public Tunnel...
echo.
echo ===================================================
echo COPY THE trycloudflare.com URL DISPLAYED BELOW!
echo ===================================================
echo.
cloudflared.exe tunnel --url http://localhost:8000
pause
