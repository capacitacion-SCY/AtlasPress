@echo off
cd /d "%~dp0"
echo.
echo Deteniendo Atlas Press local...
echo.
npm run local:stop
pause
