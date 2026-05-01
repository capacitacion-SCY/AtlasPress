@echo off
setlocal
cd /d "%~dp0"

echo.
echo Atlas Press - prueba rapida local
echo.
echo Este modo usa next dev para ver cambios sin recompilar todo.
echo Se abrira el navegador automaticamente en:
echo http://localhost:3002
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$listeners = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue; foreach ($listener in $listeners) { Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue }"

start "" powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:3002'"

npm.cmd run dev -- --port 3002

echo.
echo El servidor se detuvo. Presiona una tecla para cerrar.
pause >nul
