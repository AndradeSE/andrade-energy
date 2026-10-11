# Plano sem fidelidade e desligamento da UC

Implementação local, ainda não publicada nem aplicada ao banco.

Escolha na configuração da UC: COM_FIDELIDADE ou SEM_FIDELIDADE. Cadastros existentes conservam COM_FIDELIDADE. O novo plano sugere 30% para usina GD2 e 20% para GD1; o gerador pode editar. Alterações manuais não são substituídas ao trocar de usina. Regime desconhecido não recebe percentual presumido. Contratos assinados e seus snapshots são preservados; mudança exige nova revisão e novo aceite.

O plano segue para a proposta comercial, a minuta e o resumo do consumidor. Sem fidelidade significa prazo indeterminado, ausência de multa por saída antecipada e aviso escrito de 90 dias. O contrato de referência é um termo de adesão a consórcio; não foram copiados procuração ampla, consentimento de imagem nem dados pessoais. A referência também menciona permanência mínima de 90 dias, que não foi adotada como fidelidade: o usuário escolheu aviso prévio de 90 dias.

Cancelamento: pedido → aviso para o gerador iniciar a retirada da UC do rateio/injeção → aceite do pedido → desligamento pendente → confirmação da efetivação pela distribuidora com data e protocolo → encerramento. O aceite não encerra nem libera automaticamente o contrato. O consumidor passa a ver desligamento pendente. O servidor impede concluir sem aceite anterior, confirmação explícita, data válida não futura e referência da distribuidora. Para o novo plano, respeita o aviso de 90 dias contado do pedido, no calendário brasileiro.

Nenhuma integração automática com a Cemig foi criada; a confirmação operacional é do gerador. O sistema registra quem aceitou e quem confirmou, além da data e do protocolo. O encerramento do novo plano não gera cobrança automática de todo o saldo de créditos não consumidos. A lógica dos contratos anteriores foi preservada. O motor mensal de faturamento não foi modificado.

Migração necessária antes do backend: supabase/migrations/20261011120000_plano_contrato_uc.sql. Acrescenta plano da UC e campos auditáveis do desligamento. Aplicar primeiro no preview e verificar o fluxo com conta de teste antes de publicar.

Verificação: TypeScript do app e build do backend passaram. 24 testes de contratos/propostas passaram com credenciais fictícias e consultas simuladas. PDF do novo plano renderizado e cláusulas de rescisão conferidas visualmente. Nenhuma fatura, contrato ou pedido real foi alterado para testar.

A primeira tela de carregamento tinha fundo sólido no componente Loading, que gerava um retângulo quando o contêiner externo tinha outra cor. O componente agora usa fundo transparente; a imagem da abertura continua preenchendo a própria tela. Verificação visual no aparelho ainda pendente.
