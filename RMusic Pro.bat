@echo off
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"
title RMusic Pro Max - Launcher

echo [SYSTEM] Temizlik yapiliyor (Port 5178)...
:: Port 5178'i kullanan node/electron sureclerini temizle
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5178') do taskkill /f /pid %%a >nul 2>&1

echo [SYSTEM] Uygulama baslatiliyor...
cd dashboard-v2
npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERR] Uygulama baslatilirken bir hata olustu!
    pause
)
exit
