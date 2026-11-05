param(
  [ValidateSet('preview','production')][string]$Stage='preview',
  [ValidateSet('refresh','universal','voice')][string]$Target='refresh'
)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$values=@{
  EXPO_PUBLIC_APP_ENV=$Stage
  EXPO_PUBLIC_APP_VARIANT='consumidor'
  EXPO_PUBLIC_API_URL=$(if($Stage -eq 'preview'){'https://andrade-energy-api-homologacao.onrender.com/api'}else{'https://andrade-energy-api-vda.onrender.com/api'})
  EXPO_PUBLIC_CONTINGENCY_ENABLED='1'
  EXPO_PUBLIC_ENABLE_GEMINI_LIVE='1'
  ANDRADE_NATIVE_REFRESH_FIXED=$(if($Target -eq 'refresh'){'1'}else{'0'})
  ANDRADE_ANDROID_UNIVERSAL=$(if($Target -ne 'voice'){'1'}else{'0'})
  EXPO_PUBLIC_DISABLE_LOCAL_MODEL=$(if($Target -ne 'voice'){'1'}else{'0'})
  ANDRADE_ANDROID_32BIT='0'
  ANDRADE_NATIVE_CEMIG_BROWSER='0'
  ANDRADE_CEMIG_AUTOMATION_PREVIEW='0'
  ANDRADE_CEMIG_AUTOMATION_PRODUCTION='0'
  # Runtimes explícitos já conferidos abaixo; mudança somente JavaScript.
  EAS_SKIP_AUTO_FINGERPRINT='1'
  CI='1'
  NODE_OPTIONS=(($env:NODE_OPTIONS+' --dns-result-order=ipv4first').Trim())
}
$before=@{}
foreach($k in $values.Keys){$before[$k]=[Environment]::GetEnvironmentVariable($k,'Process');[Environment]::SetEnvironmentVariable($k,$values[$k],'Process')}
Push-Location $root
$historyPath=Join-Path $root 'config/ota-release-history.json'
$historyBefore=[IO.File]::ReadAllText($historyPath)
$published=$false
try {
  $runtime=switch($Target){'refresh'{"1.0.11-$Stage-refresh-fixed"};'universal'{"1.0.10-$Stage-arm32"};'voice'{"1.0.4-$Stage-live-awake"}}
  $config=(npx.cmd expo config --json | Out-String | ConvertFrom-Json)
  if($LASTEXITCODE -ne 0 -or $config.runtimeVersion -ne $runtime -or $config.extra.eas.projectId -ne '45f35f6f-4f6a-4452-b2e4-02932e778b2b') {throw 'Projeto/runtime incorreto; publicação bloqueada.'}
  $out=Join-Path $root ("output/ota-consumidor-$Stage-$Target-"+(Get-Date -Format 'yyyyMMdd-HHmmss'))
  $audience=if($Stage -eq 'production'){'clients'}else{'internal'}
  $message='Consumidor completo: solicitação de UC, senha e exclusão de PDF, espaçamento e abertura preservada'
  node.exe scripts/record-ota-release.cjs consumidor $audience $message
  if($LASTEXITCODE -ne 0){throw 'Falha no registro da OTA.'}
  npx.cmd expo export --platform android --source-maps --output-dir $out
  if($LASTEXITCODE -ne 0){throw 'Falha na exportação; nada publicado.'}
  node.exe scripts/verify-consumer-ota.cjs $out
  if($LASTEXITCODE -ne 0){throw 'Pacote desatualizado ou incompleto; nada publicado.'}
  npx.cmd eas-cli@22.2.0 update --channel "$Stage-consumidor" --environment $Stage --platform android --input-dir $out --skip-bundler --message "$message [$runtime]" --non-interactive
  if($LASTEXITCODE -ne 0){throw 'Publicação não confirmada pelo Expo.'}
  $published=$true
  Write-Output "CONFIRMADO $Stage-consumidor $runtime ARTEFATO=$out"
} finally {
  if(-not $published){[IO.File]::WriteAllText($historyPath,$historyBefore,[Text.UTF8Encoding]::new($false))}
  Pop-Location
  foreach($k in $before.Keys){[Environment]::SetEnvironmentVariable($k,$before[$k],'Process')}
}
