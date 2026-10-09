# Publicação dos apps novos — 09/10/2026

Base dos APKs novos: a8dd73c. Revisão OTA: 9691ef1.
Os recursos de voz foram preservados. A tela e o serviço de conexão de e-mail foram trazidos da revisão ae13d92 para restaurar a autorização direta e o estado de importação automática do Gmail.

Runtime confirmado nos recursos dos APKs locais gerador r20261008.13 e consumidor preview-ia-20261009: `1.0.4-preview-live-awake`. Canais confirmados nos manifests: preview-gerador e preview-consumidor, cada um no seu projeto Expo.

TypeScript e scripts/test-assistant-live-session.cjs passaram com as dependências instaladas pelo package-lock desta revisão.

| Canal | Runtime | Grupo confirmado |
| --- | --- | --- |
| production-gerador | 1.0.0 | 48839940-a6b4-4c06-bbe8-39454c474688 |
| production-consumidor | 1.0.0 | 4f6becd1-3147-444a-8220-2ae94db16220 |
| preview-gerador | 1.0.0-preview | c3da77bf-2c23-4e5d-b2c0-0acc9ab66b54 |
| preview-consumidor | 1.0.0-preview | 0d0df999-3fee-49ef-b1a5-a33709934bfc |
| preview-gerador | 1.0.4-preview-live-awake | fffc7f51-be71-4e68-a442-e54acfef0490 |
| preview-consumidor | 1.0.4-preview-live-awake | c9ba3b47-a83a-448b-ab92-db6aae475ee3 |

Servidores online, conferidos novamente: produção ae13d92; homologação 6589981. Ambos contêm o cálculo compensada + saldo atual - saldo anterior da mesma UC, sem histórico igual a zero. O processamento da fatura recebida é compartilhado entre provedores. Gmail usa consulta autorizada direta; Outlook/Hotmail cria regra de encaminhamento via Microsoft Graph quando a autorização permite, com alternativa manual.

Publicação não comprova recebimento ou instalação da OTA em cada dispositivo.
