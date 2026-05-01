$ErrorActionPreference = "Stop"

$listeners = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue

if (-not $listeners) {
  Write-Host "Atlas local no esta corriendo."
  exit 0
}

foreach ($listener in $listeners) {
  Write-Host "Atlas local activo en http://localhost:3002 (PID $($listener.OwningProcess))"
}
