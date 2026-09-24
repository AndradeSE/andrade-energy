# Operação de privacidade — Andrade Energy

Este documento descreve o fluxo técnico atual. Não substitui a revisão jurídica nem a política interna aprovada pela empresa.

## Pedidos dos titulares

- O titular autenticado pode registrar pedido no Perfil (apps) ou na web. O servidor valida a sessão, aceita somente tipos pré-definidos e devolve um protocolo. Não recebe CPF, documentos nem texto livre nesse formulário.
- Os pedidos são registrados em `auditoria_seguranca` com ação `SOLICITACAO_PRIVACIDADE`, empresa, usuário, tipo e data. O próprio titular pode consultar `GET /api/privacidade/solicitacoes/minhas`; responsáveis ADMIN/GESTOR da empresa podem consultar `GET /api/privacidade/solicitacoes`.
- Cada novo pedido gera notificação aos responsáveis da empresa. O responsável deve verificar diariamente os pedidos, conferir identidade por canal seguro quando necessário, registrar a análise e responder ao titular. Não enviar cópias de faturas/contratos para endereço não confirmado.
- A confirmação do tratamento e o acesso em formato simplificado devem ser atendidos imediatamente quando viável; a declaração completa de acesso deve observar o prazo legal de até 15 dias. Outros pedidos exigem análise conforme a natureza do direito e eventual regulamentação aplicável. Registrar data de recebimento, verificação de identidade, decisão, fundamento e data de resposta; o protocolo sozinho não é atendimento concluído.
- Se a pessoa encerrou a conta, responder pelo contato previamente verificado ou por outro canal seguro. A ausência de login não pode impedir o exercício dos direitos.
- A eliminação solicitada não é automática: identificar registros que podem ser eliminados, anonimizados ou que precisam ser preservados por obrigação legal, execução contratual ou defesa de direitos. Informar a decisão e o fundamento ao titular.
- “Encerrar conta” revoga acesso e registra pedido de análise de eliminação. Não significa apagar imediatamente histórico fiscal, financeiro ou contratual.

## Controles técnicos implementados

- A política vigente é servida por `GET /api/privacidade/politica` e exibida publicamente em `/privacidade`, inclusive pelo menu do app.
- Logs de requisições não incluem query string nem identificadores de rota. Erros internos genéricos não expõem detalhes de provedores ao usuário.
- Sessões são validadas no backend; a função `criar_sessao_unica` preserva múltiplos acessos apenas para perfil ADMIN e revoga os anteriores para os demais.
- O app usa armazenamento seguro para o token de sessão. O portal web guarda sessão na aba (`sessionStorage`), não em `localStorage`.

## Pendências para aprovação do controlador

1. Nomear e divulgar o contato responsável por privacidade e confirmar que o endereço publicado recebe mensagens.
2. Aprovar inventário de dados, finalidades, bases legais e fornecedores (nuvem, pagamentos, e-mail, OCR, push e analytics, se houver), incluindo contratos com operadores e transferências internacionais.
3. Definir prazos de retenção por classe: conta/sessão, fatura e arquivo original, contrato/assinatura, cobrança e registros fiscais, logs de segurança e solicitações de privacidade. Implementar rotinas de descarte somente após essa definição.
4. Formalizar procedimento de resposta a titulares, autenticação da identidade, registro da decisão e envio seguro dos dados. O painel atual registra pedidos; a resposta ainda exige ação humana.
5. Formalizar política de segurança, gestão de acesso, backup/restauração, resposta a incidente e comunicação à ANPD/titulares quando aplicável.
6. Revisar juridicamente os textos publicados e os fluxos de cadastro, cobrança, cancelamento e assinatura. Confirmar se o tratamento de dados de clientes por geradores parceiros caracteriza papéis distintos de controlador/operador.
7. Corrigir o contato `contato@andradeenergy.com.br` ainda presente em documentos publicados: o proprietário relatou que esse endereço não funciona. Confirmar um canal monitorado antes de publicar uma nova versão da política e dos termos. A tela de cadastro deve permitir abrir os termos integrais antes do aceite; ciência da política não é consentimento genérico para todo tratamento.
8. Implementar acompanhamento de estado e resposta aos pedidos, incluindo pedidos de quem já encerrou a conta; a interface atual apenas registra e lista protocolos. O controlador deve definir responsáveis e revisar diariamente a fila até esse fluxo existir.

Não declarar “adequado à LGPD” até concluir as pendências organizacionais e revisar o sistema em produção com dados reais e contas de todos os papéis.
