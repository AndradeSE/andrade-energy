# Conexão segura de e-mail para faturas

Esta integração permite que o cliente autorize a própria caixa de e-mail sem informar senha à Andrade Energy. O aplicativo nunca recebe `client_secret`, código de acesso ou `refresh_token`: o backend faz OAuth 2.0 com PKCE e guarda apenas o refresh token cifrado com AES-256-GCM.

## O que cada provedor faz

| Provedor | Resultado atual |
| --- | --- |
| Outlook/Hotmail/Microsoft 365 | Depois da autorização, o backend tenta criar uma regra de caixa de entrada limitada a mensagens da CEMIG, com anexo e assunto de conta/fatura. Ela encaminha o PDF para o endereço exclusivo da UC já configurado no Resend Inbound. |
| Gmail pessoal | A conta fica autorizada somente para leitura (`LEITURA_AUTORIZADA`). O Gmail exige confirmação própria para encaminhamento e não é seguro nem confiável tentar criar essa regra silenciosamente. Uma rotina futura poderá buscar apenas as mensagens necessárias via Gmail API. Até lá, o cliente pode encaminhar a fatura para o endereço exclusivo da UC. |

Quando o endereço de recebimento da UC não estiver ativo, o Outlook continua conectado, porém com status `CONECTADO_SEM_REGRA`; não é criada uma regra ampla ou arriscada.

## Preparação de infraestrutura

1. Aplique as migrations do projeto, incluindo `20260820120000_conexoes_email_oauth.sql` e a migration de recebimento por Resend.
2. No Render, defina `OAUTH_PUBLIC_BASE_URL` com a URL HTTPS pública da API, sem barra final.
3. Gere uma vez a chave de criptografia e guarde-a em cofre de segredos. Não a troque sem migrar os tokens existentes:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Salve a saída em `OAUTH_TOKEN_ENCRYPTION_KEY` no Render. Ela precisa ter 32 bytes em Base64 ou hexadecimal.
4. Configure os dois redirect URIs abaixo nos consoles dos provedores, trocando a base pela URL da API:

   ```text
   https://SUA-API/api/oauth/email/callback/outlook
   https://SUA-API/api/oauth/email/callback/gmail
   ```

5. Crie aplicativos **web confidenciais** (não apps mobile) e preencha no Render:

   ```text
   MICROSOFT_OAUTH_CLIENT_ID
   MICROSOFT_OAUTH_CLIENT_SECRET
   GOOGLE_OAUTH_CLIENT_ID
   GOOGLE_OAUTH_CLIENT_SECRET
   ```

6. Para Outlook, conceda apenas `offline_access`, `User.Read`, `Mail.Read` e `MailboxSettings.ReadWrite`. Para Gmail, conceda somente `openid`, `email`, `profile` e `gmail.readonly`.
7. Mantenha o recebimento por Resend Inbound ativo na UC antes de conectar Outlook. É ele que fornece o destino opaco `fatura-<token>@SEU_DOMINIO`; CPF, e-mail e número da UC não entram nesse endereço.

Os aplicativos Android já têm os schemes usados no retorno:

```text
andradeenergyconsumidor://email-conectado
andradeenergygerador://email-conectado
```

Podem ser substituídos pelos ambientes `OAUTH_APP_CALLBACK_CONSUMIDOR` e `OAUTH_APP_CALLBACK_GERADOR`.

## API para os aplicativos

Todas as rotas abaixo, exceto o callback, exigem `Authorization: Bearer <sessão>`.

```text
GET    /api/conexoes-email/unidades/:unidadeId
POST   /api/conexoes-email/unidades/:unidadeId/iniciar
POST   /api/conexoes-email/concluir
DELETE /api/conexoes-email/:id
GET    /api/oauth/email/callback/:provedor
```

### Iniciar

```json
POST /api/conexoes-email/unidades/UUID/iniciar
{
  "provedor": "OUTLOOK",
  "app": "CONSUMIDOR"
}
```

Resposta:

```json
{
  "url": "https://login.microsoftonline.com/...",
  "state": "estado-opaco-de-curta-duracao",
  "expiraEm": "2026-08-20T...Z"
}
```

O aplicativo abre `url` em uma sessão de navegador, retém `state` apenas em memória e aguarda o retorno ao deep link. O backend recebe o `code` do provedor, faz a troca segura e redireciona para o app com o mesmo `state`, sem tokens na URL do app.

### Concluir

```json
POST /api/conexoes-email/concluir
{ "state": "estado-opaco-de-curta-duracao" }
```

Enquanto a pessoa está no navegador, a resposta traz `PENDENTE`. Ao voltar, ela traz `CONCLUIDO` com a conexão sem segredos. Os status que a interface deve apresentar são:

- `REGRA_ATIVA`: Outlook está encaminhando automaticamente as faturas da CEMIG para a UC.
- `CONECTADO_SEM_REGRA`: autorização Outlook válida, mas falta configurar o endereço de recebimento ou a regra não pôde ser criada.
- `LEITURA_AUTORIZADA`: Gmail autorizado para leitura; ainda não há busca programada nem regra criada pelo aplicativo.
- `ERRO` e `EXPIRADO`: reiniciar o fluxo ou revisar a configuração.

### Remover

`DELETE /api/conexoes-email/:id` apaga o refresh token cifrado do backend. No Outlook, o backend tenta remover também a regra criada. Se a remoção remota falhar, a resposta retorna um `aviso` para que a regra seja removida diretamente no Outlook; o backend não afirma que a regra foi removida quando não conseguiu confirmar isso.

## Limites e privacidade

- Esta implementação não lê ou salva mensagens inteiras durante a autorização.
- A regra Outlook é limitada a remetente contendo `cemig`, mensagem com anexo e assunto contendo `fatura`, `conta` ou `energia`.
- Não existe senha de e-mail armazenada no app ou na API.
- O refresh token fica cifrado no banco; logs e respostas HTTP não contêm tokens.
- Gmail não recebe uma regra de encaminhamento automática, deliberadamente. Isso evita contornar a confirmação que o próprio Gmail exige para encaminhamento em contas pessoais.

## Avisos Gmail — 17/11/2026

Quando o Google retorna OAUTH_REAUTORIZACAO (invalid_grant), o aviso informa “Gmail · autorização expirada ou revogada”, com ação de reconectar o Gmail no recebimento automático da unidade. Esse caso não usa o título de falha na leitura de produção. Permissão gmail.readonly ausente e API Gmail desativada recebem títulos/instruções próprios. O corpo público do push usa somente instruções fixas, sem e-mail, token ou dados da fatura; detalhes e destino da UC permanecem no app autenticado.

Diagnóstico confirmado no banco principal: conexão da usina autorizada em 03/11 e erro de autorização em 17/11; falha anterior registrada em 10/11. Intervalo de sete dias é compatível com OAuth externo em Testing, mas o modo do projeto Google Cloud ainda precisa de confirmação. O navegador desta sessão não inicializou; nenhuma configuração Google foi alterada. Não é possível renovar um refresh token rejeitado sem novo consentimento do titular. Conferir Audience / Publishing status do cliente OAuth correto, publicar a integração conforme requisitos Google e então reconectar a conta pelo app. Não ampliar escopos nem trocar a chave de criptografia para contornar invalid_grant.

O registro de push antigo da conta solicitante, sem atualização desde 28/10, foi desativado com comparação do ID e timestamp originais. Conferência posterior mostrou um único registro Gerador ativo; nenhuma notificação de teste foi enviada.

Código preparado sobre o commit 040cf686, confirmado no /health da API de produção. 16 testes de Gmail/avisos/fila passaram e tsc --noEmit passou. Publicação depende da confirmação do workspace Render solicitado ao usuário. Não alterar o commit aprovado da contingência antes de verificar o artefato implantado.

### Publicação confirmada — 17/11/2026

Workspace tea-da0inh49v7es739fb35g confirmado pelo usuário; conta andradeenergyltda@gmail.com. Serviço de produção srv-da0iso5bedkc73asecig, branch codex/render-reserva-producao-20261024, autodeploy habilitado. Push da revisão 50b91bab536589fd4342d6c1820970f71ffac2cd iniciou somente um deploy, dep-dbu6cqlg1s2s73f0ioo0, confirmado live em 17/11/2026 14:39:11 UTC. Logs confirmaram compilação, validação de Neon/PostgREST e início na porta 10000; consulta de erros desde a inicialização retornou vazia.

Após conferir o commit do deploy live e a inicialização, render_reserva_commit_validado foi atualizado no controle de produção por comparação com o commit anterior 040cf686 e revisão 4; executor RENDER e revisão preservados. Nenhum job financeiro ou protocolo foi disparado para teste. A consulta externa /health nesta rodada recebeu desafio Cloudflare HTTP 403, portanto não é registrada como HTTP 200 validado. O commit anterior foi identificado por /health antes da publicação e o novo commit foi confirmado nos metadados live do Render.

Correção publicada do aviso independe de OTA/APK. O modo OAuth Google Cloud ainda não foi inspecionado, pois o navegador não inicializou nesta sessão. A conta Gmail precisa de nova autorização pelo titular; nenhum token rejeitado foi substituído nem reativado artificialmente.
