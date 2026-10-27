# Sincronização do reserva — 27/10/2026

Base: 4076df57 (revisão efetivamente ativa no reserva de produção).
Copiados de origin/main apenas os módulos de negócio modificados: Gmail, avisos/entrega de e-mail, cota CapMonster, UCs âncora e validação de rateio. Preservados identidade, monitor de billing, exclusividade do executor, ingress de callbacks, filas duráveis e versões das dependências do reserva.

Build backend passou; 49 testes direcionados passaram com credenciais fictícias. Não foram criadas cobranças, transferências, mensagens reais ou protocolos Cemig.

Estado: preparado, não implantado. Antes de publicar: conferir migrações/schema de produção, adicionar validação de todos os jobs e rotas do reserva, conferir service/branch na conta Render autorizada. O executor ativo exige aprovação do commit implantado; não apenas trocar a versão no banco sem conferir o artefato. Programar a implantação para não deixar o único backend ativo indisponível por erro de aprovação. Cascata Netlify permanece adiada; nenhuma alteração nela.
