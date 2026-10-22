export type DemandaRateio = { numero: string; nome?: string; consumo_medio_kwh: number };

/** Proposta operacional; nunca altera percentuais contratuais ou créditos da distribuidora. */
export function proporRateioMensal(producaoMedia: number, unidades: DemandaRateio[], ancora = "") {
  if (!Number.isFinite(producaoMedia) || producaoMedia <= 0) throw new Error("Importe a produção da usina para calcular o rateio.");
  const numeroAncora = String(ancora).trim();
  if (numeroAncora && !/^\d{6,20}$/.test(numeroAncora)) throw new Error("Informe somente os dígitos da UC âncora.");
  const numeros = new Set<string>();
  const linhas = unidades.map(uc => {
    if (!/^\d{6,20}$/.test(uc.numero) || numeros.has(uc.numero)) throw new Error("O rateio contém UC inválida ou duplicada.");
    numeros.add(uc.numero);
    const consumo = Number(uc.consumo_medio_kwh);
    if (!Number.isFinite(consumo) || consumo <= 0) throw new Error(`Informe o consumo médio da UC ${uc.numero} antes de gerar a planilha.`);
    return { uc: uc.numero, nome: uc.nome || `UC ${uc.numero}`, consumoMedio: consumo,
      // Quatro casas percentuais; arredondamento para baixo evita prometer energia extra.
      percentual: Math.floor(consumo / producaoMedia * 1_000_000) / 10_000, ancora: false };
  });
  if (numeroAncora && numeros.has(numeroAncora)) throw new Error("A UC âncora já está na lista de beneficiárias; escolha outra UC.");
  const consumoTotal = unidades.reduce((s, uc) => s + Number(uc.consumo_medio_kwh), 0);
  if (consumoTotal > producaoMedia + 0.000001) throw new Error("O consumo das UCs supera a produção média. Revise as alocações antes de gerar o rateio.");
  const usado = linhas.reduce((s, l) => s + Math.round(l.percentual * 10_000), 0);
  linhas.push({ uc: numeroAncora || "UC âncora — a definir", nome: "UC âncora", consumoMedio: 0,
    percentual: (1_000_000 - usado) / 10_000, ancora: true });
  return { producaoMedia, rascunho: !numeroAncora, linhas: linhas.map(l => ({ ...l,
    energiaPrevista: Math.round(producaoMedia * l.percentual) / 100 })) };
}

function celula(valor: unknown) {
  const texto = String(valor ?? "");
  // Protege abertura em Excel/LibreOffice contra fórmulas inseridas em nomes.
  return `"${(/^[\s]*[=+@-]/.test(texto) ? "'" : "") + texto.replace(/"/g, '""')}"`;
}

export function csvRateioMensal(plano: ReturnType<typeof proporRateioMensal>, competencia: string, geradora: string) {
  const linhas: unknown[][] = [
    [plano.rascunho ? "RASCUNHO — definir UC âncora antes de enviar à Cemig" : "PROPOSTA — sujeita à solicitação e validação pela Cemig"],
    ["Competência", competencia, "UC geradora", geradora, "Produção média (kWh)", plano.producaoMedia.toFixed(2).replace(".", ",")],
    ["UC beneficiária", "Identificação", "Consumo médio (kWh)", "Rateio (%)", "Energia prevista (kWh)"],
    ...plano.linhas.map(l => [l.uc, l.nome, l.consumoMedio.toFixed(2).replace(".", ","), l.percentual.toFixed(4).replace(".", ","), l.energiaPrevista.toFixed(2).replace(".", ",")]),
    ["TOTAL", "", "", "100,0000", plano.producaoMedia.toFixed(2).replace(".", ",")],
  ];
  return "\uFEFF" + linhas.map(l => l.map(celula).join(";")).join("\r\n");
}
