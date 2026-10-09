param([Parameter(Mandatory=$true)][ValidateSet('gerador','consumidor')][string]$Variant)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskToolRoot='C:/Users/vini_/andrade-energy/.local-android'
$env:EXPO_PUBLIC_APP_VARIANT=$Variant
$env:EXPO_PUBLIC_APP_ENV='production'
$env:EXPO_PUBLIC_API_URL='https://andrade-energy-api-vda.onrender.com/api'
$env:EXPO_PUBLIC_ENABLE_GEMINI_LIVE='1'
$env:EXPO_PUBLIC_ENABLE_SAFE_ONLINE_VOICE='1'
$env:JAVA_HOME="$taskToolRoot/jdk"
$env:ANDROID_HOME="$taskToolRoot/sdk"
$env:ANDROID_USER_HOME="$taskToolRoot/user"
$env:GRADLE_USER_HOME='C:/Users/vini_/andrade-energy/b/g'
$env:PATH="$env:JAVA_HOME/bin;C:/Program Files/Git/bin;C:/Program Files/Git/usr/bin;$env:PATH"
Push-Location $taskRoot
try {
  & npx expo prebuild --platform android --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Production prebuild failed' }
  # Autolinking retains the previous APK package when this native directory is reused.
  foreach ($taskRelative in @('android/build/generated/autolinking','android/app/build/generated/autolinking')) {
    $taskCache=[IO.Path]::GetFullPath((Join-Path $taskRoot $taskRelative))
    $taskAllowed=[IO.Path]::GetFullPath((Join-Path $taskRoot 'android'))+[IO.Path]::DirectorySeparatorChar
    if (!$taskCache.StartsWith($taskAllowed,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cache path' }
    if (Test-Path -LiteralPath $taskCache) { Remove-Item -LiteralPath $taskCache -Recurse -Force }
  }
  & ./android/gradlew.bat -p android -I ../scripts/android-variant-inputs.gradle -I ../scripts/android-production-signing.gradle :app:assembleRelease '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' --max-workers=2 --no-parallel --no-daemon
  if ($LASTEXITCODE -ne 0) { throw 'Production APK build failed' }
  $taskApk=Join-Path $taskRoot 'android/app/build/outputs/apk/release/app-release.apk'
  $taskCertificate=(& "$taskToolRoot/sdk/build-tools/36.0.0/apksigner.bat" verify --print-certs $taskApk | Out-String)
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
  $taskExpected=if ($Variant -eq 'gerador') { 'ec3ae37939b37df83f728535a37109915ef94379e026d57a13d8bfdf6c855c70' } else { '1afe65377b78579fbdfed1842a724721c591b6be4f30ce0f2774867aa2222ce1' }
  if (!$taskCertificate.Contains($taskExpected)) { throw 'Production certificate mismatch: APK not published' }
  $taskOutput="C:/Users/vini_/andrade-energy/output/apps/andrade-energy-$Variant-production-ia-20261009-r1.apk"
  if (Test-Path -LiteralPath $taskOutput) { throw 'Output already exists; preserve previous APK' }
  Copy-Item -LiteralPath $taskApk -Destination $taskOutput
  Get-Item -LiteralPath $taskOutput | Select-Object FullName,Length
  Get-FileHash -LiteralPath $taskOutput -Algorithm SHA256
} finally { Pop-Location }
