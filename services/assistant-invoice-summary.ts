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

type ConsumoFatura = {
  id: string;
  consumo?: number | string | null;
  referencia?: string;
  created_at?: string;
  status?: string;
  numero_instalacao?: string;
  consumo_kwh?: number | string | null;
};

const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function competencia(fatura: ConsumoFatura) {
  const referencia = fatura.referencia?.trim().toLowerCase() ?? "";
  const iso = /^(20\d{2})-(0[1-9]|1[0-2])$/.exec(referencia);
  if (iso) return Number(iso[1]) * 100 + Number(iso[2]);
  const brasileira = /^(\d{1,2}|[a-z]{3})\/(20\d{2})$/.exec(referencia);
  if (!brasileira) return 0;
  const mes = Number(brasileira[1]) || meses.indexOf(brasileira[1]) + 1;
  return mes >= 1 && mes <= 12 ? Number(brasileira[2]) * 100 + mes : 0;
}

export function resumoUltimoConsumo(faturas: ConsumoFatura[]) {
  const recentes = new Map<string, ConsumoFatura>();
  for (const fatura of faturas) {
    if (/^(RASCUNHO|CANCELAD[AO]|EXCLUID[AO])$/i.test(fatura.status ?? "")) continue;
    const uc = fatura.numero_instalacao?.replace(/\D/g, "");
    if (!uc) continue;
    const anterior = recentes.get(uc);
    if (!anterior || competencia(fatura) > competencia(anterior) ||
      (competencia(fatura) === competencia(anterior) && (fatura.created_at ?? "") > (anterior.created_at ?? ""))) {
      recentes.set(uc, fatura);
    }
  }
  if (!recentes.size) return "Não encontrei fatura registrada para esse cliente ou UC.";
  return [...recentes].map(([uc, fatura]) => {
    const consumo = numero(fatura.consumo_kwh ?? fatura.consumo);
    const valor = consumo === "não informado" ? "consumo não informado na fatura" : consumo + " kWh";
    return "UC " + uc + " · " + (fatura.referencia ?? "referência não informada") + " · " + valor;
  }).join("\n");
}
