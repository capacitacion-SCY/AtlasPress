@echo off
cd /d "%~dp0"
echo.
echo Iniciando Atlas Press en modo local estable...
echo.
echo Cuando termine de compilar, abre:
echo http://localhost:3002
echo.
npm run local
pause
