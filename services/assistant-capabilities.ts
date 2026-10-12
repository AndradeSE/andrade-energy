// Registro explícito: texto do usuário nunca escolhe URL, endpoint ou ID de outra conta.
export type AssistantModule = "perfil" | "economia" | "carteira" | "equipe" | "atividade" | "operacao" | "inversores" | "recebimento" | "assinatura" | "termos" | "empresas" | "comercial" | "privacidade" | "contratos" | "conta-luz" | "calculo" | "anexos" | "proposta" | "pagamento" | "clientes" | "usinas" | "unidades" | "faturamento" | "tutoriais" | "sobre";
export type AssistantIntent = { module: AssistantModule; mode: "query" | "document" | "action"; review: boolean };
export type AssistantAction = { label: string; route: string; params?: Record<string, string>; review?: boolean };
export type AssistantDocument = { kind: "contrato" | "conta-luz" | "calculo" | "anexo" | "proposta"; id: string; label: string; clientId?: string };
export type AssistantToolReply = { text: string; actions?: AssistantAction[]; documents?: AssistantDocument[] };
export const ASSISTANT_MODULES: AssistantModule[] = ["perfil", "economia", "carteira", "equipe", "atividade", "operacao", "inversores", "recebimento", "assinatura", "termos", "empresas", "comercial", "privacidade", "contratos", "conta-luz", "calculo", "anexos", "proposta", "pagamento", "clientes", "usinas", "unidades", "faturamento", "tutoriais", "sobre"];
import { normalizeSolarRequest, hasSolarMutation, isSolarHelp } from "../shared/solar-language";
export function normalizeCapabilityText(text: string) { return normalizeSolarRequest(text); }
export function detectCapability(input: string): AssistantIntent | undefined {
  const text = normalizeCapabilityText(input);
  if (isSolarHelp(text)) return undefined;
  const wantsDocument = /\b(pdf|arquivo|documento|baixar|baixa|baixe|download|mande|manda|envie|entregue|anexo)\b/.test(text);
  const review = hasSolarMutation(text) && !(wantsDocument && !hasSolarMutation(text.replace(/\b(enviar|envie)\b/g, "")));
  const mode = review ? "action" : wantsDocument ? "document" : /^(abrir|abra|ir para|acesse|acessar)\b/.test(text) ? "action" : "query";
  let module: AssistantModule | undefined;
  if (/\b(termos|politica de privacidade|politica de cancelamento)\b/.test(text)) module = "termos";
  else if (/\b(privacidade|lgpd|dados pessoais|portabilidade)\b/.test(text)) module = "privacidade";
  else if (/\b(relatorio de calculo|memoria de calculo|calculo da fatura)\b/.test(text)) module = "calculo";
  else if (/\b(faturas anexadas|anexos|anexo do cliente)\b/.test(text)) module = "anexos";
  else if (/\b(conta de luz|conta da cemig|pdf da cemig|conta da concessionaria)\b/.test(text) || (wantsDocument && /\b(fatura|conta)\b/.test(text) && /\b(original|usada|importada)\b/.test(text))) module = "conta-luz";
  else if (/\b(proposta)\b/.test(text)) module = "proposta";
  else if (/\b(contrato|contratos|minuta|cancelamento|renovacao)\b/.test(text)) module = "contratos";
  else if (/\b(automatico|automatica|gmail|outlook|encaminhamento|recebimento)\b/.test(text)) module = "recebimento";
  else if (/\b(meu plano|minha assinatura|plano atual|limite do plano)\b/.test(text)) module = "assinatura";
  else if (/\b(comercial|planos|assinaturas|geradores)\b/.test(text)) module = "comercial";
  else if (/\b(empresa|empresas)\b/.test(text)) module = "empresas";
  else if (/\b(atividade|auditoria)\b/.test(text)) module = "atividade";
  else if (/\b(colaborador|colaboradores|equipe|convites)\b/.test(text)) module = "equipe";
  else if (/\b(inversor|inversores|monitoramento)\b/.test(text)) module = "inversores";
  else if (/\b(operacao|fechamento|fechamentos|rateio)\b/.test(text)) module = "operacao";
  else if (/\b(carteira|saldo disponivel|saldo pendente|transferencia|saque|chave pix)\b/.test(text)) module = "carteira";
  else if (/\b(pix|boleto|codigo de barras|linha digitavel|pagar)\b/.test(text)) module = "pagamento";
  else if (/\b(economia|desconto|creditos|consumo)\b/.test(text)) module = "economia";
  else if (/\b(perfil|meus dados|meu endereco|meu email|meu telefone|senha|foto de perfil)\b/.test(text)) module = "perfil";
  else if (/\b(tutorial|tutoriais|videos)\b/.test(text)) module = "tutoriais";
  else if (/\b(versao|atualizacao|sobre o app)\b/.test(text)) module = "sobre";
  else if (mode === "action" && /\b(cliente|clientes|consumidor)\b/.test(text)) module = "clientes";
  else if (mode === "action" && /\b(usina|usinas)\b/.test(text)) module = "usinas";
  else if (mode === "action" && /\b(uc|ucs|unidade|unidades)\b/.test(text)) module = "unidades";
  else if (/\b(fatura|faturas|faturamento)\b/.test(text)) module = "faturamento";
  return module ? { module, mode, review } : undefined;
}
export function safeNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value.trim())) return undefined;
  const n = Number(value); return Number.isFinite(n) ? n : undefined;
}
export function displayNumber(value: unknown, currency = false) {
  const n = safeNumber(value);
  return n === undefined ? "não informado" : new Intl.NumberFormat("pt-BR", currency ? { style: "currency", currency: "BRL" } : { maximumFractionDigits: 2 }).format(n);
}
export function onlyArray(value: unknown): any[] { if (!Array.isArray(value)) throw new Error("Resposta inválida do módulo"); return value; }
