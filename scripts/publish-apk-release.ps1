param(
  [Parameter(Mandatory=$true)][ValidateSet('gerador','consumidor')][string]$Variant,
  [Parameter(Mandatory=$true)][string]$ApkPath,
  [Parameter(Mandatory=$true)][string]$ExpectedSha256
)
$ErrorActionPreference = 'Stop'
$apk = Get-Item -LiteralPath $ApkPath
$hash = (Get-FileHash -LiteralPath $apk.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
if ($hash -ne $ExpectedSha256.ToLowerInvariant()) { throw 'SHA256 diferente do APK validado.' }
$env:GIT_TERMINAL_PROMPT = '0'
$fields = @{}
foreach ($line in ("protocol=https`nhost=github.com`n`n" | git credential fill)) {
  $parts = $line -split '=',2
  if ($parts.Length -eq 2) { $fields[$parts[0]] = $parts[1] }
}
if (-not $fields['password']) { throw 'Credencial GitHub indisponível.' }
$headers = @{ Authorization = 'Bearer ' + $fields['password']; 'User-Agent'='AndradeEnergy-release'; Accept='application/vnd.github+json' }
try {
  $api = 'https://api.github.com/repos/AndradeSE/andrade-energy'
  $release = Invoke-RestMethod "$api/releases/tags/apps-2026-08-27" -Headers $headers
  $name = "andrade-energy-$Variant.apk"
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $pending = "pending-$stamp-$name"
  $uploadUrl = ($release.upload_url -replace '\{.*$', '') + '?name=' + $pending
  $uploaded = Invoke-RestMethod $uploadUrl -Method Post -Headers $headers -ContentType 'application/vnd.android.package-archive' -InFile $apk.FullName
  if ($uploaded.size -ne $apk.Length -or $uploaded.digest -ne "sha256:$hash") {
    throw 'Upload não confirmado por tamanho e SHA256. Link original preservado.'
  }
  $old = $release.assets | Where-Object name -eq $name
  if ($old) {
    Invoke-RestMethod "$api/releases/assets/$($old.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{name="backup-$stamp-$name"} | ConvertTo-Json) | Out-Null
  }
  try {
    $published = Invoke-RestMethod "$api/releases/assets/$($uploaded.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{name=$name} | ConvertTo-Json)
  } catch {
    if ($old) {
      Invoke-RestMethod "$api/releases/assets/$($old.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{name=$name} | ConvertTo-Json) | Out-Null
    }
    throw
  }
  $published | Select-Object name,size,digest,browser_download_url,updated_at | ConvertTo-Json
} finally {
  $headers.Clear()
  $fields.Clear()
}
