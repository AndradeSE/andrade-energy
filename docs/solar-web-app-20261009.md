# Solar na web e no app — melhorias de 09/10/2026

O mecanismo de revisão e execução passou a ser compartilhado em `shared/solar-automation.ts`. A web e o app usam as mesmas validações para editar nome, e-mail e telefone do perfil, contato de clientes autorizados, nome da usina selecionada e apelido de UC própria. O app mostra confirmação no chat ou em um diálogo quando usado pelo assistente de voz flutuante.

Comandos educados com “Solar”, “por favor” e “pode” são reconhecidos sem alterar nomes e valores enviados. Verbos no imperativo de operações financeiras ou legais encaminham à revisão nas telas próprias. A Solar não emite faturas, transfere dinheiro nem assina contratos automaticamente. O motor de faturamento não foi alterado.

As consultas de faturas do consumidor agora usam cliente e número da UC selecionada; as do gerador usam a usina selecionada. A navegação do consumidor abre sua lista de faturas. Foram preservadas as consultas existentes de valores, atrasos e documentos.

As duas interfaces oferecem sugestões iniciais. A web permite cancelar consultas, limita consultas a 25 segundos e mantém até 40 mensagens. O app limita as requisições de cadastro e explica respostas perdidas sem reenviar alterações. O acesso e o contexto são revalidados antes de gravar; confirmação vencida, reutilizada ou de outro contexto é recusada. A verificação anterior à escrita não representa uma transação atômica no banco; a autorização continua no backend.

Validação local: 68 testes da web passaram; build TypeScript/Vite/worker passou; TypeScript do app passou. O teste das ferramentas do app cobre 25 módulos, consultas de faturas no contexto, PDFs, imperativos, permissões da automação nativa, bloqueio antes de escrita após troca de contexto e tratamento de falha de rede. Os testes usam dados fictícios, sem alterações em contas reais.

O projeto original do domínio `www.andradeenergy.com.br` continua retornando `NOT_FOUND` na conexão Sites. A web não foi publicada por essa conexão. Esta documentação complementa `solar-automacao-web-20261009.md`, que registra a validação anterior da interface web. A validação física das novas alterações no celular ainda está pendente.
