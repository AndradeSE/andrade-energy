param(
 [Parameter(Mandatory=$true)][ValidateSet('gerador','consumidor')][string]$Variant,
 [Parameter(Mandatory=$true)][string]$Message,
 [ValidateSet('internal','clients')][string]$Audience='internal'
)
$ErrorActionPreference='Stop'
$stage=if($Audience -eq 'clients'){'production'}else{'preview'}
$targets=@('voice','universal')
if($Variant -eq 'gerador'){$targets+= 'cemig'}
$targets+= 'refresh'
$keys=@('ANDRADE_NATIVE_REFRESH_FIXED','ANDRADE_ANDROID_UNIVERSAL','ANDRADE_NATIVE_CEMIG_BROWSER','ANDRADE_CEMIG_AUTOMATION_PREVIEW','ANDRADE_CEMIG_AUTOMATION_PRODUCTION','EXPO_PUBLIC_DISABLE_LOCAL_MODEL','EXPO_PUBLIC_ENABLE_GEMINI_LIVE')
$before=@{};foreach($k in $keys){$before[$k]=[Environment]::GetEnvironmentVariable($k,'Process')}
$confirmed=@()
try{
 foreach($target in $targets){
  $env:ANDRADE_NATIVE_REFRESH_FIXED=if($target -eq 'refresh'){'1'}else{'0'}
  $env:ANDRADE_ANDROID_UNIVERSAL=if($target -in @('universal','refresh')){'1'}else{'0'}
  $env:EXPO_PUBLIC_DISABLE_LOCAL_MODEL=if($target -in @('universal','refresh')){'1'}else{'0'}
  $env:EXPO_PUBLIC_ENABLE_GEMINI_LIVE='1'
  $env:ANDRADE_NATIVE_CEMIG_BROWSER=if($target -eq 'cemig' -or ($target -eq 'refresh' -and $Variant -eq 'gerador')){'1'}else{'0'}
  $env:ANDRADE_CEMIG_AUTOMATION_PREVIEW=$env:ANDRADE_NATIVE_CEMIG_BROWSER
  $env:ANDRADE_CEMIG_AUTOMATION_PRODUCTION=$env:ANDRADE_NATIVE_CEMIG_BROWSER
  $runtime=switch($target){'voice'{"1.0.4-$stage-live-awake"};'universal'{"1.0.10-$stage-arm32"};'cemig'{"1.0.9-$stage-cemig-worker"};'refresh'{"1.0.11-$stage-refresh-fixed"}}
  Write-Output "PUBLICANDO $Variant $Audience runtime=$runtime"
  & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot/publish-ota.ps1" -Variant $Variant -Audience $Audience -Message "$Message [$runtime]"
  if($LASTEXITCODE -ne 0){throw "Publicação interrompida em $runtime. Confirmados: $($confirmed -join ', ')."}
  $confirmed+=$runtime
 }
 Write-Output "CONFIRMADOS: $($confirmed -join ', ')"
}finally{foreach($k in $keys){[Environment]::SetEnvironmentVariable($k,$before[$k],'Process')}}
