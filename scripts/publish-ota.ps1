param(
  [Parameter(Mandatory=$true)][ValidateSet('gerador','consumidor')][string]$Variant,
  [Parameter(Mandatory=$true)][string]$Message,
  [ValidateSet('internal','clients')][string]$Audience = 'internal'
)
$ErrorActionPreference = 'Stop'
$previous = @{}
$apiUrl = if ($Audience -eq 'clients') {
  'https://andrade-energy-api-vda.onrender.com/api'
} else {
  'https://andrade-energy-api-homologacao.onrender.com/api'
}
$values = @{
  EXPO_PUBLIC_APP_ENV = $(if ($Audience -eq 'clients') { 'production' } else { 'preview' })
  EXPO_PUBLIC_APP_VARIANT = $Variant
  EXPO_PUBLIC_API_URL = $apiUrl
  CI = '1'
  NODE_OPTIONS = (($env:NODE_OPTIONS + ' --dns-result-order=ipv4first').Trim())
}
foreach ($key in $values.Keys) {
  $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
  [Environment]::SetEnvironmentVariable($key, $values[$key], 'Process')
}
Push-Location (Split-Path $PSScriptRoot -Parent)
$historyPath = Join-Path (Get-Location) 'config/ota-release-history.json'
$historyBefore = [System.IO.File]::ReadAllText($historyPath)
$published = $false
try {
  # Always export again: never send a stale bundle from the other variant.
  # IPv4 preference is process-local; keep TLS validation and Windows networking unchanged.
  # O EAS CLI atual já respeita CI=1 e não aceita mais --non-interactive.
  $channel = if ($Audience -eq 'clients') { "production-$Variant" } else { "preview-$Variant" }
  $easEnvironment = if ($Audience -eq 'clients') { 'production' } else { 'preview' }
  if ($Audience -eq 'clients' -and $env:CONFIRM_CLIENT_OTA -ne 'SIM') {
    throw 'OTA para clientes bloqueada. Defina CONFIRM_CLIENT_OTA=SIM somente depois de homologar a versão interna.'
  }
  if ($Audience -eq 'clients' -and (Test-Path -LiteralPath 'output/ota-preview-review-required.flag')) {
    throw 'Publicação em produção aguardando conferência do Preview.'
  }
  node.exe scripts/record-ota-release.cjs $Variant $Audience $Message
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível registrar o histórico desta publicação.' }
  npx.cmd eas-cli@22.2.0 update --channel $channel --environment $easEnvironment --platform android --message $Message
  if ($LASTEXITCODE -ne 0) { throw "OTA $Variant não confirmada pelo Expo (exit $LASTEXITCODE)." }
  $published = $true
} finally {
  if (-not $published) { [System.IO.File]::WriteAllText($historyPath, $historyBefore, [System.Text.UTF8Encoding]::new($false)) }
  Pop-Location
  foreach ($key in $previous.Keys) {
    [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process')
  }
}
