# Ambiente de homologação

- Supabase: `qqhcjieymypowunkixmk` (Andrade Energy Homologacao), separado de produção.
- API Render: `andrade-energy-api-homologacao` (`srv-das0mmfpn0mc73ec00hg`).
- Asaas: usar somente `https://api-sandbox.asaas.com/v3` e credenciais próprias do Sandbox. Em 26/09/2026 foi criada a chave `Andrade Energy Homologacao Render` e cadastrada nas variáveis `ASAAS_API_KEY` e `ASAAS_COMERCIAL_API_KEY` do serviço Render de homologação; a autorização de saques pela chave ficou desativada. Nunca copiar chaves Asaas de produção.
- Aplicativos: os perfis EAS `preview` e `preview-gerador` apontam para a API de homologação. A variável `EXPO_PUBLIC_API_URL` também está cadastrada no ambiente EAS `preview` de cada projeto (`andrade-energy` e `andrade-energy-gerador`). Os perfis de produção continuam na API de produção.

O arquivo `baseline_public_20260926.sql` foi exportado somente com a estrutura do schema `public`: 47 tabelas, 7 funções e nenhum registro. Deve ser aplicado com `psql` como administrador em um projeto Supabase novo, que já contém os schemas internos (`auth`, `storage`). Não use esse baseline para sobrescrever um banco existente; compare antes as migrações posteriores. Após a restauração, confirme as permissões de `service_role`, a referência `usuarios.auth_user_id -> auth.users.id` e que `clientes`, `contratos`, `faturas` e `auth.users` estão vazios.

Após restaurar a estrutura, crie os buckets privados `faturas` e `contratos` (PDF, limite 10 MB). Aplique `seed_homologacao.sql` apenas no projeto de homologação para criar a empresa-base e os três planos públicos; o script não importa usuários nem dados de produção. Em 26/09/2026, ambos os buckets foram criados e o seed executado: 1 empresa-base e 3 planos ativos.

Antes de publicar uma atualização OTA no Preview, selecione o projeto com `EXPO_PUBLIC_APP_VARIANT=consumidor` ou `gerador`, use `--environment preview` e confirme que `EXPO_PUBLIC_API_URL` resolve para `https://andrade-energy-api-homologacao.onrender.com/api`. O cliente Supabase do app deriva o projeto da mesma URL; não publique um bundle Preview com a URL da API de produção.

Em 26/09/2026, foram publicadas as OTAs Android Preview do Consumidor (`b4e2de2e-026b-4877-b22a-18f13a40f314`) e Gerador (`473a84c9-3224-437f-940b-309371ba243d`). Produção não recebeu essa mudança. A API de homologação voltou a responder `/health` após o deploy com a chave Sandbox. Isso verifica disponibilidade, não um ciclo completo de cobrança; transferências automáticas permanecem desativadas.

Validação ainda necessária antes de declarar o Preview funcional de ponta a ponta: criar uma conta de teste isolada, testar convite e e-mail de confirmação, upload/abertura de PDF, aceite de contrato, notificação no Android e cobrança no Asaas Sandbox. O banco de homologação começa sem usuários; uma conta de produção não entra automaticamente. O envio de e-mail transacional requer um provedor de testes (`RESEND_API_KEY`, Microsoft ou Brevo) no serviço de homologação; sem ele, o backend registra que nenhum provedor está configurado. Não copie a chave de produção nem envie mensagens reais a clientes durante esses testes.
