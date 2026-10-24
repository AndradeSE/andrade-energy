# Render reserva na segunda conta

## Estado em 24/10/2026, preparação de produção

Conta de destino autorizada pelo titular: andradeenergy@hotmail.com, workspace
My Workspace (tea-dbdrk3fb9u1s73b9oe6g). Preview conferido com requisições autenticadas,
lista de usinas, Home, Financeiro e webhook Resend assinado sem gerar fatura.

Serviço de produção criado: srv-dbejmn5g1s2s73fqn6m0,
https://andrade-energy-api-reserva-producao.onrender.com, plano Free, Ohio.
Branch dedicada codex/render-reserva-producao-20261024, com base em origin/main
6070332c e somente as alterações de contingência conferidas do Preview.
O titular importou as credenciais diretamente no painel; nenhum segredo foi
registrado neste documento. O primeiro deploy foi cancelado antes de habilitar
os controles exclusivos do reserva. O token SUPABASE_ACCESS_TOKEN foi removido
do reserva por não ser necessário à execução do backend.

## Configuração obrigatória

- CONTINGENCY_EXECUTOR=RENDER_RESERVA
- CONTINGENCY_ENVIRONMENT=production
- RENDER_RESERVE_PRODUCTION_ENABLED=true
- CONTINGENCY_ROUTING_ENABLED=true
- BACKGROUND_JOBS_ENABLED=true
- DURABLE_SCHEDULER_ENABLED=true
- CEMIG_CLOUD_ENABLED=false
- SUPABASE_URL=https://ehnkyrsseisvvtbkwrvu.supabase.co
- RENDER_MONITOR_API_KEY: chave privada da conta principal, entrada pelo titular.

Build: cd backend && npm ci --include=dev && npm run build
Start: cd backend && npm start
Health: /health. Auto-deploy desligado durante a preparação.

A identidade exige ambiente e banco exatos, autorização explícita de produção,
controle de execução e filas duráveis. Versão implantada e versão aprovada no
banco devem coincidir. O serviço inativo recusa trabalho; callbacks assinados
podem ser encaminhados uma única vez ao primário fixo do mesmo ambiente.

## Conferências concluídas

- Compilação backend e 12 testes de identidade, monitor, callbacks e prontidão.
- Quatro testes de roteamento dos apps, sem repetição de operações financeiras.
- TypeScript do app sem erros.
- Testes transacionais no banco de produção com rollback integral: executor
  exclusivo, versão, requisições em curso, trabalhos incertos, observações de
  billing consecutivas, auditoria, ausência de retorno automático.
- Migrações 20261024210000 e 20261024213000 aplicadas em produção sem ativar reserva.
  Estado preservado: executor RENDER, revisão 1, reserva preferida NETLIFY.

## Pendências antes de habilitar

Conferir configuração salva e deploy Live, chave do monitor e acesso ao serviço
principal exato; cadastrar retornos OAuth/webhooks no novo destino e validar
assinaturas sem movimentação financeira. Aprovar o commit implantado somente
após essas verificações. Publicar roteamento nos dois apps e conferir a revisão.
Somente depois selecionar RENDER_RESERVA como reserva preferida. O principal
permanece ativo; o monitor troca apenas por suspensão billing confirmada em
consultas consecutivas, sem operações em curso ou pendentes. Retorno é manual.

Planos gratuitos podem dormir e atrasar a primeira consulta; duas contas do
mesmo provedor não protegem contra indisponibilidade geral do Render. Não há
promessa de disponibilidade ininterrupta nem autorização para contratar planos.
