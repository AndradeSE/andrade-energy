param(
 [Parameter(Mandatory=$true)][string]$ApkPath
)
$ErrorActionPreference='Stop'
# Read the binary manifest: do not advertise an OTA revision as an APK build.
$sdkCandidates=@($env:ANDROID_HOME,$env:ANDROID_SDK_ROOT,(Join-Path $env:USERPROFILE 'andrade-energy/.local-android/sdk')) | Where-Object {$_ -and (Test-Path $_)}
$aapt=$sdkCandidates | ForEach-Object {Get-ChildItem (Join-Path $_ 'build-tools/*/aapt.exe') -ErrorAction SilentlyContinue} | Sort-Object FullName -Descending | Select-Object -First 1
if(-not $aapt){throw 'aapt indisponível; aviso não publicado.'}
$badging=(& $aapt.FullName dump badging $ApkPath) -join "`n"
if($badging -notmatch "package: name='(com\.andradese\.energy\.(gerador|consumidor)(\.preview)?)' versionCode='(\d+)'"){throw 'APK não reconhecido.'}
$id=$Matches[1];$variant=$Matches[2];$preview=$Matches[3];$build=[int]$Matches[4]
$assetName="andrade-energy-$variant$(if($preview){'-preview'}).apk"
$fields=@{};foreach($line in ("protocol=https`nhost=github.com`n`n"|git credential fill)){$parts=$line -split '=',2;if($parts.Length -eq 2){$fields[$parts[0]]=$parts[1]}}
$headers=@{Authorization='Bearer '+$fields['password'];'User-Agent'='AndradeEnergy-release';Accept='application/vnd.github+json'}
$temporary=Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString()+'.json')
try{
 $api='https://api.github.com/repos/AndradeSE/andrade-energy'
 $release=Invoke-RestMethod "$api/releases/tags/apps-2026-08-27" -Headers $headers
 $asset=$release.assets|Where-Object name -eq $assetName
 $hash=(Get-FileHash $ApkPath -Algorithm SHA256).Hash.ToLowerInvariant()
 if(-not $asset -or $asset.digest -ne "sha256:$hash"){throw 'APK estável não corresponde ao arquivo; aviso não publicado.'}
 @{applicationId=$id;build=$build;url=$asset.browser_download_url}|ConvertTo-Json|Set-Content -LiteralPath $temporary -Encoding UTF8
 $name="$id.json";$stamp=Get-Date -Format yyyyMMddHHmmss
 $upload=($release.upload_url -replace '\{.*$','')+"?name=pending-$stamp-$name"
 $new=Invoke-RestMethod $upload -Method Post -Headers $headers -ContentType application/json -InFile $temporary
 $old=$release.assets|Where-Object name -eq $name
 if($old){Invoke-RestMethod "$api/releases/assets/$($old.id)" -Method Patch -Headers $headers -ContentType application/json -Body (@{name="backup-$stamp-$name"}|ConvertTo-Json)|Out-Null}
 try{Invoke-RestMethod "$api/releases/assets/$($new.id)" -Method Patch -Headers $headers -ContentType application/json -Body (@{name=$name}|ConvertTo-Json)|Out-Null}
 catch{if($old){Invoke-RestMethod "$api/releases/assets/$($old.id)" -Method Patch -Headers $headers -ContentType application/json -Body (@{name=$name}|ConvertTo-Json)|Out-Null};throw}
 Write-Output "Aviso APK publicado: $id build $build"
}finally{$headers.Clear();$fields.Clear();Remove-Item -LiteralPath $temporary -ErrorAction SilentlyContinue}
