# Cascata de backend

## Ordem e critério

Render principal → Render reserva → Netlify. O banco continua sendo a autoridade
única sobre o executor. A primeira etapa usa o monitor já homologado; a segunda
é consultada pelo agendador independente da Netlify. Se ambos os Renders já
estiverem suspensos por cobrança, a Netlify pode assumir diretamente.

São exigidas duas observações consecutivas de billing por pelo menos 60 segundos,
espaçadas em pelo menos 45 segundos. Timeout, chave inválida, serviço errado,
plano diferente, suspensão manual ou resposta indisponível não ativam a troca.
Operações em andamento e trabalhos com resultado incerto bloqueiam a mudança.
O retorno ao principal é manual. Alterações e avisos ficam registrados no banco.

## Configuração

No projeto Netlify de cada ambiente, sem compartilhar as chaves com os apps:
- CONTINGENCY_CASCADE_ENABLED=true
- NETLIFY_DURABLE_JOBS_ENABLED=true (configuração existente)
- RENDER_MONITOR_API_KEY: conta do Render principal (existente)
- RENDER_RESERVE_MONITOR_API_KEY: conta do segundo Render

A segunda chave exige autorização e entrada pelo titular. Não copiar chaves de
pagamentos ou banco para este campo. A consulta verifica o ID e o endereço exatos
do serviço Free de cada ambiente; não permite ao cliente escolher um destino.

Migração: 20261025010000_contingencia_cascata.sql. O padrão é desativado.
Após publicar e validar os dois reservas, aprovar os commits implantados no banco,
conferir as leituras reais e ativar por configurar_contingencia_cascata ou pelo
controle exclusivo do ADM em Cotas de serviços. Publicar os apps somente após a
conferência do backend Preview. Não reaproveitar a aprovação de um commit antigo.

O app consulta metadados dos dois controles por GET, com ambiente e destino
validados. A indisponibilidade de um controle não muda o executor por si só.
Requisições de negócio e alterações administrativas nunca são reenviadas
automaticamente. Callbacks preservam as assinaturas e usam um único salto ao
executor fixo correspondente ao ambiente, com proteção contra ciclos.

## Conferência em 25/10/2026

- Compilação backend e TypeScript do app passaram.
- 19 testes de backend e 5 testes de roteamento passaram.
- A migração foi aplicada somente ao banco Preview, mantendo cascata desativada.
- Teste SQL transacional completo no Preview passou com rollback de todos os
  dados: etapas Render/Render reserva/Netlify, ambos suspensos, isolamento,
  intervalo, versão, falha de provedor, operações pendentes, auditoria e retorno.
- Nenhuma alteração de executor, migração ou OTA de produção nesta implementação.
- Publicação real bloqueada pela Netlify: a equipe Andrade Energy esgotou os
  créditos de deploy. Os serviços antigos continuam online com créditos
  operacionais; o ciclo mostrado no painel é de 1 a 31 de outubro.
- Faltam a publicação liberada, a chave de consulta da segunda conta na Netlify,
  testes online no Preview e, depois, a ativação de produção. Não considerar a
  cascata online enquanto essas etapas não forem verificadas.

Não contratar upgrade nem recarga sem autorização. Planos Free podem dormir;
a cascata não elimina dependências compartilhadas como Supabase ou falhas gerais
do Render e não implica disponibilidade ininterrupta.
