$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resetScript = Join-Path $PSScriptRoot "local-reset.ps1"

& $resetScript

Set-Location $root
Write-Host ""
Write-Host "Iniciando Atlas Press en http://localhost:3002"
Write-Host "Para detenerlo, presiona Ctrl+C o ejecuta: npm run local:stop"
Write-Host ""

& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& npm.cmd run start -- --port 3002
