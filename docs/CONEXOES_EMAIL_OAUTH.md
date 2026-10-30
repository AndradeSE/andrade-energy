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
