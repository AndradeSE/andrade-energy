param([Parameter(Mandatory=$true)][ValidateSet('gerador','consumidor')][string]$Variant)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path $PSScriptRoot -Parent
$toolsRoot = 'C:\Users\vini_\andrade-energy\.local-android'
$env:JAVA_HOME = "$toolsRoot\jdk"
$env:ANDROID_HOME = "$toolsRoot\sdk"
$env:ANDROID_USER_HOME = "$toolsRoot\user"
$env:GRADLE_USER_HOME = "$toolsRoot\gradle"
$env:PATH = "$env:JAVA_HOME\bin;C:\Program Files\nodejs;$env:PATH"
$env:EXPO_PUBLIC_APP_ENV = 'preview'
$env:EXPO_PUBLIC_APP_VARIANT = $Variant
$env:EXPO_PUBLIC_API_URL = 'https://andrade-energy-api-homologacao.onrender.com/api'
$env:EXPO_PUBLIC_ENABLE_SAFE_ONLINE_VOICE = '1'
$env:NODE_ENV = 'production'
Set-Location -LiteralPath $workspace
if ((Resolve-Path .).Path -ne $workspace) { throw 'Workspace mismatch' }
& 'C:\Program Files\nodejs\node.exe' node_modules/expo/bin/cli prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { throw 'Prebuild failed' }
& .\android\gradlew.bat -p android -I ../scripts/android-variant-inputs.gradle -I ../scripts/android-local-signing.gradle :app:assembleRelease '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' --max-workers=2 --no-parallel --no-daemon
if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
New-Item -ItemType Directory -Path output/apk-native-speech -Force | Out-Null
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination "output/apk-native-speech/andrade-energy-$Variant-preview-r20261006.7.apk"
