const numero = (valor: unknown, moeda = false) => valor === null || valor === undefined || valor === "" || !Number.isFinite(Number(valor))
  ? "não informado"
  : Number(valor).toLocaleString("pt-BR", moeda ? { style: "currency", currency: "BRL" } : { maximumFractionDigits: 8 });

/** Reads only parsed invoice fields already authorized by the account API. */
export function resumoContaConcessionaria(fatura: any) {
  const cliente = fatura.clientes?.nome;
  return [
    `Conta da concessionária - UC ${fatura.numero_instalacao ?? "não informada"}, referência ${fatura.referencia ?? "não informada"}.`,
    cliente ? `Cliente cadastrado: ${cliente}.` : "",
    `Consumo: ${numero(fatura.consumo_kwh ?? fatura.consumo)} kWh.`,
    `Energia compensada: ${numero(fatura.energia_compensada)} kWh.`,
    `Parcela da concessionária: ${numero(fatura.valor_cemig, true)}.`,
    `Vencimento: ${String(fatura.vencimento ?? "não informado").slice(0, 10)}.`,
    fatura.proxima_leitura ? `Próxima leitura: ${String(fatura.proxima_leitura).slice(0, 10)}.` : "",
    fatura.fatura_somente_andrade === true ? "A conta da concessionária é paga separadamente." : "Fatura unificada: pague somente a fatura Andrade Energy; a conta CEMIG é demonstrativa.",
    "Esses são os dados registrados no aplicativo após a leitura da fatura.",
  ].filter(Boolean).join("\n");
}
