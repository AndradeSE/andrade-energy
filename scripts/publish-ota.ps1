param(
  [Parameter(Mandatory=$true)][ValidateSet('gerador','consumidor')][string]$Variant,
  [Parameter(Mandatory=$true)][string]$Message
)
$ErrorActionPreference = 'Stop'
$previous = @{}
$values = @{
  EXPO_PUBLIC_APP_VARIANT = $Variant
  EXPO_PUBLIC_API_URL = 'https://andrade-energy-api-vda.onrender.com/api'
  CI = '1'
  NODE_OPTIONS = (($env:NODE_OPTIONS + ' --dns-result-order=ipv4first').Trim())
}
foreach ($key in $values.Keys) {
  $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
  [Environment]::SetEnvironmentVariable($key, $values[$key], 'Process')
}
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  # Always export again: never send a stale bundle from the other variant.
  # IPv4 preference is process-local; keep TLS validation and Windows networking unchanged.
  # O EAS CLI atual já respeita CI=1 e não aceita mais --non-interactive.
  npx.cmd eas-cli@22.2.0 update --channel "preview-$Variant" --platform android --message $Message
  if ($LASTEXITCODE -ne 0) { throw "OTA $Variant não confirmada pelo Expo (exit $LASTEXITCODE)." }
} finally {
  Pop-Location
  foreach ($key in $previous.Keys) {
    [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process')
  }
}
