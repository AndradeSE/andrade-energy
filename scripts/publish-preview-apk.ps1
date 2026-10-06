param([Parameter(Mandatory=$true)][ValidateSet('gerador','consumidor')][string]$Variant,
 [Parameter(Mandatory=$true)][string]$ApkPath,
 [Parameter(Mandatory=$true)][string]$ExpectedSha256)
$ErrorActionPreference='Stop'
$apk=Get-Item -LiteralPath $ApkPath
$hash=(Get-FileHash -LiteralPath $apk.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
if($hash -ne $ExpectedSha256.ToLowerInvariant()){throw 'APK hash mismatch'}
$auth=@{}
foreach($line in ("protocol=https`nhost=github.com`n`n" | git credential fill)) {
 $parts=$line -split '=',2
 if($parts.Length -eq 2){$auth[$parts[0]]=$parts[1]}
}
if(-not $auth['password']){throw 'GitHub credential unavailable'}
$headers=@{Authorization='Bearer '+$auth['password'];'User-Agent'='AndradeEnergy-release';Accept='application/vnd.github+json'}
try {
 $api='https://api.github.com/repos/AndradeSE/andrade-energy'
 $release=Invoke-RestMethod "$api/releases/tags/apps-2026-08-27" -Headers $headers
 $name="andrade-energy-$Variant-preview.apk"
 $stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
 $uploadUrl=($release.upload_url -replace '\{.*$','')+'?name='+"pending-$stamp-$name"
 $uploaded=Invoke-RestMethod $uploadUrl -Method Post -Headers $headers -ContentType 'application/vnd.android.package-archive' -InFile $apk.FullName
 if($uploaded.size -ne $apk.Length -or $uploaded.digest -ne "sha256:$hash"){throw 'Upload not verified; previous preserved'}
 $old=$release.assets | Where-Object name -eq $name
 if($old){Invoke-RestMethod "$api/releases/assets/$($old.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{name="backup-$stamp-$name"}|ConvertTo-Json)|Out-Null}
 try {
  $published=Invoke-RestMethod "$api/releases/assets/$($uploaded.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{name=$name}|ConvertTo-Json)
 } catch {
  if($old){Invoke-RestMethod "$api/releases/assets/$($old.id)" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{name=$name}|ConvertTo-Json)|Out-Null}
  throw
 }
 $checkPath=Join-Path $apk.DirectoryName "download-check-$name"
 Invoke-WebRequest $published.browser_download_url -OutFile $checkPath
 if((Get-FileHash -LiteralPath $checkPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash){throw 'Download mismatch'}
 $published | Select-Object name,size,digest,browser_download_url | ConvertTo-Json
} finally {$headers.Clear();$auth.Clear()}
