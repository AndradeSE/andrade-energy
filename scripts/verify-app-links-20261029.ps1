$ErrorActionPreference='Stop'
$root='C:/Users/vini_/andrade-energy/output/apps/release-20261029'
$release='https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27'
$inventory=@()
foreach($variant in @('gerador','consumidor')){foreach($environment in @('production','preview')){
 $artifact=Get-Content -LiteralPath "$root/$variant-$environment.json" -Raw | ConvertFrom-Json
 if(-not $artifact.validated){throw "APK ainda não validado: $variant-$environment"}
 $suffix=if($environment -eq 'preview'){'-preview'}else{''}
 $name="andrade-energy-$variant$suffix.apk"
 $urls=@("$release/$name")
 if($environment -eq 'production'){$urls+= "https://www.andradeenergy.com.br/downloads/$name"}
 foreach($url in $urls){
  $response=Invoke-WebRequest -Uri $url -Method Head -MaximumRedirection 10 -TimeoutSec 30
  $bytes=[long]($response.Headers['Content-Length'] -join '')
  if([int]$response.StatusCode -ne 200 -or $bytes -ne $artifact.bytes){throw "Download divergente: $url"}
 }
 $inventory+=[pscustomobject]@{variant=$variant;environment=$environment;package=$artifact.package;certificate=$artifact.certificate;sha256=$artifact.sha256;bytes=$artifact.bytes;urls=$urls;verifiedAt=[DateTime]::UtcNow.ToString('o')}
}}
$inventory | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$root/downloads-verificados.json"
$lines=@('# Aplicativos Android atualizados — 29/10/2026','')
foreach($item in $inventory){$lines+="- [$($item.variant) — $($item.environment)]($($item.urls[-1])) · $($item.bytes) bytes · SHA-256: $($item.sha256)"}
$lines | Set-Content -LiteralPath "$root/downloads-verificados.md"
$inventory | Select-Object variant,environment,bytes,sha256 | Format-Table
