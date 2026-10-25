# Navegador reserva da simulação Cemig

Disponível somente no Preview. Browserbase permanece principal. Steel é escolhido
somente quando a consulta oficial confirma minutos insuficientes **antes** de criar
uma sessão Browserbase. Timeout, erro de autorização, falha de consulta, CAPTCHA e
falha no anexo não acionam troca nem repetição.

A conta Steel deve ter crédito inicial confirmado, sem cartão ou recarga. O crédito
de US$ 30 é concedido uma única vez, não mensalmente. Em 25/10 o painel desta conta
ainda exibia saldo zero; não habilitar com base apenas no limite anunciado.

Configuração privada no Render de homologação:

- `STEEL_API_KEY`: chave limitada ao projeto do Preview, nunca no app ou em logs.
- `CEMIG_STEEL_FALLBACK_ENABLED=true`: habilitar somente após validação.
- `STEEL_TRIAL_ONLY_CONFIRMED=true`: somente após confirmar crédito, ausência de
  cartão e de recarga automática. Não há consulta automática de saldo Steel
  implementada; essa flag é uma confirmação operacional, não uma leitura da API.

Sem essas duas flags o caminho permanece desativado. Não há endpoint de compra.
Sessões duram no máximo dez minutos, sem proxy, solver Steel ou perfil persistente.
ID predefinido permite tentar liberar a mesma sessão se a resposta de criação for
perdida. Nunca repetir `create` após uma resposta incerta.

A migração `20261025150000_cemig_steel_preview.sql` registra provedor e consentimento.
A função v2 grava consentimento e reserva na mesma transação, antes de liberar a
fila. O limite mensal e a exclusão mútua existentes permanecem válidos. O app
informa os dois possíveis processadores antes da autorização e mostra o provedor
escolhido. Sessões antigas não autorizam Steel implicitamente.

O visualizador é um endereço de acesso à sessão: fica cifrado no banco e só é
retornado ao ADM proprietário da simulação. Não publicar, registrar em log ou
compartilhar. A chave da API existe somente no transporte privado de conexão.

Validação real pendente: saldo positivo, chave privada, autorização da simulação,
login humano quando necessário e anexo até revisão. Não protocolar neste mês.

Fontes oficiais:

- https://steel.dev/pricing
- https://docs.steel.dev/overview/sessions-api/configuration
- https://docs.steel.dev/overview/sessions-api/session-lifecycle
- https://docs.steel.dev/overview/sessions-api/embed-sessions/live-sessions
