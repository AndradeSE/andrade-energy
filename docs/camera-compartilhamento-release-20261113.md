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
