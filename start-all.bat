@echo off
echo =====================================================
echo  PackGuard AI - Legal Metrology Compliance System
echo  Starting all services...
echo =====================================================
echo.

REM Start Python AI Service (Port 8000)
echo [1/3] Starting Python AI Service (PaddleOCR + Groq + FastAPI)...
start AI Service - Port 8000 cmd /k cd /d %~dp0ai-service && (if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) else echo Using system Python) && python main.py

timeout /t 5 /nobreak >nul

REM Start Node.js Backend (Port 5000)
echo [2/3] Starting Node.js Backend (Express + JWT - Port 5000)...
start Backend - Port 5000 cmd /k cd /d %~dp0backend && node server.js

timeout /t 3 /nobreak >nul

REM Start React Frontend (Port 5173)
echo [3/3] Starting React Frontend (Vite - Port 5173)...
start Frontend - Port 5173 cmd /k cd /d %~dp0frontend && npm run dev

echo.
echo =====================================================
echo  All services launched!
echo  Frontend:   http://localhost:5173
echo  Backend:    http://localhost:5000
echo  AI Service: http://localhost:8000
echo =====================================================
pause
