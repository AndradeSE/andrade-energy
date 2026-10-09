# Publicação das melhorias — 09/10/2026

Solicitação do usuário: publicar todas as melhorias em preview e produção.

Código do aplicativo: ce3f2cf. Inclui botão discreto Limpar lista nas notificações do Gerador/Comercial e Consumidor, remoção do carrossel redundante do Comercial, preservação do handler global de push, conclusão OAuth concorrente e correções de navegação e legibilidade.

## Atualizações Android confirmadas pelo EAS

| Ambiente | Aplicativo | Runtime | Grupo OTA |
| --- | --- | --- | --- |
| Preview | Gerador | 1.0.4-preview-live-awake | 372090f4-fcce-4a16-9128-44aae5b43962 |
| Preview | Consumidor | 1.0.4-preview-live-awake | 489cf882-82e5-4760-81c5-50aeaf5fc4b6 |
| Produção | Gerador | 1.0.4-production-live-awake | a2d10e3d-4b8e-4958-9b47-c2571406fc5d |
| Produção | Consumidor | 1.0.4-production-live-awake | cf343116-efda-4867-8965-159b36a1699c |
| Produção | Gerador | 1.0.0 | 85d9888d-5e2f-40f9-94d8-428f489358ee |
| Produção | Consumidor | 1.0.0 | 06c60edd-34ef-400f-b6d8-0cd394619a92 |

## Backend

Preview permanece online em dce63d4. Produção publicada a partir de main em 9564189, deploy Render dep-db4iolij9qps73cmt880 confirmado Live; /health retornou online e esse commit. Foram transportadas apenas as correções de ordenação/normalização das competências e atualizações compatíveis das dependências HTTP. Motor de cálculo das faturas não foi alterado por esta publicação.

## Validação

TypeScript do aplicativo aprovado. Backend de produção compilado com 122 testes aprovados e zero falhas; npm ci terminou sem vulnerabilidades conhecidas. Scripts de leitura das notificações, preservação do handler global e prontidão dos avisos de faturamento aprovados. No Gerador Preview atualizado, botão Limpar lista visível, Acesso rápido da Home preservado e tela Planos sem carrossel branco. Nenhuma cobrança, pagamento ou aceite de contrato foi executado na publicação. Teste real anterior confirmou transporte de push apenas no Consumidor Preview; não foi realizado novo teste real em produção.

Evidências locais: C:/Users/vini_/.codex/andrade-release-limpar.png e C:/Users/vini_/.codex/andrade-release-comercial.png.
