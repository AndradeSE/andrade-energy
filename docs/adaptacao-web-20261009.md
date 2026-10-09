# Adaptação do portal web — 9 de outubro de 2026

## Estado

Alterações implementadas localmente, compiladas e parcialmente verificadas no navegador. Ainda não publicadas. O identificador salvo em `portal-web/.openai/hosting.json`, `appgprj_6a8c66b15ba48191baad8777fd2d1eba`, retornou “Sites project not found” na conexão atual. A lista de Sites acessíveis contém outro Andrade Energy, com identificador e conta diferentes; ele não foi selecionado nem alterado. O endereço do portal em uso foi solicitado ao usuário. A identidade de hospedagem original foi preservada.

## Melhorias

- Solar flutuante: conversa por texto, leitura de resposta pela API de voz e ditado com consentimento explícito; gravação limitada a 25 segundos/2 MB. Fechar, sair ou ocultar a página interrompe a captação. O texto transcrito é revisado antes do envio. Não há escuta permanente nem palavra de ativação em segundo plano no navegador.
- Consultas determinísticas de conta passam pelas APIs autenticadas. Faturas e economia do consumidor usam a UC selecionada. Consultas privadas não são incluídas no histórico enviado ao modelo de ajuda. A IA não executa cobranças, transferências, assinaturas ou cadastros.
- Gmail e Hotmail/Outlook com logotipos e cores, configuração manual por último, desconexão com confirmação e conclusão OAuth verificada pelo servidor. Uma conexão sem regra de encaminhamento não aparece como automação concluída.
- Retorno OAuth web fixo no backend, sem abrir um aplicativo nativo, sem aceitar destino arbitrário e sem expor tokens do provedor. Retorno nativo preservado.
- Cards expansíveis de privacidade com tipo, status, data, titular quando aplicável e protocolo.
- “Limpar lista” discreto nas notificações, com preferência por usuário no navegador; novas notificações continuam visíveis. Não apaga o histórico do servidor. O push Android continua independente do navegador; Web Push ainda não foi implementado.
- Carrossel duplicado do comercial removido; acessos rápidos da Home preservados.
- Seletor de UC no consumidor. Requisições de dashboard/faturas/economia são canceladas ao trocar de UC, evitando resposta antiga no novo contexto.
- Percentual energético usa compensação da competência, não saldo acumulado. O percentual não é forçado a 100% sem dados que sustentem esse valor.
- Sessão web por proxy do Worker: cookie HttpOnly, Secure, SameSite=Lax, origem verificada em mutações, destino de API fixo em lista permitida, respostas sem cache. Credencial de sessão retirada das respostas de login e substituída por marcador sem poder de autenticação. Migração do token legado só após validação no servidor. Cabeçalhos de idempotência e adesão pública preservados. Logout revoga exclusivamente a sessão autenticada.

## Validação

39 testes do portal passaram: 23 de projeção existentes, 3 de notificações, 5 de consulta/contexto energético e 8 de proxy/autenticação. TypeScript e build Vite passaram. Backend compilou; 74 testes da suíte padrão e 21 de e-mail passaram com configuração fictícia de teste, sem banco real. Dois testes antigos exigiam variáveis de inicialização; foram executados com `https://test.invalid` e chave fictícia, não com credenciais de produção.

Cards e Solar inspecionados no navegador, incluindo viewport móvel 390×844. O comando de transferência mostrou orientação de revisão sem chamada de operação. Autorização real Gmail/Hotmail, login de conta real, transcrição, áudio online e entrega de push web não foram certificados nessa verificação local. A página temporária usou somente dados fictícios e foi movida para fora do projeto após o teste.

O script legado `scripts/test-two-uc-projections.cjs` falhou sem alteração do cálculo: no primeiro cenário de injeção, expectativa 26,090323%, web 26,082973%, app 22,785053% e backend 26,0903%. O script compara premissas distintas de projeção. O motor financeiro e os calculadores de projeção permaneceram intactos; a divergência precisa de revisão específica com dados e regras aprovados antes de alterar valores.

## Publicação necessária

Antes do portal, publicar os endpoints de sessão/logout e retorno OAuth web em ambos os backends. No Worker de preview, definir `ANDRADE_API_ORIGIN=https://andrade-energy-api-homologacao.onrender.com`; em produção, usar `https://andrade-energy-api-vda.onrender.com`. A variável aceita somente essas origens. `VITE_API_URL` é usada apenas pelo servidor local; o frontend publicado usa `/api` na mesma origem. Manter o público e as permissões do Site existente. Os APKs já entregues não dependem dessas mudanças web.
