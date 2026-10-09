# Auditoria dos fluxos da web — 09/10/2026

Correções implementadas no código e verificadas localmente. Esta revisão não constitui publicação da web nem certificação de ausência de todas as falhas.

## Correções

- Sessão restaurada com o perfil confirmado pelo servidor; metadados de outra conta não são reaproveitados. Respostas 401 de chamadas protegidas retornam ao login; erros de login e convites públicos permanecem nos próprios formulários.
- Perfil do consumidor envia `tipo: CONSUMIDOR` ao carregar e salvar. Controles de troca do ambiente administrativo aparecem somente para administradores geradores.
- Falhas de rede nos formulários de perfil, senha, contas, empresas, marca, assinatura e edição não deixam a interface presa em salvamento ou carregamento.
- Troca de UC/usina cancela consultas anteriores e limpa listas de registros. Detalhes e assinatura reiniciam para o documento selecionado; solicitações de assinatura antigas são abortadas.
- PDF enviado não significa assinatura validada. O indicador considera aceite, conferência externa e PDFs vigentes conferidos, preservando a exigência de novo aceite nas revisões. A autorização efetiva continua sendo aplicada pelo backend por UC.
- Data vazia, impossível ou prazo inválido não derrubam contratos. Geração respeita a validação dos campos. Envio exige revisão explícita da minuta gerada com o mesmo conteúdo atual. Erros ao consultar contrato não são interpretados como ausência de contrato; somente 404 permite um novo rascunho.
- Editor genérico mantém somente Clientes/Usinas; edição de contratos permanece no fluxo específico. Removidas operações sem PUT suportado. Salvamento envia apenas campos alterados e não converte campos financeiros vazios em zero.
- Backend de cadastro de usina preserva CPF da UC geradora quando uma edição parcial não informa esse campo. Alteração explícita do CPF continua suportada. Nenhuma mudança no motor de faturamento.
- Conexão de e-mail tem trava contra solicitações simultâneas e descarta confirmações antigas após troca de UC/cancelamento. Modal trata falha de consulta e mostra escopo correto; copiar endereço informa falha quando o navegador não permite acesso à área de transferência.
- Novos convites limpam dados e senhas do convite anterior. Adesão tolera fragmento inválido e armazenamento bloqueado; pagamento exige URL HTTPS e documentos disponíveis, e mudança de plano/ciclo invalida o aceite anterior.
- Resposta incompleta de carteira não derruba a home nem cria um saldo fictício. Transferências recusam valores não finitos ou não positivos, bloqueiam cliques simultâneos e reutilizam a chave de idempotência em tentativas da mesma operação cuja resposta não foi confirmada.
- Home não mostra indicadores como zero durante carregamento ou falha. Removidas afirmações fixas de crescimento de 8,4%, preço inicial e desconto promocional. Página de planos usa valores do servidor e apresenta falha de consulta.
- Privacidade aceita titular retornado como objeto ou lista, trata data inválida e apresenta todos os tipos disponíveis. Limpar notificações mantém novos avisos visíveis e informa quando a preferência não pôde ser persistida.

## Validação

- Web: **50 testes passaram**, incluindo projeções GD1/GD2, consultas da Solar por UC, armazenamento, assinaturas, sessão, proxy/cookies, idempotência e valores inválidos.
- Backend de produção preparado: **97 testes passaram** (suíte principal, conexão Gmail/Outlook e novos testes do cadastro da usina), com Supabase fictício (`https://test.invalid`).
- Backend preview preparado: build e **2 novos testes do CPF passaram**; testes de sessão/retorno web já haviam passado na preparação anterior.
- Builds TypeScript dos dois backends e build Vite/worker da web concluídos.
- Navegador: fluxos de consumidor com duas UCs, gerador e administração comercial; perfil sem controles administrativos no consumidor; contrato 404/500; erro de envio de código e salvamento; troca de registro; provedores Gmail/Outlook/manual; limpar notificações; restauração de outro perfil e sessão expirada.
- Os cenários de navegador usaram dados fictícios e `fetch` simulado em uma entrada temporária exclusiva para QA. Essa entrada foi movida para fora do projeto, não integra o build. Evidência: `C:/Users/vini_/.codex/web-flows-audit-20261009.png`.
- Não houve emissão de fatura, assinatura real, transferência, envio de e-mail a cliente ou alteração de uma fatura existente.

## Publicação e limites

A web **não está publicada com estas correções**. O identificador salvo em `portal-web/.openai/hosting.json` não foi encontrado na conexão atual do Sites. O endereço do portal em uso foi solicitado para identificar o destino correto; nenhum outro projeto foi selecionado como substituto.

Os backends preparados também ainda precisam ser publicados. Publicar os endpoints de sessão/retorno OAuth e a preservação do CPF **antes** da nova web. Só depois verificar login, cookie e OAuth no domínio real. Não validar o editor de usina contra o backend antigo, que ainda possui a falha de edição parcial descrita acima.

Entrega real de push, OAuth real, microfone e transações financeiras não foram executadas nesta revisão local. A divergência pré-existente entre simuladores no script `test-two-uc-projections.cjs` permanece registrada na adaptação anterior; não foi alterada a fórmula para forçar equivalência entre premissas distintas.
