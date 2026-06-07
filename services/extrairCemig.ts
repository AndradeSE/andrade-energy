export function extrairDadosCemig(
  texto: string
) {
  const referencia =
    texto.match(
      /(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/20\d{2}/i
    )?.[0] || null;

  const valorTotal =
    texto.match(
      /(?:Total a pagar|Valor a pagar)[\s\S]{0,30}?(\d+,\d{2})/i
    )?.[1] || null;

  const instalacao =
    texto.match(
      /\d{2}\.\d{3}\.\d{3}\.\d{3}-\d{2}/
    )?.[0] || null;

  const vencimento =
    texto.match(
      /\d{2}\/\d{2}\/\d{4}/
    )?.[0] || null;

  const nomeCliente =
    texto.match(
      /VINICIUS DUARTE ANDRADE/i
    )?.[0] || null;

  return {
    referencia,
    valor_total: valorTotal,
    numero_instalacao: instalacao,
    vencimento,
    nome_cliente: nomeCliente,
  };
}