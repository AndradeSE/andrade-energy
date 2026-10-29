import type { AssistantAction } from "./assistant-capabilities";
import { hasSolarMutation, isSolarHelp, normalizeSolarRequest } from "../shared/solar-language";

export type SafeNavigationContext = {
  generator: boolean; role?: string; companyRole?: string;
  plantId?: string; unitId?: string; permissions?: Record<string, unknown>;
};
export type SafeNavigation = { action?: AssistantAction; text: string };

// Somente comandos explícitos de navegação. Não aceita URL, ID, endpoint ou escrita.
export function resolveSafeNavigation(question: string, ctx: SafeNavigationContext): SafeNavigation | undefined {
  const text = normalizeSolarRequest(question);
  if (isSolarHelp(text) || hasSolarMutation(text)) return undefined;
  if (!/^(?:abra|abrir|acesse|acessar|va para|ir para|volte|voltar|mostre|mostrar|busque|buscar|procure|procurar|pesquise|pesquisar|filtre|filtrar)\b/.test(text)) return undefined;
  if (/\b(valor|quanto|saldo|total|ultima|ultimo|pdf|arquivo|documento|memoria de calculo)\b/.test(text)) return undefined;
  if (/https?:|www\.|[<>\x00-\x1f]/.test(text) || text.length > 240) return { text: "Informe o nome da função do aplicativo, sem links externos." };
  const collaborator = String(ctx.companyRole ?? "").startsWith("COLABORADOR_");
  const manager = ctx.generator && ["ADMIN", "GESTOR"].includes(String(ctx.role));
  const available = (permission?: string) => manager && (!permission || ctx.permissions?.[permission] !== false);
  const denied = { text: "Essa função não está disponível no seu acesso atual. Não alterei suas permissões." };
  const open = (label: string, route: string, params?: Record<string, string>): SafeNavigation => ({ text: `Abrindo ${label}.`, action: { label, route, params, review: false } });
  const selected = () => ctx.generator ? Boolean(ctx.plantId) : Boolean(ctx.unitId);
  const contextMissing = { text: ctx.generator ? "Selecione a usina antes de abrir essa função." : "Selecione sua UC antes de abrir essa função." };
  if(/\b(calculadora|calculo|simulacao)\b.*\beconomia\b/.test(text))return open('Calculadora de economia','/simulacao-economia');
  const search = text.match(/^(?:busque|buscar|procure|procurar|pesquise|pesquisar|mostre|mostrar|abra|abrir)\s+(?:o |a |os |as )?(?:clientes?|consumidor(?:es)?|ucs?|unidades?(?: consumidoras?)?)\s+(.+)$/)?.[1];
  const params = search && !/^(?:do |da |de |no |na |em )/.test(search) ? { solarBusca: search.slice(0, 120) } : undefined;
  if (/\b(tutoriais?|videos?)\b/.test(text)) return { text: "Os tutoriais continuam desativados por tempo indeterminado." };
  if (/\b(inicio|home|tela inicial)\b/.test(text)) return selected() ? open("Início", "/(tabs)") : contextMissing;
  if (/\b(notificacoes|avisos|alertas)\b/.test(text)) return selected() ? open("Notificações", "/(tabs)", { solarNotificacoes: "1" }) : contextMissing;
  if (/\b(solar|assistente)\b/.test(text) && /\b(configuracoes|preferencias)\b/.test(text)) return open("Configurações da Solar", "/configuracoes-assistente");
  if (/\b(sobre|versao|atualizacoes)\b/.test(text)) return open("Sobre o app", "/sobre");
  if (/\b(novo cliente|cadastro de cliente)\b/.test(text)) return available("clientes") ? open("Cadastro de cliente para preenchimento", "/clientes/novo") : denied;
  if (/\b(nova uc|nova unidade|cadastro de uc)\b/.test(text)) return available("unidades") ? open("Cadastro de UC para preenchimento", "/unidades/nova") : denied;
  if (/\b(nova usina|cadastro de usina)\b/.test(text)) return available("usinas") && !collaborator ? open("Cadastro de usina para preenchimento", "/usinas/nova") : denied;
  if (/\b(perfil|meus dados|privacidade)\b/.test(text)) return open("Perfil", "/(tabs)/perfil");
  if (/\b(comercial|geradores|empresas parceiras)\b/.test(text)) return ctx.generator && ctx.role === "ADMIN" && !collaborator ? open("Comercial", "/admin/comercial") : denied;
  if (/\b(usinas|lista de usinas)\b/.test(text)) return available("usinas") ? open("Usinas", "/selecionar-unidade") : denied;
  if (/\b(ucs?|unidades?(?: consumidoras?)?)\b/.test(text) && !/\b(contratos?|faturas?|recebimento|automatico)\b/.test(text)) return ctx.generator ? available("unidades") ? open("Unidades consumidoras", "/unidades", params) : denied : open("Suas unidades", "/selecionar-unidade");
  if (/\b(clientes?|consumidor(?:es)?)\b/.test(text) && !/\b(contratos?|faturas?)\b/.test(text)) return available("clientes") ? open("Clientes", "/(tabs)/clientes", params) : denied;
  if (/\b(contratos?|minutas?)\b/.test(text)) return ctx.generator ? available("contratos") ? open("Contratos dos clientes", "/contratos") : denied : selected() ? open("Contrato", "/(tabs)/contrato") : contextMissing;
  if (/\b(colaboradores|equipe|atividade|auditoria)\b/.test(text)) return available() && !collaborator ? open("Equipe", /\b(atividade|auditoria)\b/.test(text) ? "/colaboradores/atividade" : "/colaboradores") : denied;
  if (/\b(meu plano|minha assinatura)\b/.test(text)) return available() && !collaborator ? open("Meu plano", "/assinatura") : denied;
  if (/\b(recebimento|automatico|automatica|gmail|outlook|hotmail)\b/.test(text)) return ctx.generator && available("faturamento") ? open("Unidades para revisar o recebimento automático", "/unidades") : { text: "O recebimento automático deve ser revisado na UC correspondente. Não alterei a conexão de e-mail." };
  if (!selected()) return contextMissing;
  if (/\b(operacao|fechamentos?|rateios?)\b/.test(text)) {
    if (!available("operacao")) return denied;
    const date = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/) ?? text.match(/\b(0?[1-9]|1[0-2])\/(20\d{2})\b/);
    const period = date ? date[1].length === 4 ? `${date[1]}-${date[2]}` : `${date[2]}-${date[1].padStart(2, "0")}` : undefined;
    return open("Operação", "/(tabs)/operacao", period ? { solarCompetencia: period } : undefined);
  }
  if (/\b(producao|geracao)\b/.test(text)) return available() ? open("Produção da usina", "/(tabs)") : denied;
  if (/\b(inversores?|monitoramento)\b/.test(text)) return available() ? open("Inversores", "/usinas/inversores", { id: ctx.plantId! }) : denied;
  if (/\b(financeiro|carteira)\b/.test(text)) return available("financeiro") && !collaborator ? open("Financeiro", "/(tabs)/financeiro") : denied;
  if (/\b(economia|consumo|creditos)\b/.test(text)) return !ctx.generator ? open("Economia", "/(tabs)/economia") : { text: "Abra uma UC em Clientes para consultar o histórico individual." };
  if (/\b(contas? (?:da |de )?(?:cemig|luz|concessionaria))\b/.test(text)) return open("Contas de luz", "/contas-de-luz");
  if (/\b(faturas?|cobrancas?)\b/.test(text)) {
    if (ctx.generator && !available("faturamento")) return denied;
    const filter = /\b(vencidas?|atrasadas?|em atraso)\b/.test(text) ? "vencidas" : /\b(pagas?|quitadas?)\b/.test(text) ? "pagas" : /\b(abertas?|em aberto)\b/.test(text) ? "abertas" : "todas";
    return open("Faturas", "/(tabs)/faturas", { solarFiltro: filter, ...(ctx.generator ? { origem: "faturamento" } : {}) });
  }
  if (/\b(faturamento)\b/.test(text)) return ctx.generator ? available("faturamento") ? open("Faturamento", "/(tabs)/faturamento") : denied : open("Faturas", "/(tabs)/faturas");
  return undefined;
}
