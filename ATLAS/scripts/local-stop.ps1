$ErrorActionPreference = "Stop"

$found = $false
$listeners = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue

foreach ($listener in $listeners) {
  $found = $true
  try {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
    Write-Host "Servidor local detenido en puerto 3002."
  } catch {
    Write-Host "No se pudo detener el proceso $($listener.OwningProcess) en el puerto 3002."
  }
}

if (-not $found) {
  Write-Host "No hay servidor escuchando en el puerto 3002."
}
