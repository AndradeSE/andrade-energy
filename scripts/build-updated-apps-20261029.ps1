$ErrorActionPreference='Stop'
Set-Location 'C:/ae-browser-preview'
$env:JAVA_HOME='C:/Users/vini_/andrade-energy/.local-android/jdk'
$env:ANDROID_HOME='C:/Users/vini_/andrade-energy/.local-android/sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME/bin;C:/Program Files/Git/bin;C:/Program Files/Git/usr/bin;"+$env:Path
$env:CI='1';$env:NODE_ENV='production';$env:EXPO_PUBLIC_ENABLE_GEMINI_LIVE='1';$env:EXPO_PUBLIC_CONTINGENCY_ENABLED='1'
$env:ANDRADE_NATIVE_CEMIG_BROWSER='1';$env:ANDRADE_CEMIG_AUTOMATION_PREVIEW='1';$env:ANDRADE_CEMIG_AUTOMATION_PRODUCTION='1'
$env:ANDRADE_ANDROID_EMULATOR='0'
$target='C:/Users/vini_/andrade-energy/output/apps/release-20261029'
New-Item -ItemType Directory -Path $target -Force | Out-Null
$matrix=@(@('gerador','preview'),@('gerador','production'),@('consumidor','preview'),@('consumidor','production'))
foreach($item in $matrix){
 $variant=$item[0];$environment=$item[1];$tag="$variant-$environment"
 if((Get-PSDrive C).Free -lt 2GB){throw 'Espaço insuficiente para continuar sem comprometer a build.'}
 $env:EXPO_PUBLIC_APP_VARIANT=$variant;$env:EXPO_PUBLIC_APP_ENV=$environment
 $env:EXPO_PUBLIC_API_URL=if($environment -eq 'preview'){'https://andrade-energy-api-homologacao.onrender.com/api'}else{'https://andrade-energy-api-vda.onrender.com/api'}
 $audience=if($environment -eq 'preview'){'internal'}else{'clients'}
 $message=if($variant -eq 'gerador'){'Rateio por UC, inadimplência, avisos, navegador em segundo plano, Calculadora de economia e Solar com sequências de navegação'}else{'Calculadora de economia e Solar com sequências de navegação e orientação atualizada'}
 & node.exe scripts/record-ota-release.cjs $variant $audience $message
 if($LASTEXITCODE -ne 0){throw "Histórico falhou: $tag"}
 Write-Output "PREBUILD $tag"
 & npx.cmd expo prebuild --platform android --no-install *> "$target/prebuild-$tag.log"
 if($LASTEXITCODE -ne 0){throw "Prebuild falhou: $tag"}
 Write-Output "BUILD $tag"
 & ./android/gradlew.bat -p android :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a' -I ../scripts/android-variant-inputs.gradle '-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m' --max-workers=1 --no-parallel --no-daemon *> "$target/build-$tag.log"
 if($LASTEXITCODE -ne 0){throw "Build falhou: $tag"}
 $apk=Join-Path $target "andrade-energy-$tag.apk"
 Copy-Item -LiteralPath 'android/app/build/outputs/apk/release/app-release.apk' -Destination $apk
 & "$env:ANDROID_HOME/build-tools/36.0.0/apksigner.bat" verify $apk
 if($LASTEXITCODE -ne 0){throw "Assinatura inválida: $tag"}
 & "$env:ANDROID_HOME/build-tools/36.0.0/aapt.exe" dump badging $apk | Select-String 'package:|native-code:' | ForEach-Object {$_.Line}
 $hash=(Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
 Write-Output "READY $tag SHA256=$hash"
 @{variant=$variant;environment=$environment;sha256=$hash;apk=$apk;createdAt=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath "$target/$tag.json"
}
