import { simularEconomia } from "../utils/simulacao-economia";
import { consultarTarifaCemig, consultarTributosCemig } from "../utils/tarifa-cemig";
import { tarifaComTributos } from "../utils/impostos-tarifa";
import { calcularDisponibilidade, simularFaturas } from "../utils/calculadora-fatura";

type Calculation = { conta: number; energia: number; desconto: number };
export type AssistantEconomyReply = { text: string; complete: boolean };

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function numberFrom(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\s/g, "").replace(/^r\$/i, "").replace(/\.(?=\d{3}(?:\.|,|$))/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const integer = decimalIndex >= 0 ? normalized.slice(0, decimalIndex).replace(/[^\d]/g, "") : normalized.replace(/[^\d]/g, "");
  const fraction = decimalIndex >= 0 ? normalized.slice(decimalIndex + 1).replace(/[^\d]/g, "") : "";
  const parsed = Number(`${integer || "0"}${fraction ? `.${fraction}` : ""}`);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function capture(text: string, labels: RegExp[]) {
  for (const label of labels) {
    const match = text.match(label);
    const value = numberFrom(match?.[1]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function values(question: string): Partial<Calculation> {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Values are terminated by whitespace or punctuation in the spoken/text
  // command. Keeping the capture compact avoids swallowing “e desconto”.
  const amount = "(?:r\\$\\s*)?([0-9][0-9.,]*)";
  return {
    conta: capture(text, [new RegExp(`(?:valor\\s+(?:atual\\s+)?da\\s+)?(?:conta|fatura)(?:\\s+atual)?\\s*(?:e|é|de|=|:|por)?\\s*${amount}`, "i")]),
    energia: capture(text, [new RegExp(`(?:parcela\\s+(?:de\\s+)?energia(?:\\s+elegivel)?|energia(?:\\s+(?:elegivel|compensada))?|base(?:\\s+de\\s+desconto)?)\\s*(?:e|é|de|=|:|por)?\\s*${amount}`, "i")]),
    desconto: capture(text, [new RegExp(`(?:desconto(?:\\s+da\\s+proposta)?|percentual)\\s*(?:e|é|de|=|:|por)?\\s*${amount}\\s*%?`, "i")]),
  };
}

export function asksEconomyCalculation(question: string) {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(calcul\w*|simul\w*|quanto(?:\s+(?:eu|o cliente))?\s+(?:vai )?economiz\w*|estim[ae])\b/.test(text)
    && /\b(economia|desconto|conta|fatura|energia)\b/.test(text);
}

export async function calculateEconomyConversation(question: string, previous: string[] = []): Promise<AssistantEconomyReply | undefined> {
  const history = previous.slice(-6).join(" ");
  if (!asksEconomyCalculation(question) && !asksEconomyCalculation(history)) return undefined;
  const text = `${history} ${question}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matches = [...text.matchAll(/([\d.,]+)\s*kwh\b/g)];
  const consumo = numberFrom(matches.at(-1)?.[1]);
  if (!consumo) {
    const amounts = values(question);
    if (amounts.conta && amounts.energia !== undefined && amounts.desconto !== undefined) return answerEconomyCalculation(question);
    return { complete: false, text: "Qual é o consumo mensal em kWh e o desconto oferecido? Busco a tarifa e os impostos automaticamente." };
  }
  const discounts = [...text.matchAll(/(?:desconto\s*(?:de|:|=)?\s*)?([\d.,]+)\s*%/g)];
  const desconto = numberFrom(discounts.at(-1)?.[1]) ?? values(text).desconto;
  if (desconto === undefined) return {complete:false,text:"Qual é o desconto oferecido em percentual? A tarifa e os impostos serão consultados automaticamente."};
  const classe = /\brural\b|\bb2\b/.test(text) ? "B2" : /comerc|\bb3\b/.test(text) ? "B3" : "B1";
  const ligacao = /trifasic/.test(text) ? 100 : /bifasic/.test(text) ? 50 : 30;
  const gd = /gd\s*(?:2|ii)\b/.test(text) ? "GD2" : "GD1";
  const referencia = new Date().toLocaleDateString("sv-SE", {timeZone:"America/Sao_Paulo"}).slice(0,7);
  try {
    const [base, impostos] = await Promise.all([consultarTarifaCemig(classe,0),consultarTributosCemig(referencia)]);
    const t = impostos.tributos;
    if (!t || t.icmsPadrao === null) throw new Error("tributos indisponíveis");
    const tarifa = tarifaComTributos(base,t.icmsPadrao,t.pis,t.cofins);
    const r = simularFaturas({consumo,compensacao:consumo,injecao:consumo,tarifa,desconto,modalidade:"COMPENSACAO",tipoGd:gd,disponibilidade:calcularDisponibilidade(ligacao,gd,base,tarifa),fioB:gd==="GD2"?consumo*tarifa*0.13:0,iluminacao:null,repassarDisponibilidade:true,repassarFioB:true});
    return {complete:true,text:`Estimativa mensal pela calculadora Andrade\nCemig sem Andrade: ${money(r.cemigSemAndrade)}\nCemig após compensação: ${money(r.cemigComAndrade)}\nAndrade: ${money(r.andrade)}\nTotal com Andrade: ${money(r.totalComAndrade)}\nEconomia mensal: ${money(r.economia)}\nEconomia em 12 meses: ${money(r.economiaAnual)}\nTarifa com impostos: R$ ${tarifa.toLocaleString("pt-BR",{maximumFractionDigits:6})}/kWh. ICMS ${t.icmsPadrao}%, PIS ${t.pis}%, Cofins ${t.cofins}% (referência ${t.referencia}${impostos.vigente?"":", última publicada"}).\nCenário: ${consumo} kWh, desconto ${desconto}%, classe ${classe}, ligação ${ligacao} kWh, ${gd}, 100% compensado, bandeira verde. ${gd==="GD2"?"Fio B estimado em 13%. ":""}Sem iluminação pública. Dados não informados usam esse cenário explícito; posso recalcular com outra configuração.`};
  } catch {
    return {complete:false,text:"Não consegui obter a tarifa e os impostos da Cemig nesta consulta. Preservei os dados da simulação; peça para tentar novamente. Não vou considerar impostos ausentes como zero."};
  }
}

export function answerEconomyCalculation(question: string): AssistantEconomyReply | undefined {
  if (!asksEconomyCalculation(question)) return undefined;
  const parsed = values(question);
  const missing = [
    !parsed.conta && "valor atual da conta",
    parsed.energia === undefined && "parcela de energia elegível",
    parsed.desconto === undefined && "desconto da proposta",
  ].filter(Boolean) as string[];
  if (missing.length) return {
    complete: false,
    text: `Consigo calcular aqui mesmo. Para uma estimativa segura, informe ${missing.join(", ")}. Exemplo: “conta R$ 1.000, energia R$ 800 e desconto 20%”. Não vou abrir a calculadora nem criar cobrança.`,
  };
  try {
    const result = simularEconomia(parsed.conta!, parsed.energia!, parsed.desconto!);
    return {
      complete: true,
      text: `Estimativa de economia\nConta atual: ${money(result.contaAtual)}\nEnergia Andrade após desconto: ${money(result.energiaComDesconto)}\nTotal estimado com Andrade: ${money(result.totalEstimado)}\nEconomia mensal: ${money(result.economiaMensal)} (${percent(result.descontoEfetivo)}% da conta)\nEconomia em 12 meses: ${money(result.economiaAnual)}.\nÉ uma simulação: tarifas, impostos, bandeira, iluminação pública e consumo real podem mudar o resultado.`,
    };
  } catch (error) {
    return { complete: false, text: error instanceof Error ? error.message : "Não consegui calcular essa estimativa." };
  }
}
