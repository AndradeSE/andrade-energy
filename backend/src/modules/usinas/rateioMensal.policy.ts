export type DemandaRateio = { numero: string; nome?: string; consumo_medio_kwh: number; documento?: string; saldo_atual_kwh?:number; saldo_referencia?:string };

export function documentoDaTitularidade(titularidade: unknown, documentoGerador: unknown, documentoCliente: unknown, documentoDaUc: unknown) {
  const principal = ["CLIENTE","CONSUMIDOR"].includes(String(titularidade ?? "GERADOR").toUpperCase()) ? documentoCliente : documentoGerador;
  const completo=(v:unknown)=>{const d=String(v??"").replace(/\D/g,"");return [11,14].includes(d.length)&&!/^(\d)\1+$/.test(d)?d:"";};
  return completo(principal) || completo(documentoDaUc);
}

/** Proposta operacional; nunca altera percentuais contratuais ou créditos da distribuidora. */
export function proporRateioMensal(producaoMedia: number, unidades: DemandaRateio[], ancora = "") {
  if (!Number.isFinite(producaoMedia) || producaoMedia <= 0) throw new Error("Importe a produção da usina para calcular o rateio.");
  const numeroAncora = String(ancora).trim();
  if (numeroAncora && !/^\d{6,20}$/.test(numeroAncora)) throw new Error("Informe somente os dígitos da UC âncora.");
  const numeros = new Set<string>();
  const suspensas: Array<{uc:string;consumoMedio:number;saldo:number;saldoReferencia?:string}> = [];
  const linhas = unidades.flatMap(uc => {
    if (!/^\d{6,20}$/.test(uc.numero) || numeros.has(uc.numero)) throw new Error("O rateio contém UC inválida ou duplicada.");
    numeros.add(uc.numero);
    const consumo = Number(uc.consumo_medio_kwh);
    if (!Number.isFinite(consumo) || consumo <= 0) throw new Error(`Informe o consumo médio da UC ${uc.numero} antes de gerar a planilha.`);
    const saldo=Number(uc.saldo_atual_kwh ?? 0);
    if(!Number.isFinite(saldo)||saldo<0)throw new Error(`Confira o saldo da UC ${uc.numero}.`);
    const necessidade=Math.max(0,consumo-saldo);
    if(necessidade===0){suspensas.push({uc:uc.numero,consumoMedio:consumo,saldo,saldoReferencia:uc.saldo_referencia});return [];}
    return [{ uc: uc.numero, nome: uc.nome || `UC ${uc.numero}`, documento: String(uc.documento ?? "").replace(/\D/g,""), consumoMedio: consumo, saldo, saldoReferencia:uc.saldo_referencia, necessidade,
      // Quatro casas percentuais; arredondamento para baixo evita prometer energia extra.
      percentual: Math.floor(necessidade / producaoMedia * 1_000_000) / 10_000, ancora: false }];
  });
  if (numeroAncora && numeros.has(numeroAncora)) throw new Error("A UC âncora já está na lista de beneficiárias; escolha outra UC.");
  const consumoTotal = unidades.reduce((s, uc) => s + Math.max(0,Number(uc.consumo_medio_kwh)-Number(uc.saldo_atual_kwh??0)), 0);
  if (consumoTotal > producaoMedia + 0.000001) throw new Error("O consumo das UCs supera a produção média. Revise as alocações antes de gerar o rateio.");
  const usado = linhas.reduce((s, l) => s + Math.round(l.percentual * 10_000), 0);
  linhas.push({ uc: numeroAncora || "UC âncora — a definir", nome: "UC âncora", documento:"", consumoMedio: 0, saldo:0, saldoReferencia:undefined, necessidade:0,
    percentual: (1_000_000 - usado) / 10_000, ancora: true });
  return { producaoMedia, rascunho: !numeroAncora, suspensas, linhas: linhas.map(l => ({ ...l,
    energiaPrevista: Math.round(producaoMedia * l.percentual) / 100 })) };
}

export function pendenciasCsvCemig(plano: ReturnType<typeof proporRateioMensal>, geradora: string, documentoAncora: string, _numerosAtuaisConfirmados: boolean) {
  const pendencias: string[] = [];
  if (!/^\d{12,13}$/.test(geradora)) pendencias.push("Informe o número atual da UC geradora, conforme o portal Cemig; o número antigo de instalação não é aceito.");
  const numeros=plano.linhas.filter(l=>/^\d+$/.test(l.uc)).map(l=>l.uc);
  if(numeros.some(uc=>!/^\d{12,13}$/.test(uc))||new Set(numeros).size!==numeros.length)pendencias.push("Informe os números atuais das UCs, inclusive a âncora, sem números antigos de instalação nem duplicatas.");
  if (plano.rascunho) pendencias.push("Defina o número da UC âncora.");
  for (const linha of plano.linhas) {
    const documento=linha.ancora ? documentoAncora.replace(/\D/g,"") : linha.documento;
    if (!/^\d{11}$|^\d{14}$/.test(documento) || /^(\d)\1+$/.test(documento)) pendencias.push(linha.ancora ? "Informe o CPF/CNPJ completo do titular da UC âncora." : `Confira o CPF/CNPJ do titular da UC ${linha.uc}.`);
    if (linha.percentual <= 0 && linha.uc !== geradora) pendencias.push(`A UC ${linha.uc} possui cota zero; somente a UC geradora pode ter cota zero.`);
  }
  return pendencias;
}

/** Guia CEMIG fornecido em 22/10/2026: 4 colunas, sem cabeçalho, sem BOM ou linhas extras. */
export function csvCemigRateio(plano: ReturnType<typeof proporRateioMensal>, geradora: string, documentoAncora: string, numerosAtuaisConfirmados: boolean) {
  const pendencias=pendenciasCsvCemig(plano,geradora,documentoAncora,numerosAtuaisConfirmados);
  if (pendencias.length) throw new Error(pendencias.join("\n"));
  return plano.linhas.map(l=>[l.uc,l.ancora ? documentoAncora.replace(/\D/g,"") : l.documento,
    l.percentual.toFixed(4).replace(/\.?0+$/,"").replace(".",","),l.ancora?"X":""].join(";")).join("\r\n");
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
    ["UC beneficiária", "Identificação", "Consumo médio (kWh)", "Saldo registrado (kWh)", "Competência do saldo", "Necessidade (kWh)", "Rateio (%)", "Energia prevista (kWh)"],
    ...plano.linhas.map(l => [l.uc, l.nome, l.consumoMedio.toFixed(2).replace(".", ","),l.saldo.toFixed(2).replace(".",","),l.saldoReferencia||"Sem histórico; considerado zero",l.necessidade.toFixed(2).replace(".",","), l.percentual.toFixed(4).replace(".", ","), l.energiaPrevista.toFixed(2).replace(".", ",")]),
    ...plano.suspensas.map(l=>[l.uc,"Sem nova alocação: saldo cobre consumo",l.consumoMedio.toFixed(2).replace(".",","),l.saldo.toFixed(2).replace(".",","),l.saldoReferencia||"","0","0","0"]),
    ["TOTAL", "", "", "", "", "", "100,0000", plano.producaoMedia.toFixed(2).replace(".", ",")],
  ];
  return "\uFEFF" + linhas.map(l => l.map(celula).join(";")).join("\r\n");
}
