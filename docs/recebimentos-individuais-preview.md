# Recebimentos individuais — homologação, 21/10/2026

## Implementado e disponível somente no Preview
- Nova emissão e refaturamento exigem carteira ativa vinculada exatamente à usina, usuário titular ativo na mesma empresa e documento idêntico ao retornado pelo Asaas em GET /myAccount/commercialInfo/.
- Não há mais autorização financeira implícita por ser ADM. Wallet/split sem validação individual fica bloqueado.
- Nenhuma cobrança existente foi cancelada, reemitida ou teve valor/data alterados por esta revisão.
- Erros de emissão automática ficam na fatura para regularização, sem emitir cobrança na conta central de terceiro.
- Remoção de acesso ADM para contas originadas de promoção de colaborador: confirmação, papel original de colaborador, permissões operacionais desligadas, auditoria e revogação de todas as sessões na mesma transação. Próprio acesso e titular original protegidos.
- Listas de faturas priorizam pagamento confirmado da fatura sobre cobrança auxiliar pendente; UC identifica atraso pela data brasileira.

## Pendente — não habilitar recebimentos de terceiros ainda
O titular informou que ainda abrirá o CNPJ. A criação e operação de contas individuais NÃO está implementada nesta etapa. O bloqueio é preventivo; não constitui migração de recebimentos.
1. Criar CNPJ e conta principal PJ no Asaas, concluir análise cadastral e confirmar com o Asaas o enquadramento operacional (não-BaaS/BaaS e período de avaliação).
2. Implementar e homologar cadastro de subcontas, prova de titularidade e aprovação cadastral; armazenar credenciais criptografadas somente no servidor.
3. Isolar cobranças, clientes, reembolsos, consultas e webhooks pela credencial/conta do gerador, sem fallback para a conta principal; identificar a conta emissora de cada cobrança histórica.
4. Homologar falhas, idempotência, webhook autenticado e isolamento entre empresas usando Sandbox, sem movimentar dinheiro real.
5. Definir tratamento das cobranças antigas com o titular; não migrá-las ou cancelá-las automaticamente.
6. Só publicar produção após validação e autorização do titular. Mensalidades da plataforma permanecem separadas das cobranças de energia.

Fontes: https://docs.asaas.com/docs/criacao-de-subcontas e https://docs.asaas.com/reference/recuperar-dados-comerciais.
