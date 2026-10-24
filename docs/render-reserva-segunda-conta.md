# Reserva na segunda conta Render — preparação

Destino conferido no Chrome: `andradeenergy@hotmail.com`, workspace `My Workspace`
  (`tea-dbdrk3fb9u1s73b9oe6g`). Serviço ainda não criado. Não há transferência de
segredos autorizada para esta conta nesta preparação.

## Configuração planejada para homologação

- Nome: `andrade-energy-api-reserva-preview`.
- Repositório privado existente `AndradeSE/andrade-energy`; conectar o provedor
  Git e limitar o acesso ao repositório necessário, sem torná-lo público.
- Branch dedicada `codex/render-reserva-preview-20261024`.
- Node, região Ohio, plano Free, uma instância, sem disco ou banco adicional.
- Build: `cd backend && npm ci --include=dev && npm run build`.
- Start: `cd backend && npm start`; health: `/health`.
- Auto-deploy desligado durante a homologação.
- Agendadores, simulação Cemig e importações desabilitados até a validação.
- Credenciais exclusivamente do Preview, por variáveis privadas, somente após
  confirmar a ampliação de acesso para a segunda conta.

## Bloqueio técnico identificado

Não basta copiar o backend: `contingencyRequestGuard.ts` identifica qualquer
processo não serverless como `RENDER`. O banco, os agendadores, as rotas de troca
e o cliente reconhecem apenas `RENDER` e `NETLIFY`. O segundo serviço deve receber
uma identidade própria antes de operar. Não usar `API_RUNTIME=serverless` para
fingir que o Render é Netlify; isso também impede o servidor de abrir sua porta.

## Critérios para ativação

1. Nova identidade de executor no banco e no backend, com controle transacional,
   revisão e versão validada; instância inativa deve recusar operações.
2. Testar concorrência, interrupção e recuperação sem duplicar pagamentos,
   notificações, importações ou contratos. Timeout não autoriza repetir escrita.
3. Seleção de destino nos apps e web, callbacks/webhooks e monitor independente
   revisados; não depender do primário suspenso para executar a troca.
4. Testar login/logout, isolamento entre empresas, PDF privado e assinatura dos
   webhooks no Preview antes de qualquer configuração de produção.
5. Confirmar elegibilidade do uso gratuito para este cenário com o Render. Outra
   conta não oferece independência contra falha geral do provedor nem elimina
   limites do plano Free.

## Estado em 24/10/2026

GitHub conectado com autorização expressa do proprietário somente ao repositório
`AndradeSE/andrade-energy`. Formulário preparado em Ohio, plano Free (US$ 0).

Primeira etapa de código: `CONTINGENCY_EXECUTOR=RENDER_RESERVA` distingue o
segundo serviço do primário e só inicia com banco Preview, controle de execução
ativo, agendadores desativados e Cemig desligada. Usa `RENDER_GIT_COMMIT` para
comparar a versão efetivamente implantada. Health informa `readyForFailover=false`.
Build e 15 testes de identidade, controle de concorrência e contingência passaram.

Esta etapa NÃO habilita troca: o banco ainda não aceita `RENDER_RESERVA`, portanto
as APIs protegidas recusam execução. Faltam migração/validação da nova identidade,
seleção de destino nos clientes, monitor externo e testes reais antes de ativação.
Não marcar esse commit como reserva validado nem trocar o executor no banco.

Variáveis não secretas do piloto: `CONTINGENCY_EXECUTOR=RENDER_RESERVA`,
`CONTINGENCY_ENVIRONMENT=preview`, `CONTINGENCY_ROUTING_ENABLED=true`,
`BACKGROUND_JOBS_ENABLED=false`, `DURABLE_SCHEDULER_ENABLED=false`,
`CEMIG_CLOUD_ENABLED=false`, `SUPABASE_URL=https://qqhcjieymypowunkixmk.supabase.co`.
`SUPABASE_SERVICE_KEY` é necessária para iniciar a validação de schema. A entrada
e o salvamento de credenciais no painel devem ser concluídos pelo titular.

Código e bancos de produção não alterados. Nenhum recurso pago, serviço de
reserva ou segredo foi criado/copiado na segunda conta nesta etapa.
