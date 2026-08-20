# Recebimento automático de contas de energia

Cada unidade consumidora pode receber um endereço exclusivo no formato
`fatura-<token>@receber.andradeenergy.com.br`. O cliente cria uma regra no
Gmail ou Outlook para encaminhar as contas da concessionária para esse
endereço. O sistema lê somente PDFs, confere a UC e cria uma fatura em
**rascunho** para conferência do gerador antes de abrir a cobrança.

## Configuração única do ambiente

1. No Resend, crie e verifique o subdomínio de recebimento, por exemplo
   `receber.andradeenergy.com.br`. Cadastre no DNS os registros MX mostrados
   pelo Resend.
2. Crie um webhook do evento `email.received` para:

   ```text
   https://andrade-energy-api-vda.onrender.com/api/webhooks/resend/inbound
   ```

3. No Render, preencha as variáveis do serviço:

   ```text
   RESEND_INBOUND_API_KEY=<chave do Resend com acesso a Inbound>
   RESEND_WEBHOOK_SECRET=<segredo de assinatura do webhook>
   INBOUND_EMAIL_DOMAIN=receber.andradeenergy.com.br
   INBOUND_EMAIL_MAX_BYTES=10485760
   ```

4. Aplique no Supabase a migration
   `supabase/migrations/20260820110000_recebimento_automatico_faturas.sql`.
5. Faça um novo deploy do backend e abra, no aplicativo consumidor, o menu
   **Receber contas automaticamente** para ativar o endereço da UC.

## Regras de segurança aplicadas

- O endereço não contém CPF nem número da UC.
- O webhook só é aceito com assinatura válida do Resend e corpo original.
- São aceitos apenas PDFs de até 10 MB cuja assinatura inicia com `%PDF`.
- O PDF precisa conter o mesmo número de UC que recebeu o e-mail.
- Eventos e arquivos duplicados são ignorados.
- O PDF original é armazenado no bucket privado de faturas.
- A cobrança, os créditos e a notificação só são gerados quando o gerador
  confirma a fatura em rascunho.

## Uso pelo cliente

No e-mail pessoal do cliente, a regra deve encaminhar apenas mensagens da
concessionária que tenham PDF anexado. A senha do e-mail do cliente não é
solicitada, armazenada ou compartilhada com a Andrade Energy.
