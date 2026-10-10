type RecordData = Record<string, any>;
export type WebAssistantContext = { variant: "GERADOR" | "CONSUMIDOR"; plantId?: string; unit?: RecordData; clientId?: string; allowedSections?: string[]; scope?: string };
export type AccountReply = { text: string; section?: string };
export function accountIntent(question: string) {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(como|o que|explique|ajuda|tutorial|onde)\b/.test(text)) return null;
  if (/\b(criar|crie|emitir|emita|faturar|fature|enviar|envie|pagar|pague|transferir|transfira|assinar|assine|cancelar|cancele|excluir|exclua|apagar|apague|alterar|altere|ativar|ative|desativar|desative)\b/.test(text)) return "review";
  if (/notificac|avisos|push/.test(text)) return "notifications";
  if (/contas? de luz|concessionaria/.test(text)) return "bills";
  if (/fechamentos|operacao/.test(text)) return "operation";
  if (/gestao comercial|painel comercial/.test(text)) return "commercial";
  if (/geradores/.test(text)) return "generators";
  if (/minha marca/.test(text)) return "identity";
  if (/\b(privacidade|pedidos de dados)\b/.test(text)) return "privacy";
  if (/\b(meu perfil|meus dados|meu cadastro)\b/.test(text)) return "profile";
  if (/\b(recebimento|hotmail|outlook|gmail|faturamento automatico)\b/.test(text)) return "email";
  if (/\b(faturas?|cobrancas?|vencimentos?)\b/.test(text)) return "invoices";
  if (/\b(economia|consumo|creditos|energia injetada|energia compensada)\b/.test(text)) return "energy";
  if (/\b(carteira|saldo financeiro|transferencias)\b/.test(text)) return "wallet";
  if (/\b(contratos?|aceites?|assinaturas de contrato)\b/.test(text)) return "contracts";
  if (/\b(meu plano|minha assinatura)\b/.test(text)) return "subscription";
  if (/\b(empresas|ambientes)\b/.test(text)) return "companies";
  if (/\b(colaboradores|equipe)\b/.test(text)) return "team";
  if (/\b(clientes|consumidores)\b/.test(text)) return "clients";
  if (/\b(usinas|producao|geracao)\b/.test(text)) return "plants";
  if (/\b(ucs|unidades|minha uc)\b/.test(text)) return "units";
  return null;
}
const scalar = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "não informado";
const knownNumber = (value: unknown) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const money = (value: unknown) => knownNumber(value) ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "não informado";
const number = (value: unknown) => knownNumber(value) ? Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "não informado";
export async function answerAccountQuestion(question: string, context: WebAssistantContext, get: (path: string) => Promise<any>): Promise<AccountReply | null> {
  const intent = accountIntent(question);
  if (!intent) return null;
  const generator = context.variant === "GERADOR";
  const sections: Record<string, string> = { profile: "Perfil", privacy: "Perfil", companies: "Empresas", units: generator ? "Unidades consumidoras" : "Minha unidade", invoices: "Faturas", bills: "Contas de luz", energy: generator ? "Clientes" : "Economia", contracts: "Contratos", email: "Faturas", wallet: "Carteira", clients: "Clientes", team: "Colaboradores", subscription: "Meu plano", plants: "Usinas", operation: "Operação", commercial: "Gestão comercial", generators: "Geradores", identity: "Minha marca" };
  if (context.allowedSections && sections[intent] && !context.allowedSections.includes(sections[intent])) return { text: "Esse fluxo não está disponível nas permissões do seu acesso atual." };
  if (context.allowedSections && generator && ["units", "invoices", "bills", "contracts", "clients"].includes(intent) && !context.plantId) return { text: "Selecione a usina no portal antes de consultar esse fluxo." };
  const list = (payload: any): RecordData[] => Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : [];
  const describe = (rows: RecordData[], label: string, item: (row: RecordData) => string) => `${rows.length} ${label} no seu acesso.\n${rows.slice(0, 12).map(row => `• ${item(row)}`).join("\n")}${rows.length > 12 ? "\nMostrando os primeiros 12." : ""}`;
  const plantQuery = context.plantId ? `?usinaId=${encodeURIComponent(context.plantId)}` : "";
  if (intent === "review") return { text: "Abra a área correspondente, revise a UC, os dados e os valores e confirme a operação por lá. Nenhuma alteração foi realizada por mim." };
  if (intent === "notifications") return { text: describe(list(await get("/notificacoes")), "notificações", row => `${scalar(row.titulo)} · ${scalar(row.detalhe)}`) };
  if (intent === "bills") {
    if (!generator && !context.unit?.numero) return { text: "Selecione sua UC para consultar as contas de luz." };
    const scope = generator ? (context.plantId ? `&usinaId=${encodeURIComponent(context.plantId)}` : "") : `&uc=${encodeURIComponent(String(context.unit!.numero))}`;
    return { text: describe(list(await get(`/faturas?categoria=concessionaria${scope}`)), "contas de luz", row => `${scalar(row.referencia)} · ${scalar(row.status)} · ${money(row.valor_total)}`), section: "Contas de luz" };
  }
  if (intent === "profile") { const data = await get(`/auth/me?tipo=${context.variant}`); return { text: `Nome: ${scalar(data.nome)}\nPerfil: ${scalar(data.perfil)}`, section: "Perfil" }; }
  if (intent === "privacy") return { text: describe(list(await get("/privacidade/solicitacoes/minhas")), "pedidos de privacidade", row => `${scalar(row.detalhes?.tipo)} · ${scalar(row.detalhes?.status)} · protocolo ${scalar(row.id)}`), section: "Perfil" };
  if (intent === "companies") return { text: describe(list(await get("/empresas")), "empresas", row => `${scalar(row.nome)} · ${scalar(row.papel)}`), section: generator ? "Empresas" : "Perfil" };
  if (intent === "units") return { text: describe(list(await get(generator ? `/clientes/unidades${plantQuery}` : "/clientes/minhas-unidades")), "UCs", row => `${scalar(row.numero)} · ${scalar(row.modalidade_faturamento)}`), section: generator ? "Unidades consumidoras" : "Minha unidade" };
  if (intent === "invoices") {
    if (!generator && !context.unit?.numero) return { text: "Selecione sua UC no portal para consultar as faturas." };
    const query = generator ? plantQuery : `?uc=${encodeURIComponent(String(context.unit!.numero))}`;
    return { text: describe(list(await get(`/faturas${query}`)), "faturas", row => `UC ${scalar(row.uc ?? row.unidades_consumidoras?.numero)} · ${scalar(row.referencia)} · ${scalar(row.status)} · ${money(row.valor_total_unificado ?? row.valor_total)}`), section: "Faturas" };
  }
  if (intent === "energy") {
    if (generator) return { text: "Selecione um consumidor e sua UC para consultar os dados energéticos.", section: "Clientes" };
    if (!context.unit?.numero || !context.clientId) return { text: "Selecione sua UC para consultar o consumo e a economia." };
    const data = await get(`/dashboard/cliente?clienteId=${encodeURIComponent(context.clientId)}&uc=${encodeURIComponent(String(context.unit.numero))}`);
    return { text: `UC ${scalar(data.uc)} · ${scalar(data.ultimaFatura?.competencia)}\nConsumo: ${number(data.consumo)} kWh\nEnergia injetada: ${number(data.ultimaFatura?.energiaInjetada)} kWh\nEnergia compensada: ${number(data.ultimaFatura?.energiaCompensada)} kWh\nSaldo energético: ${number(data.creditos)} kWh\nEconomia do mês: ${money(data.economiaMes)}\nEconomia acumulada: ${money(data.economiaAcumulada)}`, section: "Economia" };
  }
  if (intent === "contracts") {
    if (!generator) {
      if (!context.unit?.id) return { text: "Selecione sua UC para consultar o contrato.", section: "Contratos" };
      const data = await get(`/contratos/unidade/${encodeURIComponent(String(context.unit.id))}`);
      return { text: `UC ${scalar(context.unit.numero)}\nContrato: ${scalar(data.numero)}\nStatus: ${scalar(data.status)}\nAceite: ${data.aceite_cliente_em ? scalar(data.aceite_cliente_em) : "não registrado"}\nRevisão pendente: ${data.revisao_configuracao_pendente ? "sim" : "não"}`, section: "Contratos" };
    }
    return { text: describe(list(await get(`/contratos${plantQuery}`)), "contratos", row => `${scalar(row.status)} · UC ${scalar(row.unidades_consumidoras?.numero)}${row.aceite_cliente_em ? " · aceite registrado" : ""}`), section: "Contratos" };
  }
  if (intent === "email") {
    if (!context.unit?.id) return { text: "Abra a configuração de recebimento e escolha a UC. Produção da usina e faturamento do cliente têm escopos distintos." };
    const data = await get(`/recebimento-faturas/unidades/${encodeURIComponent(String(context.unit.id))}`);
    const connections = await get(`/conexoes-email/unidades/${encodeURIComponent(String(context.unit.id))}`);
    return { text: `UC ${scalar(context.unit.numero)}\nRecebimento: ${data.ativo ? "ativado" : "desativado"}\nConfiguração: ${data.configurado ? "disponível" : "não configurada"}\n${list(connections.conexoes).map(row => `${scalar(row.provedor)}: ${scalar(row.status)} · regra ${scalar(row.regra_status)}`).join("\n") || "Nenhuma conexão encontrada."}\nNão alterei a configuração.` };
  }
  if (!generator) return { text: "Esse recurso pertence ao portal Gerador. Seu acesso continua limitado às suas UCs." };
  if (intent === "operation") return { text: describe(list(await get("/fechamentos")), "fechamentos", row => `${scalar(row.competencia)} · ${number(row.energia_gerada)} kWh · ${scalar(row.status)}`), section: "Operação" };
  if (intent === "generators") return { text: describe(list(await get("/usuarios/geradores")), "geradores", row => `${scalar(row.nome)} · ${scalar(row.status)}`), section: "Geradores" };
  if (intent === "identity") { const data = await get("/empresas/minha-identidade"); return { text: `Marca: ${scalar(data.identidade?.nome)}\nIdentidade liberada: ${data.liberada ? "sim" : "não"}`, section: "Minha marca" }; }
  if (intent === "commercial") { await get("/comercial/painel"); return { text: "Painel comercial disponível. Abra a gestão comercial para revisar empresas, planos, assinaturas e cobranças.", section: "Gestão comercial" }; }
  if (intent === "wallet") { const data = await get("/carteira"); return { text: `Saldo disponível: ${money(data.saldoDisponivel)}\nSaldo pendente: ${money(data.saldoPendente)}\nTotal recebido: ${money(data.totalRecebido)}\nNenhuma transferência foi realizada.`, section: "Carteira" }; }
  if (intent === "clients") return { text: describe(list(await get(`/clientes${plantQuery}`)), "clientes", row => `${scalar(row.nome)} · ${scalar(row.status)}`), section: "Clientes" };
  if (intent === "team") { const data = await get("/colaboradores"); return { text: describe(list(data.colaboradores), "colaboradores", row => `${scalar(row.nome)} · ${scalar(row.papel ?? row.status)}`), section: "Colaboradores" }; }
  if (intent === "subscription") { const data = await get("/comercial/minha-assinatura"); const subscription = data.assinatura; return { text: subscription ? `Plano: ${scalar(subscription.plano?.nome)}\nStatus: ${scalar(subscription.status)}\nValor contratado: ${money(subscription.valor_contratado)}\nPróximo vencimento: ${scalar(subscription.proximo_vencimento)}` : "Não encontrei uma assinatura vinculada ao seu acesso.", section: "Meu plano" }; }
  if (intent === "plants") {
    if (!context.plantId) return { text: "Selecione a usina para consultar a geração.", section: "Usinas" };
    const data = await get(`/usinas/${encodeURIComponent(context.plantId)}/dashboard`);
    return { text: `Usina selecionada\nEnergia gerada: ${number(data.energiaGerada)} kWh\nReceita prevista: ${money(data.receitaPrevista)}\nClientes: ${number(data.clientes)}`, section: "Visão geral" };
  }
  return null;
}
