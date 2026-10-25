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

- Compilação backend e 49 testes de identidade, monitor, callbacks, prontidão e
  conexão de e-mail. Auditoria npm de produção do reserva: zero vulnerabilidades.
- Quatro testes de roteamento dos apps, sem repetição de operações financeiras.
- TypeScript do app sem erros.
- Testes transacionais no banco de produção com rollback integral: executor
  exclusivo, versão, requisições em curso, trabalhos incertos, observações de
  billing consecutivas, auditoria, ausência de retorno automático.
- Migrações 20261024210000 e 20261024213000 aplicadas em produção sem ativar reserva.
  Estado preservado: executor RENDER, revisão 1, reserva preferida NETLIFY.

## Retornos e publicação

O reserva ficou Live no commit e863b1a8c58d29457921be3fb28acccb0fc8dd33.
O monitor confirmou o principal como ATIVO. Foram cadastrados os callbacks
Gmail e Outlook, o recebimento Resend, o webhook Asaas e a validação de saques
Asaas no novo endereço, preservando as chaves e permissões existentes.
O titular concluiu a confirmação SMS exigida pelo Asaas.

O token Mercado Pago já configurado no backend pertence ao vendedor de teste
da própria conta do titular, aplicação 8102848249866181. Não foi substituído.
Os dois modos de webhook dessa aplicação apontam ao novo reserva. Um evento
neutro assinado mp-connect, ID fictício 123456, retornou 200 OK pelo reserva e
principal, sem cobrança nem transferência. Isso valida o retorno dessa
integração existente; não transforma a conta de teste em conta de produção.

OTAs de produção publicadas para o runtime 1.0.4-production-live-awake:
- Gerador: 3d353756-32ad-4c77-bbc9-038dbb02df08.
- Consumidor: bae9422e-4247-445d-850e-585fa0c805b3.
Gerador runtime 1.0.0: 5c97e02e-6c41-4934-9ed2-af345721e0bf.
Consumidor runtime 1.0.0: 9d13740d-d700-4c89-b7a7-7d9891c6416d.
O Metro foi ajustado para resolver dependências compartilhadas por junction,
incluindo o pacote local decode-uri-component, sem alterar dependências.

## Controle habilitado

As quatro OTAs terminaram. O commit implantado e863b1a8 foi aprovado com
auditoria no banco. A função configurar_destino_reserva_render selecionou
RENDER_RESERVA como destino preferencial, revisão 2, mantendo executor RENDER.
O health público confirmou readyForFailover=true e o endpoint de roteamento
confirmou o principal ativo. A tentativa de acesso operacional direto ao reserva
inativo retornou 503 EXECUTOR_INATIVO, preservando a exclusividade.
O principal permanece ativo; o monitor troca apenas por suspensão billing confirmada em
consultas consecutivas, sem operações em curso ou pendentes. Retorno é manual.

Planos gratuitos podem dormir e atrasar a primeira consulta; duas contas do
mesmo provedor não protegem contra indisponibilidade geral do Render. Não há
promessa de disponibilidade ininterrupta nem autorização para contratar planos.
