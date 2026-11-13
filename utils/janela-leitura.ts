export function janelaLeitura(proximaLeitura: unknown, hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())) {
  const fim = String(proximaLeitura ?? "").slice(0, 10);
  const data = new Date(`${fim}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fim) || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== fim) {
    return { permitida: false, texto: "O período de leitura aparecerá após o recebimento da fatura da concessionária com a próxima data de leitura." };
  }
  data.setUTCDate(data.getUTCDate() - 5);
  const inicio = data.toISOString().slice(0, 10);
  const formatar = (iso: string) => iso.split("-").reverse().join("/");
  const permitida = hoje >= inicio && hoje <= fim;
  return { inicio, fim, permitida, texto: hoje > fim
    ? `O prazo de leitura terminou em ${formatar(fim)}. Sem a leitura enviada no prazo, a concessionária poderá faturar por estimativa.`
    : `Envie sua leitura entre ${formatar(inicio)} e ${formatar(fim)}.${permitida ? " O período está aberto." : " Aguarde o início do período."}` };
}

export function proximaLeituraDaUnidade(faturas: any[] | undefined, id?: string, numero?: string) {
  const digitos = (valor: unknown) => String(valor ?? "").replace(/\D/g, "");
  const fatura = faturas?.find(item => item.unidade_consumidora_id
    ? item.unidade_consumidora_id === id
    : Boolean(digitos(numero)) && digitos(item.numero_instalacao) === digitos(numero));
  // Keep the latest bill's missing date missing; never reuse an older window.
  return fatura?.proxima_leitura;
}
