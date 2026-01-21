@echo off
REM ═══════════════════════════════════════════════════════════════
REM  RMusic Pro - Windows VM Kurulum Scripti
REM  Bu script Windows VM sunucusunda çalıştırılmalıdır
REM ═══════════════════════════════════════════════════════════════

echo ========================================
echo   RMusic Pro - Windows VM Setup
echo ========================================
echo.

REM Check Node.js
echo [1/4] Node.js kontrol ediliyor...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js bulunamadi!
    echo Lutfen https://nodejs.org adresinden Node.js 18+ kurun.
    pause
    exit /b 1
)
echo [OK] Node.js bulundu

REM Install dependencies
echo.
echo [2/4] Bagimliliklar yukleniyor...
call npm install
if %errorlevel% neq 0 (
    echo [HATA] Bagimlilik yuklemesi basarisiz!
    pause
    exit /b 1
)
echo [OK] Bagimliliklar yuklendi

REM Install PM2
echo.
echo [3/4] PM2 kuruluyor...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo [UYARI] PM2 yuklenemedi, yonetici olarak deneyin
)
echo [OK] PM2 kuruldu

REM Create start script
echo.
echo [4/4] Baslatma scripti olusturuluyor...
(
echo @echo off
echo echo RMusic Pro API Sunucusu baslatiliyor...
echo cd /d "%%~dp0"
echo node api-server.js
echo pause
) > start-api.bat
echo [OK] start-api.bat olusturuldu

echo.
echo ========================================
echo   Kurulum Tamamlandi!
echo ========================================
echo.
echo Sonraki adimlar:
echo.
echo 1. API Key'i degistirin:
echo    data\remote-config.json dosyasini acin
echo    "apiKey" degerini degistirin
echo.
echo 2. API Sunucusunu baslatin:
echo    start-api.bat'a cift tiklayin
echo    VEYA: pm2 start api-server.js --name rmusic-api
echo.
echo 3. Windows Firewall'da 3001 portunu acin
echo.
echo 4. Dashboard'da remote-config.json'u guncelleyin:
echo    "mode": "remote"
echo    "serverUrl": "http://VM_IP:3001"
echo.
pause
