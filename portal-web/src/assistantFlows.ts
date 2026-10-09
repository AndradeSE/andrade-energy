export type SolarFlow = { section: string; mode?: "create" | "manualBilling" | "email" | "notifications"; selection?: { kind: "unit" | "plant"; value: string } };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const topics: Array<[RegExp, string]> = [
  [/notificac|avisos|push/, "Notificações"],
  [/hotmail|outlook|gmail|recebimento|faturamento automatico/, "Recebimento"],
  [/contas? de luz|concessionaria/, "Contas de luz"],
  [/fatura|cobranca/, "Faturas"], [/contrato|aceite|assinatura de contrato/, "Contratos"],
  [/privacidade|perfil|meus dados|senha|seguranca/, "Perfil"],
  [/carteira|transfer|saldo financeiro/, "Carteira"], [/financeiro/, "Financeiro"],
  [/meu plano|minha assinatura|assinatura do plano/, "Meu plano"],
  [/marca|logo/, "Minha marca"], [/empresa/, "Empresas"], [/geradores/, "Geradores"],
  [/colaborador|equipe/, "Colaboradores"], [/comercial/, "Gestão comercial"],
  [/cliente|consumidor/, "Clientes"], [/usina|producao|geracao/, "Usinas"],
  [/\buc\b|\bucs\b|unidade/, "Unidades consumidoras"],
  [/economia|consumo|credito|injetada|compensada/, "Economia"],
  [/operacao|fechamento/, "Operação"], [/tutoria|ajuda/, "Tutoriais da web"],
  [/aplicativo|download/, "Aplicativos"], [/configurac/, "Configurações"],
  [/home|inicio|visao geral|painel/, "Visão geral"],
];
export function solarTopic(question: string, variant: "GERADOR" | "CONSUMIDOR") {
  let section = topics.find(([pattern]) => pattern.test(normalize(question)))?.[1];
  if (section === "Unidades consumidoras" && variant === "CONSUMIDOR") section = "Minha unidade";
  return section;
}
export function planSolarFlow(question: string, variant: "GERADOR" | "CONSUMIDOR", allowed: string[]): SolarFlow | null {
  const text = normalize(question);
  if (!/\b(abrir|abra|ir|va|mostrar|mostre|selecionar|selecione|trocar|troque|criar|crie|cadastrar|cadastre|emitir|emita|faturar|fature|enviar|envie|pagar|pague|transferir|transfira|assinar|assine|cancelar|cancele|excluir|exclua|apagar|apague|alterar|altere|ativar|ative|desativar|desative|configurar|configure|editar|edite)\b/.test(text)) return null;
  const section = solarTopic(question, variant);
  if (!section) return null;
  if (section === "Notificações") return { section, mode: "notifications" };
  if (section === "Recebimento") return allowed.includes("Faturas") ? { section, mode: "email" } : null;
  if (!allowed.includes(section)) return null;
  if (/\b(selecionar|selecione|trocar|troque)\b/.test(text)) {
    const match = text.match(/\buc\s+(\d+)\b/) ?? text.match(/\busina\s+(.+)$/);
    if (match) return { section, selection: { kind: /\buc\s+\d/.test(text) ? "unit" : "plant", value: match[1] } };
  }
  if (variant === "GERADOR" && section === "Faturas" && /manual/.test(text)) return { section, mode: "manualBilling" };
  if (variant === "GERADOR" && ["Clientes", "Usinas", "Faturas"].includes(section) && /\b(criar|crie|cadastrar|cadastre|emitir|emita|faturar|fature)\b/.test(text)) return { section, mode: "create" };
  return { section };
}
export function findSolarSelection(rows: Array<Record<string, any>>, kind: "unit" | "plant", value: string) {
  const matches = rows.filter(row => kind === "unit" ? String(row.numero) === value : normalize(String(row.nome ?? "")) === normalize(value));
  return matches.length === 1 ? String(matches[0].id ?? "") : null;
}
