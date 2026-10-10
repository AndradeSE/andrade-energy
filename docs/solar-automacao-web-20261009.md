# Automação da Solar na web

Código preparado e verificado localmente. Publicação no domínio real continua bloqueada pelo acesso ao projeto original do Sites. Nenhuma conta real foi alterada no desenvolvimento ou nos testes.

A Solar pode preparar e salvar, após confirmação explícita no chat:

- Nome, e-mail e telefone do próprio perfil.
- Nome, e-mail e telefone de um cliente autorizado da usina selecionada.
- Nome da usina selecionada.
- Apelido de uma UC pertencente ao consumidor conectado.

Exemplos: `altere o telefone do meu perfil para 31999999999`, `altere o email do cliente João Silva para joao@example.com`, `renomeie usina Usina antiga para Usina nova`, `renomeie UC 123 para Casa`. O nome do cadastro deve ser completo e corresponder a um único registro. Comandos incompletos ou campos fora dessa lista permanecem nos fluxos existentes.

Preparação apenas consulta. A revisão mostra alvo, campo, valor atual e novo valor. `Confirmar e salvar` executa a operação; cancelar, fechar, editar a próxima mensagem, iniciar ditado ou trocar ambiente invalidam a revisão. Confirmações expiram em cinco minutos. Cada revisão pode ser enviada uma vez, mesmo com cliques simultâneos. Uma resposta perdida não provoca reenvio automático; o usuário deve consultar o cadastro. O servidor precisa devolver o mesmo registro e confirmar o valor novo antes de a Solar informar sucesso.

A execução revalida o acesso e a identidade do registro, lê novamente o valor atual e bloqueia se ele mudou. Clientes são conferidos novamente na lista da usina. Troca de ambiente durante as consultas impede o envio. Essa verificação no cliente reduz alterações feitas com uma revisão antiga; não equivale a uma transação atômica ou bloqueio concorrente no banco. Os endpoints existentes continuam responsáveis pela autorização de empresa, titular e papel.

Atualizações de cliente/usina enviam somente o campo explicitamente solicitado. Perfil envia nome/e-mail/telefone confirmados e `tipo`, porque o endpoint exige esses campos; nenhum CPF, endereço, permissão, campo financeiro ou parâmetro de faturamento é enviado. A atualização da usina requer o backend corrigido já publicado (produção e772766 / preview cee4617). Não foi alterado o motor de faturamento.

Não são automatizados nesta etapa emissão ou exclusão de faturas, pagamentos, transferências, aceites legais, senha, permissões, contratos, conexões OAuth ou operações com anexos. Esses fluxos continuam disponíveis por navegação e seus formulários existentes. A automação descrita é da web; não foi incorporada aos APKs.

Validação: **65 testes passaram**, incluindo nove cenários novos de automação; build TypeScript/Vite/worker passou. Teste de navegador com servidor simulado confirmou zero gravações na preparação/cancelamento e uma gravação após confirmação. Evidência: `C:/Users/vini_/.codex/solar-web-automation-20261009.png`. Entrada de QA movida para `C:/Users/vini_/.codex/portal-web-qa-20261009/solar-automation/` antes do build.
