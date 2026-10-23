# Contingência da API — revalidação de 22/10/2026, ainda não ativada

O projeto `andrade-energy-fallback-probe` foi atualizado pela branch
`codex/netlify-probe`, sem alterar a main, os apps ou o backend de produção.
Continua conectado exclusivamente ao banco de homologação. A saúde informa
explicitamente `readyForFailover: false`; HTTP 200 não significa reserva pronta.

## Concluído

- Contadores atômicos no PostgreSQL para os limitadores das Functions. Contadores
  são compartilhados entre instâncias e indisponibilidade do banco não libera
  tentativas. Tabela/RPCs bloqueadas para anon e authenticated.
- Validação remota com conta temporária: login 200, sessão 200, logout 200,
  token revogado 401. Conta e sessões removidas após o teste.
- POST de fatura bloqueado com 503. Autorização de login não libera pagamentos,
  assinaturas, cadastros, callbacks OAuth ou webhooks de alteração.
- Auditorias curtas aguardadas antes do retorno da função. Teste com evento
  Express `finish` confirma a persistência antes da resposta Lambda.
- Notificação e pendência de push inseridas na mesma transação nas Functions.
  Reserva com lease e dono e retentativas persistentes. Worker de homologação
  publicado em `203aff61`: tarefa gravada no banco foi retomada pela execução
  agendada e finalizada em uma tentativa. Conta fictícia sem dispositivo, sem
  push real nesse teste; conta e aviso removidos ao concluir. Não há promessa
  de entrega exatamente uma vez no provedor externo.
- Compilação e 137 testes gerais aprovados com configuração fictícia para testes;
  14 testes específicos de transporte, limites, auditoria, política e fila aprovados.
- Migrações `20261022233000` e `20261022234500` aplicadas somente na homologação;
  deduplicação, disputa de reserva, recuperação de falha e privilégios testados com
  rollback. Não houve cobrança ou alteração de contrato nesses testes.

## Pendências para ativar

1. Uploads maiores que o payload das Functions precisam de Storage autorizado e
   transporte pelo cliente; o limite atual do app continua 10 MB.
2. Processadores de faturamento/e-mail/avisos e webhooks financeiros ainda
   precisam de execução durável e teste de interrupção/recuperação. O worker de
   push não substitui esses processadores.
3. Definir a fonte inequívoca de esgotamento de cota. HTTP 503 também representa
   despertar, manutenção ou suspensão. A API pública do Render expõe
   `suspended` e `suspenders` (`billing`, `user`, `admin`, entre outros), mas não
   um motivo específico de cota no esquema consultado. Não ativar por 503 ou
   por `billing` sem a regra expressa do proprietário.
4. Endereço/seleção do destino, paridade de versão/segredos e teste real de
   recuperação antes de apontar os clientes de produção para o reserva.

O reserva permanece com `BACKGROUND_JOBS_ENABLED=false`. Não repetir
POST/PATCH/DELETE nem uploads automaticamente após timeout. Compartilhar
somente segredos do ambiente correspondente por canal privado do provedor.
Não misturar bancos de homologação e produção e não usar keep-alive para
contornar limites de serviços gratuitos.

## Referências consultadas

https://render.com/docs/free
https://api-docs.render.com/openapi/render-public-api-1.json
https://docs.netlify.com/build/functions/scheduled-functions/
