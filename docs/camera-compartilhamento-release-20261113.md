# Camera e compartilhamento — 13/11/2026

- Consumidor: APK versionCode11, runtime `1.0.14-production-consumidor-camera`, build EAS `0557d3f8-6a37-4d3c-8a7e-947c558081e0`.
- Gerador: APK versionCode13, runtime `1.0.15-production-gerador-share`, build EAS `2a1ae939-370a-4e0d-b808-8fe8f8cdb4a4`.
- OTA final Gerador: grupo `d21405c2-ea04-4e27-acd6-d90fa78810aa`, update `01a1d472-dc2e-75be-a97e-86d74807a81f`.
- OTA final Consumidor: grupo `a8e9f29f-5220-444a-8497-a74a00010cf8`, update `01a1d474-7d55-73d4-9516-22351ee4da63`.
- Endpoint publico Expo consultado com canal/runtime de cada app: HTTP200 e IDs finais confirmados em ambos.
- Preview compartilhamento verde: grupo `ec0c2721-0fa9-4f78-a7e2-92f8d63ad4fa`, runtime `1.0.12-preview-pdf-voice`.
- TypeScript aprovado; testes de aviso de APK (4) e saldo por UC (2) aprovados.
- Preview no S23 confirmou recepcao de PDF e foto no layout padrao. Arquivo sintetico de medidor rejeitado pelo cadastro como esperado; nao foi criado cadastro real nem enviado protocolo.
- Ajustes visuais posteriores ao envio das builds estao nas OTAs acima. Nenhuma segunda build foi iniciada para trocar cores.

## Proximas publicacoes

Gerador: usar perfil `share-production-gerador` para APK. Para OTA usar `scripts/publish-ota.ps1 -Variant gerador -Audience clients`, com `ANDRADE_GENERATOR_SHARE_BUILD=1`, `ANDRADE_NATIVE_CEMIG_BROWSER=1`, `ANDRADE_CEMIG_AUTOMATION_PRODUCTION=1`, `ANDRADE_NATIVE_REFRESH_FIXED=1`, `ANDRADE_ANDROID_UNIVERSAL=1`. Confirmar runtime15 antes da publicacao.

Consumidor: perfil `camera-production-consumidor`. OTA com `ANDRADE_CONSUMER_CAMERA_BUILD=1`, `ANDRADE_NATIVE_REFRESH_FIXED=1`, `ANDRADE_ANDROID_UNIVERSAL=1`, confirmando runtime14. Esta entrega nao remove os canais/runtimes legados dos clientes; o aviso de APK compara versionCode e aponta ao link estavel.

## Correcao da regressao Consumidor

A build11 deixou de incorporar a Home e o cabecalho aprovados do Consumidor. Build12, EAS04f3ec14-530d-4582-a3ca-5b8d651e5aaa, corrige a composicao na fonte e no APK. SHA256f413b189ea3399ff36176ea44ba6246e56aaed271d320450eb65b52fb1887f4d,108822993bytes, certificado1afe65377b78579fbdfed1842a724721c591b6be4f30ce0f2774867aa2222ce1. Link estavel e manifesto de aviso nativo atualizados para12. Runtimes4,10,11 e14 receberam o reparo por OTA e foram consultados diretamente comHTTP200 e IDsconfirmados. Gerador permanece build13 e recebeu melhoria de retentativa de aviso no runtime15.

A base dos6 arquivos principais esta fixada em config/consumer-release-baseline.json, conferida por scripts/check-consumer-release.cjs antes de OTA e futuras buildsEAS. Teste negativo com Home alterada bloqueou a publicacao. Instrucoes de release em docs/mobile-release-baseline.md eAGENTS.md. Fonte permanente em .worktrees/mobile-release-current. Testesautomaticos aprovados; sem teste visual novo noS23, que ficou offline.
