# Contingência da API — revalidação de 23/10/2026, ainda não ativada

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

1. O transporte privado de PDFs já passou no teste remoto de 7 MB: preparação,
   Storage privado, análise e bloqueios de outro usuário e de reutilização do
   ticket. O cliente nativo Preview foi adaptado; falta conferir esse envio pelo
   app atualizado antes de habilitar a contingência. Produção mantém multipart.
2. Processadores de faturamento/e-mail/avisos e webhooks financeiros ainda
   precisam de execução durável e teste de interrupção/recuperação. O worker de
   push não substitui esses processadores.
3. Confirmar o aviso de esgotamento de cota no painel antes de autorizar a troca.
   A escolha foi preservar essa confirmação explícita: HTTP 503 também representa
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

## Cotas de serviços — somente automáticas

Decisão do proprietário em 23/10: mostrar somente provedores com integração
automática. O catálogo mantém Brevo e Resend. Render, Netlify e Supabase foram
retirados; formulário e endpoint manuais removidos e RPC manual revogada para
service_role. Leituras e auditorias anteriores são preservadas como histórico.

- Menu exclusivo de ADM, com bloqueio também na API e nas RPCs do banco.
- Resend consulta `/usage` usando a chave existente de recebimento quando não há
  chave dedicada ou de envio. Leitura real validada no banco e no emulador.
- Brevo consulta `/v3/account` com `BREVO_API_KEY`; somente o plano gratuito
  `free`/`sendLimit` recebe o limite documentado de 300 envios por dia. Créditos
  retornados são restantes, não utilizados. Plano pago ou resposta divergente
  ficam sem saldo confirmado. Consulta real validada no Preview em `dcdf4d34` e
  card conferido no emulador: 300 envios restantes, 0 de 300 utilizados.
- Não há coleta automática conectada para Render, Netlify e Supabase; seus cards
  não devem ser oferecidos como monitoramento automático. O teste anterior de
  registro manual da Netlify permanece apenas no histórico.
- Avisos no app e fila de push em 80/90/100%; testes de auditoria, privilégios e
  notificações feitos com rollback. Não foi enviado aviso fictício de cota aos
  usuários. Push revalida o acesso ADM e usa somente dispositivos Gerador.
- Compilação app/backend aprovadas. Regressão geral: 137 testes; bateria de
  contingência/cotas: 17 antes da inclusão do Brevo; três testes de formulário,
  permissão e destino de PDF. Cinco testes de política de cotas passaram após a
  inclusão do Brevo.
- Base das cotas promovida para main em `2387d3ba`; backend produção confirmado
  nessa versão e OTA Gerador produção `1d1eca07-7e7b-4be9-b3c4-2c70a47b6826`.
  Migrações até `20261023014000` aplicadas nos dois bancos. Restrição a somente
  automáticas confirmada no Preview `ef81bad` e em produção `71e2558`. Brevo e
  Resend retornaram `OK` na consulta de produção após a publicação.

## Preparação adicional de 23/10 — ainda em validação

- Controle único de executor no banco e reservas das tarefas por dono. Importação
  interrompida fica em `REVISAO`, sem repetição automática de efeitos incertos.
- Troca auditada exclusiva de ADM, mediante confirmação específica da cota Render,
  versão validada e ausência de operações ou tarefas pendentes de conferência.
- Requisições de alteração reservadas antes dos efeitos; executor inativo e versão
  do reserva divergente são bloqueados. O controle não é acionado por timeout.
- Funções de segundo plano preparadas para filas longas e despacho com segredo.
- Resolução do destino nos apps preparada, desativada até validação e publicação.
- Teste de troca, disputa, interrupção e privilégios passou no banco Preview com
  rollback. Migração `20261023110000` aplicada somente no Preview; 137 testes de
  regressão e testes específicos aprovados. Agendador novo ainda desativado.
- O projeto de produção da Netlify ainda não foi criado. Credenciais, uploads pelo
  app, webhooks, retorno ao principal e teste remoto completo continuam pendentes.

Nenhum pagamento, plano pago, saldo financeiro ou configuração de faturamento
foi alterado para implementar o monitoramento.

## Referências consultadas

https://render.com/docs/free
https://api-docs.render.com/openapi/render-public-api-1.json
https://docs.netlify.com/build/functions/scheduled-functions/
