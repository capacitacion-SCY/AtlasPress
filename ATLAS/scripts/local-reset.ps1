$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$nextDir = Join-Path $root ".next"
$logFiles = @(
  (Join-Path $root "dev-server.log"),
  (Join-Path $root "dev-server.err.log")
)

$ports = @(3002)

foreach ($port in $ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    try {
      Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
    } catch {
      Write-Host "No se pudo cerrar el proceso $($listener.OwningProcess) en el puerto $port."
    }
  }
}

if (Test-Path -LiteralPath $nextDir) {
  Remove-Item -LiteralPath $nextDir -Recurse -Force
}

foreach ($logFile in $logFiles) {
  if (Test-Path -LiteralPath $logFile) {
    try {
      Clear-Content -LiteralPath $logFile -Force -ErrorAction Stop
    } catch {
      Write-Host "No se pudo limpiar $logFile porque esta en uso. Continuando."
    }
  }
}

Write-Host "Local reseteado: puerto 3002 liberado, .next eliminado y logs limpiados."
