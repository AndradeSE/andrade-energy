# Faturas, Gmail e notificações — 10/11/2026

## Apps e canais verificados no endpoint EAS

Sem nova build/APK. As publicações usam a origem atual de cada variante, preservando senha de PDF, exclusão de anexos e leitura rural.

| App/canal | Runtime | Update ID |
| --- | --- | --- |
| production-gerador | 1.0.13-production-autoleitura | 01a1c5df-f6a5-70e4-a2ae-2bb4a9fb9f48 |
| preview-gerador | 1.0.12-preview-pdf-voice | 01a1c5dc-a1df-7e15-8825-02bb031bc1cc |
| production-consumidor | 1.0.11-production-refresh-fixed | 01a1c5df-fa72-79e7-ad07-b021c80a109b |
| production-consumidor | 1.0.10-production-arm32 | 01a1c5e6-0609-723e-87da-a1e7fa9392d6 |
| production-consumidor | 1.0.4-production-live-awake | 01a1c5e8-f671-7753-8d07-b8a93396719f |
| preview-consumidor | 1.0.11-preview-refresh-fixed | 01a1c5dc-c71b-7997-aaab-13530fe210fc |

Os canais antigos do Consumidor foram mantidos. Não publicar o Gerador a partir do checkout antigo que seleciona runtime 1.0.12 de produção: a instalação atual usa 1.0.13.

## Verificações

- TypeScript aprovado nas três origens de app e nos backends Preview/produção.
- Testes gerais: 186 Preview / 173 produção, além dos testes específicos de upload, credencial, deduplicação e máscara.
- Análise autenticada no Preview do PDF fornecido, PNG por ticket privado de uso único e JPG multipart: 214 kWh, tarifa convencional 1,17455946, total 360,80, doação 130,00. Nenhuma fatura/cobrança foi criada pelo teste.
- OCR executado também com Node 22.18.0, igual ao Render. wasm-feature-detect fixado em 1.8.0 para evitar sintaxe incompatível introduzida em 1.10.0.
- Limites: PDF/JPG/PNG até 10 MB; OCR de imagem até 20 MP e 45 segundos, uma execução por processo.
- Quando a fatura social não traz a tarifa convencional, não inferir a tarifa a partir do valor com desconto social.

## Incidente real de faturamento

A tarefa FATURAS_EMAIL estava em REVISAO desde 03/11. Foi conferida a ausência de registros PROCESSANDO antes de liberar somente essa tarefa, sem alternar executor ou reprocessar resultados incertos.

O envio manual de 10/11 foi processado às 11h09, e a entrega ao destinatário foi confirmada pelo provedor às 11h10. A cópia encontrada pelo Gmail foi ignorada como competência já faturada.

Uma consulta temporariamente indisponível às 11h32 fez o código anterior ignorar o consentimento atual e tentar vínculos antigos expirados. A correção mantém sempre a autorização mais recente da mesma conta/titular/empresa; clientes consumidores não reutilizam credenciais administrativas. Timeout não desativa consentimento anteriormente validado e não tenta as autorizações antigas da mesma caixa no mesmo ciclo.

## Notificações e anexos

As notificações reais já estavam persistidas no banco. Os cabeçalhos agora recarregam no recebimento do push, retorno ao app, foco da tela e abertura da caixa; uma falha da consulta de faturas não apaga a lista de notificações.

Contas anexadas usam a animação padrão de transição. Repetições da mesma UC/competência/vencimento/valor/consumo são reutilizadas; contas corrigidas e de competências diferentes continuam separadas. Cópias antigas idênticas não são apagadas automaticamente: a exclusão só ocorre após a ação explícita do usuário.

A máscara de telefone fica no controle comum dos campos phone-pad; os dígitos são preservados para envio ao backend.
