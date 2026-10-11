# Plano sem fidelidade e desligamento da UC

Publicado somente no preview em 11/10/2026. Backend ecad4d0 confirmado pelo /health; migração aplicada exclusivamente no Supabase de homologação qqhcjieymypowunkixmk. Produção permanece sem esta publicação.

Escolha na configuração da UC: COM_FIDELIDADE ou SEM_FIDELIDADE. Cadastros existentes conservam COM_FIDELIDADE. O novo plano sugere 30% para usina GD2 e 20% para GD1; o gerador pode editar. Alterações manuais não são substituídas ao trocar de usina. Regime desconhecido não recebe percentual presumido. Contratos assinados e seus snapshots são preservados; mudança exige nova revisão e novo aceite.

O plano segue para a proposta comercial, a minuta e o resumo do consumidor. Sem fidelidade significa prazo indeterminado, ausência de multa por saída antecipada e aviso escrito de 90 dias. O contrato de referência é um termo de adesão a consórcio; não foram copiados procuração ampla, consentimento de imagem nem dados pessoais. A referência também menciona permanência mínima de 90 dias, que não foi adotada como fidelidade: o usuário escolheu aviso prévio de 90 dias.

Cancelamento: pedido → aviso para o gerador iniciar a retirada da UC do rateio/injeção → aceite do pedido → desligamento pendente → confirmação da efetivação pela distribuidora com data e protocolo → encerramento. O aceite não encerra nem libera automaticamente o contrato. O consumidor passa a ver desligamento pendente. O servidor impede concluir sem aceite anterior, confirmação explícita, data válida não futura e referência da distribuidora. Para o novo plano, respeita o aviso de 90 dias contado do pedido, no calendário brasileiro.

Nenhuma integração automática com a Cemig foi criada; a confirmação operacional é do gerador. O sistema registra quem aceitou e quem confirmou, além da data e do protocolo. O encerramento do novo plano não gera cobrança automática de todo o saldo de créditos não consumidos. A lógica dos contratos anteriores foi preservada. O motor mensal de faturamento não foi modificado.

Migração necessária antes do backend: supabase/migrations/20261011120000_plano_contrato_uc.sql. Acrescenta plano da UC e campos auditáveis do desligamento. Aplicar primeiro no preview e verificar o fluxo com conta de teste antes de publicar.

Verificação: TypeScript do app e build do backend passaram. 24 testes de contratos/propostas passaram com credenciais fictícias e consultas simuladas. PDF do novo plano renderizado e cláusulas de rescisão conferidas visualmente. Nenhuma fatura, contrato ou pedido real foi alterado para testar.

A primeira tela de carregamento tinha fundo sólido no componente Loading, que gerava um retângulo quando o contêiner externo tinha outra cor. O componente agora usa fundo transparente; a imagem da abertura continua preenchendo a própria tela. Verificação visual no aparelho ainda pendente.

Teste no S23 por ADB Wi-Fi: cliente fictício SIMULACAO Preview Teste, UC 99999101126, email example.invalid. Cadastro/importação, configuração SEM_FIDELIDADE GD II com sugestão de 30%, persistência na revisão e prazo indeterminado passaram. Nova minuta gerada e aberta no leitor Android após correção no app (f49628d). Faturamento via PDF bloqueado corretamente enquanto o contrato não está assinado; banco confirmou zero faturas nessa UC. Aceite pelo consumidor, cancelamento completo e emissão com provedor de cobrança ainda não foram executados no aparelho. Não declarar teste ponta a ponta concluído.
Gerador Preview OTA: 004183fa-507b-4955-84d1-62fef737c34d. Consumidor Preview OTA: fae549e7-3b1b-4a5e-808a-418ee3ee410a.
