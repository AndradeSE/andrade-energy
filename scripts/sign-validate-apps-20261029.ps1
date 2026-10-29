param([ValidateSet('gerador','consumidor')][string]$VariantFilter,[ValidateSet('preview','production')][string]$EnvironmentFilter)
$ErrorActionPreference='Stop'
$root='C:/Users/vini_/andrade-energy/output/apps/release-20261029'
$credentialRoot='C:/Users/vini_/andrade-energy/.worktrees/subscription-production-20261004'
$env:JAVA_HOME='C:/Users/vini_/andrade-energy/.local-android/jdk'
$env:Path="$env:JAVA_HOME/bin;"+$env:Path
$tools='C:/Users/vini_/andrade-energy/.local-android/sdk/build-tools/36.0.0'
$certificates=@{gerador='963267fe519bf26b6bbb988aa92a290a96abbaac034dd843746936155def7b5e';consumidor='d32a187bf37425ca30be4f1faa2f6a8851115ea43d6aa8952151ea90751f883e'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
try{
 foreach($variant in @('gerador','consumidor')){foreach($environment in @('preview','production')){
  if(($VariantFilter -and $variant -ne $VariantFilter) -or ($EnvironmentFilter -and $environment -ne $EnvironmentFilter)){continue}
  $tag="$variant-$environment";$apk=Join-Path $root "andrade-energy-$tag.apk"
  $credential=(Get-Content -LiteralPath "$credentialRoot/credentials/$variant.json" -Raw | ConvertFrom-Json).android.keystore
  $env:ANDRADE_TASK_STORE_PASS=$credential.keystorePassword;$env:ANDRADE_TASK_KEY_PASS=$credential.keyPassword
  $aligned=Join-Path $root "aligned-$tag.apk";$signed=Join-Path $root "signed-$tag.apk"
  & "$tools/zipalign.exe" -P 16 -f 4 $apk $aligned
  if($LASTEXITCODE -ne 0){throw "Alinhamento falhou: $tag"}
  & "$tools/apksigner.bat" sign --ks "$credentialRoot/credentials/android/$variant.jks" --ks-key-alias $credential.keyAlias --ks-pass env:ANDRADE_TASK_STORE_PASS --key-pass env:ANDRADE_TASK_KEY_PASS --out $signed $aligned
  if($LASTEXITCODE -ne 0){throw "Assinatura falhou: $tag"}
  $certOut=(& "$tools/apksigner.bat" verify --print-certs $signed) -join "`n"
  if($LASTEXITCODE -ne 0){throw "Assinatura inválida: $tag"}
  $cert=[regex]::Match($certOut,'certificate SHA-256 digest: ([a-f0-9]+)').Groups[1].Value
  if($cert -ne $certificates[$variant]){throw "Certificado incompatível com o aplicativo atual: $tag"}
  $badging=(& "$tools/aapt.exe" dump badging $signed) -join "`n"
  $package=[regex]::Match($badging,"package: name='([^']+)'").Groups[1].Value
  $expected="com.andradese.energy.$variant"+$(if($environment -eq 'preview'){'.preview'}else{''})
  if($package -ne $expected -or $badging -notmatch "native-code: 'arm64-v8a'"){throw "Pacote ou arquitetura incorretos: $tag"}
  $manifest=(& "$tools/aapt.exe" dump xmltree $signed AndroidManifest.xml) -join "`n"
  $channel=if($environment -eq 'preview'){"preview-$variant"}else{"production-$variant"}
  if(-not $manifest.Contains($channel)){throw "Canal de atualização incorreto: $tag"}
  if(($variant -eq 'gerador') -ne $manifest.Contains('CemigBrowserActivity')){throw "Navegador integrado na variante incorreta: $tag"}
  $zip=[IO.Compression.ZipFile]::OpenRead($signed)
  try{
   $entry=$zip.GetEntry('assets/index.android.bundle');if(-not $entry){throw 'Bundle ausente'}
   $stream=$entry.Open();$memory=[IO.MemoryStream]::new()
   try{$stream.CopyTo($memory);$bundle=[Text.Encoding]::Latin1.GetString($memory.ToArray())}finally{$stream.Dispose();$memory.Dispose()}
   foreach($marker in @('Calculadora de economia','onLevel','Parei na etapa','rateio_contrato_vigente')){if(-not $bundle.Contains($marker)){throw "Atualização ausente ($marker): $tag"}}
   $api=if($environment -eq 'preview'){'https://andrade-energy-api-homologacao.onrender.com/api'}else{'https://andrade-energy-api-vda.onrender.com/api'}
   if(-not $bundle.Contains($api)){throw "API incorreta no bundle: $tag"}
  }finally{$zip.Dispose()}
  Copy-Item -LiteralPath $signed -Destination $apk -Force
  $result=@{variant=$variant;environment=$environment;package=$package;channel=$channel;certificate=$cert;sha256=(Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash;bytes=(Get-Item -LiteralPath $apk).Length;apk=$apk;validated=$true}
  $result | ConvertTo-Json | Set-Content -LiteralPath "$root/$tag.json"
  $result | ConvertTo-Json -Compress
 }}
}finally{Remove-Item Env:ANDRADE_TASK_STORE_PASS,Env:ANDRADE_TASK_KEY_PASS -ErrorAction SilentlyContinue;$credential=$null}
