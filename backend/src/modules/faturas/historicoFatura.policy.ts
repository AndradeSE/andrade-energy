const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const numeroDisponivel = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
};

export function excedenteDoPeriodo(injetada: unknown, compensada: unknown) {
  const injecao = numeroDisponivel(injetada), compensacao = numeroDisponivel(compensada);
  return injecao === null || compensacao === null ? null : Math.max(0, injecao - compensacao);
}

function competencia(valor: unknown) {
  const texto = String(valor ?? "").trim().toUpperCase();
  let ano: number, mes: number;
  const iso = /^(\d{4})[-/](\d{1,2})$/.exec(texto);
  const brasileira = /^(\d{1,2})\/(\d{4})$/.exec(texto);
  const nominal = /^([A-Z]{3})\/(\d{4})$/.exec(texto);
  if (iso) { ano = Number(iso[1]); mes = Number(iso[2]); }
  else if (brasileira) { ano = Number(brasileira[2]); mes = Number(brasileira[1]); }
  else if (nominal) { ano = Number(nominal[2]); mes = meses.indexOf(nominal[1]) + 1; }
  else return null;
  if (mes < 1 || mes > 12) return null;
  return { ordem: ano * 12 + mes, label: `${meses[mes - 1]}/${String(ano).slice(-2)}` };
}

/** Uma barra por competência da mesma UC. Nenhum saldo anterior entra no excedente. */
export function prepararHistoricoFatura(faturaAtual: any, registros: any[] = []) {
  const fim = competencia(faturaAtual.referencia)?.ordem;
  const porMes = new Map<number, { mes: string; excedente: number | null; sem: number | null; com: number | null }>();
  for (const item of [faturaAtual, ...registros]) {
    if (item !== faturaAtual) {
      if (faturaAtual.empresa_id && item.empresa_id !== faturaAtual.empresa_id) continue;
      if (faturaAtual.unidade_consumidora_id && item.unidade_consumidora_id !== faturaAtual.unidade_consumidora_id) continue;
      if (!faturaAtual.unidade_consumidora_id && (!faturaAtual.numero_instalacao || String(item.numero_instalacao) !== String(faturaAtual.numero_instalacao))) continue;
      if (["RASCUNHO", "CANCELADA", "CANCELADO"].includes(String(item.status).toUpperCase())) continue;
    }
    const periodo = competencia(item.referencia);
    if (!periodo || (fim !== undefined && periodo.ordem > fim) || porMes.has(periodo.ordem)) continue;
    const andrade = numeroDisponivel(item.valor_usina ?? item.valor_andrade);
    const cemig = numeroDisponivel(item.valor_cemig);
    const com = item.fatura_somente_andrade === true
      ? (andrade === null || cemig === null ? null : andrade + cemig)
      : numeroDisponivel(item.valor_total_unificado ?? item.valor_total);
    const economia = numeroDisponivel(item.economia_real ?? item.economia);
    porMes.set(periodo.ordem, { mes: periodo.label, excedente: excedenteDoPeriodo(item.energia_injetada, item.energia_compensada), com, sem: com === null || economia === null ? null : com + economia });
  }
  return [...porMes.entries()].sort(([a], [b]) => a - b).slice(-4).map(([, valor]) => valor);
}
