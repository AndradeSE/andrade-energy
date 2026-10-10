# Solar na web e no app — melhorias de 09/10/2026

O mecanismo de revisão e execução passou a ser compartilhado em `shared/solar-automation.ts`. A web e o app usam as mesmas validações para editar nome, e-mail e telefone do perfil, contato de clientes autorizados, nome da usina selecionada e apelido de UC própria. O app mostra confirmação no chat ou em um diálogo quando usado pelo assistente de voz flutuante.

Comandos educados com “Solar”, “por favor” e “pode” são reconhecidos sem alterar nomes e valores enviados. Verbos no imperativo de operações financeiras ou legais encaminham à revisão nas telas próprias. A Solar não emite faturas, transfere dinheiro nem assina contratos automaticamente. O motor de faturamento não foi alterado.

As consultas de faturas do consumidor agora usam cliente e número da UC selecionada; as do gerador usam a usina selecionada. A navegação do consumidor abre sua lista de faturas. Foram preservadas as consultas existentes de valores, atrasos e documentos.

As duas interfaces oferecem sugestões iniciais. A web permite cancelar consultas, limita consultas a 25 segundos e mantém até 40 mensagens. O app limita as requisições de cadastro e explica respostas perdidas sem reenviar alterações. O acesso e o contexto são revalidados antes de gravar; confirmação vencida, reutilizada ou de outro contexto é recusada. A verificação anterior à escrita não representa uma transação atômica no banco; a autorização continua no backend.

Validação local: 68 testes da web passaram; build TypeScript/Vite/worker passou; TypeScript do app passou. O teste das ferramentas do app cobre 25 módulos, consultas de faturas no contexto, PDFs, imperativos, permissões da automação nativa, bloqueio antes de escrita após troca de contexto e tratamento de falha de rede. Os testes usam dados fictícios, sem alterações em contas reais.

O projeto original do domínio `www.andradeenergy.com.br` continua retornando `NOT_FOUND` na conexão Sites. A web não foi publicada por essa conexão. Esta documentação complementa `solar-automacao-web-20261009.md`, que registra a validação anterior da interface web. A validação física das novas alterações no celular ainda está pendente.

## Publicação dos apps

O Expo confirmou exportação Android e publicação OTA no runtime `1.0.4-preview-live-awake`:

- Consumidor Preview: grupo `a3c9131b-621f-4075-b4ec-e0e4aae76979`, código `6390a75`.
- Gerador Preview: grupo `74d9b0bc-7c17-41f4-b72b-7a06bf2a3dea`, código `1602963` (a diferença é documental).

Na etapa inicial, a produção permaneceu pendente de homologação física. Os comandos registram árvore suja por arquivos de trabalho preexistentes, fora do código desta alteração; esses arquivos não foram incluídos nos commits. Publicação OTA confirmada não comprova recebimento ou execução no aparelho.

## Produção publicada após solicitação explícita

Em 09/10/2026, o usuário solicitou também a publicação em produção. O Expo confirmou os dois canais Android no runtime `1.0.4-production-live-awake`, com código `15d3297`:

- Consumidor: grupo `5fb73758-9ed4-4968-9b0d-9918f23ae017`.
- Gerador: grupo `ce6abf2f-eb42-4df4-bc3f-421c319515fa`.

Foram habilitadas as flags de Gemini Live e voz online usadas nos APKs de produção para manter a compatibilidade do runtime. A API de produção respondeu `online`, commit `e581f6a`. Não houve redeploy de backend nem alteração em faturamento nesta publicação. A entrega no aparelho não foi verificada fisicamente. A publicação web continua bloqueada pelo acesso ao Sites.
