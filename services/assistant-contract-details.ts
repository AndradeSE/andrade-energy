import { hasSolarMutation, isSolarHelp, normalizeSolarRequest } from "../shared/solar-language";

export function asksContractDetails(question: string) {
  const text = normalizeSolarRequest(question);
  return !hasSolarMutation(text) && !isSolarHelp(text) &&
    !/\b(abra|abrir|pdf|arquivo|documento|baixar|clausula|texto)\b/.test(text) &&
    /\b(contrato|fidelidade|vigencia|plano da (?:uc|unidade))\b/.test(text) &&
    /\b(plano|fidelidade|vigencia|vence|vencimento|inicio|fim|desconto|numero|status|situacao)\b/.test(text);
}

export function contractDetailsReply(contract: any, unitNumber: string) {
  const plan = contract.configuracao_uc_snapshot?.plano_contrato ?? contract.dados_documento?.plano_contrato;
  const number = Number(contract.desconto);
  const discount = contract.desconto !== null && contract.desconto !== undefined && contract.desconto !== "" && Number.isFinite(number)
    ? number.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + "%" : "não informado";
  const date = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0,10).split("-").reverse().join("/") : "não informada";
  const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : "não informado";
  return `Contrato da UC ${unitNumber}\nNúmero: ${text(contract.numero)}\nSituação: ${text(contract.status)}\nPlano: ${plan === "SEM_FIDELIDADE" ? "Sem fidelidade" : plan === "COM_FIDELIDADE" ? "Com fidelidade" : "não informado"}\nDesconto contratado: ${discount}\nInício da vigência: ${date(contract.vigencia_inicio)}\nFim da vigência: ${plan === "SEM_FIDELIDADE" ? "Indeterminado" : date(contract.vigencia_fim)}\nFonte: contrato vinculado à UC. Nenhum aceite ou alteração foi realizado.`;
}
