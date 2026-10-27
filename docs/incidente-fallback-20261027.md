# Incidente: cota Render e roteamento dos apps — 27/10/2026

## Causas verificadas

- O principal respondeu HTTP 503. O monitor consultou o serviço de produção e confirmou `BILLING` em três observações.
- O reserva implantado identificou `4076df57`, mas o banco aprovava `e863b1a8`. A proteção de versão impediu a troca.
- As publicações recentes dos apps tinham retornado ao resolvedor que reconhecia somente Render principal e Netlify, perdendo o destino Render reserva.

## Recuperação executada

Comparado `e863b1a8..4076df57`: nenhum arquivo de backend, package.json ou lockfile mudou; apenas documentação, Metro e histórico. A aprovação da revisão implantada foi atualizada com guarda de concorrência e auditoria. O monitor normal realizou a troca, sem forjar observação nem invocar operação financeira.

Às 18:09:09 UTC, o banco confirmou `RENDER_RESERVA`, revisão 3, resultado `RENDER_RESERVA_ATIVADA`. Às 18:10 UTC, tarefas de push, notificações, produção por e-mail, faturas por e-mail, convites e rateio foram concluídas pelo reserva. Requisição sem autenticação a clientes retorna 401, preservando controle de acesso.

Restaurados resolvedor dos três destinos fixos, leitura de metadados por GET, invalidação do cache diante de executor inativo e serviço administrativo que respeita reserva preferida. Nenhuma requisição de negócio é repetida automaticamente. Cinco testes, TypeScript e consulta real do resolvedor passaram.

## Limites

A cascata entre os dois reservas continua adiada até liberar Netlify. Este incidente não a ativou. Render Free pode dormir; o controle admite tempo de despertar, sem prometer troca instantânea. Não retornar ao principal automaticamente quando recuperar cota. Não aprovar novos commits do reserva sem comparar e validar o artefato publicado.

Publicações e IDs finais registrados no checkpoint externo e no histórico OTA.
