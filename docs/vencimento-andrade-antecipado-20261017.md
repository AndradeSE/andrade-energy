# Revisão do vencimento Andrade — preparação para homologação

A cláusula 11 do modelo legado estabelece o mesmo vencimento da concessionária. A revisão propõe vencimento Andrade três dias corridos antes, mantendo inalterados o vencimento Cemig, desconto, vigência, fidelidade e aviso prévio de saída.

## Contratos atuais

A regra nova exige uma revisão para novo aceite. O contrato assinado continua no histórico e permanece válido enquanto a revisão é preparada. Nenhum aceite, mensagem, envio de contrato ou cobrança foi realizado nesta preparação.

A minuta revisada deve conter: “O pagamento mensal da remuneração Andrade deverá ocorrer 3 (três) dias corridos antes do vencimento da fatura de energia elétrica emitida pela concessionária, na data indicada na cobrança Andrade. O vencimento da conta da concessionária permanece inalterado. Esta regra aplica-se às cobranças emitidas após o aceite desta versão contratual e não altera cobranças já emitidas.”

## Funcionamento preparado

- O snapshot de novos contratos/revisões registra vencimento_dias_antes_concessionaria=3.
- Ausência desse campo no contrato assinado mantém o vencimento antigo.
- O faturamento consulta somente contratos efetivamente assinados da UC/empresa.
- Revisão pendente não ativa a antecipação.
- Cobrança já emitida mantém sua data em reimportação.
- Importação tardia que produziria novo vencimento no passado exige revisão, sem emissão automática com data substituta.
- Lembretes, PDF, memória e cobrança usam a data Andrade registrada; vigência e lembretes do contrato continuam separados.

## Verificação no preview

Comparar contrato legado e revisão pendente; concluir novo aceite em UC de teste; usar exemplo Cemig 20/10 e Andrade 17/10; testar viradas de mês e ano; impedir emissão antecipada já vencida. Não gerar cobrança real nem enviar e-mails de teste a clientes sem autorização específica.