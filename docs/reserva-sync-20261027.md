# SincronizaÃ§Ã£o do reserva â€” 27/10/2026

Base: 4076df57 (revisÃ£o efetivamente ativa no reserva de produÃ§Ã£o).
Copiados de origin/main apenas os mÃ³dulos de negÃ³cio modificados: Gmail, avisos/entrega de e-mail, cota CapMonster, UCs Ã¢ncora e validaÃ§Ã£o de rateio. Preservados identidade, monitor de billing, exclusividade do executor, ingress de callbacks, filas durÃ¡veis e versÃµes das dependÃªncias do reserva.

Build backend passou; 49 testes direcionados passaram com credenciais fictÃ­cias. NÃ£o foram criadas cobranÃ§as, transferÃªncias, mensagens reais ou protocolos Cemig.

Estado: preparado, nÃ£o implantado. Antes de publicar: conferir migraÃ§Ãµes/schema de produÃ§Ã£o, adicionar validaÃ§Ã£o de todos os jobs e rotas do reserva, conferir service/branch na conta Render autorizada. O executor ativo exige aprovaÃ§Ã£o do commit implantado; nÃ£o apenas trocar a versÃ£o no banco sem conferir o artefato. Programar a implantaÃ§Ã£o para nÃ£o deixar o Ãºnico backend ativo indisponÃ­vel por erro de aprovaÃ§Ã£o. Cascata Netlify permanece adiada; nenhuma alteraÃ§Ã£o nela.


## Correção de segurança posterior

Lockfile atualiza qs de 6.16.0 para 6.16.2, dentro da resolução compatível já utilizada pelo backend. A vulnerabilidade moderada GHSA-6pq8-jhm2-2vcw foi corrigida nessa linha. Compilação e 56 testes de exclusividade, callbacks, limitadores, Gmail, importação e convites passaram com credenciais fictícias. `npm audit --omit=dev` retornou zero vulnerabilidades conhecidas em 27/10/2026. Isso não representa garantia de ausência de falhas.

Esta correção de dependência ainda precisa de deploy e conferência do commit antes da aprovação operacional. O controle do navegador informou que está desativado nas configurações da sessão; o conector Render não está disponível. Não alterar o commit aprovado do banco antes de verificar o artefato realmente implantado.
