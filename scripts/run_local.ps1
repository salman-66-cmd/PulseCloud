# PowerShell script to run PulseCloud locally without Docker
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting PulseCloud - Cloud API Health & Performance Monitor" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend in new window
Write-Host "`n[1/2] Starting Backend API Server (FastAPI on http://127.0.0.1:8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend'; .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

# 2. Start Frontend in new window
Write-Host "[2/2] Starting Frontend Dev Server (Vite on http://localhost:5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\frontend'; cmd /c npm run dev"

Write-Host "`nPulseCloud is launching!" -ForegroundColor Yellow
Write-Host "Frontend Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API Docs:   http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "Demo Admin Login:   admin@pulsecloud.io / Admin123!" -ForegroundColor White
