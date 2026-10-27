# Correção preparada: roteamento da web para o executor confirmado

Estado: preparação local, NÃO publicada no Sites.

O Preview publicado respondeu HTTP 200 no HTML e HTTP 503 Service Suspended em /api/usinas durante a suspensão do Render. O Render reserva do Preview respondeu pronto e ativo. A conexão Sites atual retornou NOT_FOUND para o projeto existente; não foi criado site substituto.

Quando o acesso ao Sites for restabelecido:
1. Abrir o projeto existente pelo fluxo de credencial/source helper da habilidade Sites e comparar estes arquivos com a versão corrente. Preservar projeto, domínio, público e demais alterações.
2. Aplicar api-proxy.mjs como worker/api-proxy.js; adicionar contingency-routing.mjs no mesmo diretório.
3. Adicionar ao script de preparação a cópia de contingency-routing.mjs para dist/server. O arquivo prepare-worker.mjs desta pasta exemplifica a alteração na cópia local; não substituir outras alterações do site sem comparar.
4. Manter ANDRADE_API_ORIGIN da homologação no Preview e o da produção no site principal. O resolvedor deriva ambiente exclusivamente dessa origem fixa, consulta metadados públicos e usa somente destinos autorizados.
5. Rodar os testes e o build do site; empacotar e publicar a versão do projeto correto. Conferir o acesso pela web Preview antes de promover o mesmo ajuste ao site principal.

Testes autocontidos:
node --test docs/patches/web-fallback-20261027/test-routing.mjs docs/patches/web-fallback-20261027/test-proxy.mjs docs/patches/web-fallback-20261027/test-session-regression.mjs

Resultado local: 13 testes passaram. Consulta real do resolvedor selecionou https://andrade-energy-api-reserva-preview.onrender.com. Não houve cobrança, transferência ou envio Cemig.

O cookie permanece HttpOnly/Secure/SameSite. Consultas de metadados não recebem credenciais. Há somente uma tentativa de cada pedido de negócio, sem replay após timeout ou 503. A cascata entre reservas não é ativada por esta correção. Isso não comprova publicação nem teste autenticado da web hospedada.
