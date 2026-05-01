@echo off
setlocal

set "PORT=3002"
set "ROOT=%~dp0"

cd /d "%ROOT%"

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm no esta disponible en PATH.
  echo Instala Node.js y vuelve a intentar.
  pause
  exit /b 1
)

echo Iniciando Atlas Press en modo local...
echo URL: http://localhost:%PORT%

start "Atlas Local Server" cmd /k "cd /d ""%ROOT%"" && npm run dev -- --port %PORT%"

timeout /t 5 /nobreak >nul
start "" "http://localhost:%PORT%"

echo Listo. Se abrio el navegador y el servidor quedo en otra ventana.
exit /b 0
