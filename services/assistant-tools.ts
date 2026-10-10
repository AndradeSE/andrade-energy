import type { AssistantAction, AssistantDocument, AssistantIntent, AssistantToolReply } from "./assistant-capabilities";
import { displayNumber, onlyArray, normalizeCapabilityText } from "./assistant-capabilities";
import { me, listarMeusPedidosDePrivacidade } from "./auth.service";
import { buscarDashboard } from "./dashboard.service";
import { carregarCarteira } from "./carteira.service";
import { listarColaboradores, listarAuditoriaColaboradores } from "./colaboradores.service";
import { listarFechamentos } from "./fechamentos.service";
import { buscarDashboardUsina, listarInversoresDaUsina } from "./usinas.service";
import { listarMinhasEmpresas } from "./empresas.service";
import { obterMinhaAssinatura, obterTermosAssinatura, obterPainelComercial } from "./comercial.service";
import { obterRecebimentoFaturas } from "./recebimento-faturas.service";
import { listarConexoesEmail } from "./conexoes-email.service";
import { listarFaturas, buscarFatura, obterRelatorioCalculoFatura } from "./faturas.service";
import { listarClientes, listarFaturasAnexadasCliente, listarUnidadesGestor, listarMinhasUnidades } from "./clientes.service";
import { buscarContratoDaUnidade, listarContratosDaEmpresa, baixarPropostaDaUnidade } from "./contratos.service";
import { invoiceDocumentChoices } from "./local-assistant-invoices";

export type AssistantAccountContext = { generator: boolean; plantId?: string; unitId?: string; unitNumber?: string; clientId?: string; role?: string };
const action = (label: string, route: string, params?: Record<string, string>, review = false): AssistantAction => ({ label, route, params, review });
const listText = (rows: any[], label: string, getLabel: (row: any) => string) => `Encontrei ${rows.length} ${label} no seu acesso.\n${rows.slice(0, 12).map(row => `• ${getLabel(row)}`).join("\n")}${rows.length > 12 ? "\nMostrando os primeiros 12." : ""}`;
const scalar = (value: unknown, fallback = "não informado") => typeof value === "string" || typeof value === "number" ? String(value) : fallback;

function routeFor(intent: AssistantIntent, ctx: AssistantAccountContext, question: string): AssistantAction | undefined {
  const { module, review } = intent;
  const creating = /\b(criar|cadastrar|novo|nova|adicionar)\b/.test(normalizeCapabilityText(question));
  const unit = ctx.unitId ? { id: ctx.unitId } : undefined;
  switch (module) {
    case "clientes": return action(creating ? "Cadastrar cliente" : "Revisar clientes", creating ? "/clientes/novo" : "/(tabs)/clientes", undefined, review);
    case "usinas": return action(creating ? "Cadastrar usina" : "Escolher usina", creating ? "/usinas/nova" : "/selecionar-unidade", undefined, review);
    case "unidades": return action(creating ? "Cadastrar UC" : "Revisar UCs", creating ? "/unidades/nova" : "/unidades", undefined, review);
    case "contratos": return action("Revisar contrato", ctx.generator && unit ? "/unidades/contrato" : ctx.generator ? "/contratos" : "/(tabs)/contrato", ctx.generator ? unit : undefined, review);
    case "carteira": return action("Revisar Financeiro", "/(tabs)/financeiro", undefined, review);
    case "perfil": case "privacidade": return action("Revisar perfil e segurança", "/(tabs)/perfil", undefined, review);
    case "faturamento": return action(ctx.generator ? "Revisar faturamento" : "Abrir faturas", ctx.generator ? "/(tabs)/faturamento" : "/(tabs)/faturas", undefined, review);
    case "recebimento": return ctx.unitId ? action("Gerenciar recebimento automático", "/unidades/recebimento-email", { unidadeId: ctx.unitId }, review) : undefined;
    case "assinatura": case "termos": return action("Revisar Meu plano", "/assinatura", undefined, review);
    case "comercial": return action("Abrir Comercial", "/admin/comercial", undefined, review);
    case "empresas": return action("Escolher ambiente", "/admin/escolher-area", undefined, review);
    case "equipe": return action("Revisar colaboradores", "/colaboradores", undefined, review);
    case "atividade": return action("Consultar atividades", "/colaboradores/atividade");
    case "operacao": return action("Revisar operação", "/(tabs)/operacao", undefined, review);
    case "inversores": return ctx.plantId ? action("Revisar inversores", "/usinas/inversores", { id: ctx.plantId }, review) : undefined;
    case "economia": return action("Consultar economia", "/(tabs)/economia");
    case "conta-luz": return action("Abrir contas de luz", "/contas-de-luz");
    case "pagamento": return action("Revisar faturas e pagamento", "/(tabs)/faturas", undefined, review);
    case "anexos": return ctx.clientId ? action("Revisar anexos", "/clientes/faturas-anexadas", { clienteId: ctx.clientId }, review) : action("Escolher cliente", "/(tabs)/clientes");
    case "proposta": return ctx.unitId ? action("Revisar proposta", "/unidades/contrato", unit, review) : undefined;
    case "tutoriais": return action("Abrir tutoriais", "/tutoriais");
    case "sobre": return action("Ver versão e histórico", "/sobre");
  }
}

export async function executeAssistantTool(intent: AssistantIntent, ctx: AssistantAccountContext, question: string): Promise<AssistantToolReply> {
  const generatorOnly = ["carteira", "equipe", "atividade", "operacao", "inversores", "assinatura", "termos", "comercial", "clientes", "usinas"];
  if (!ctx.generator && intent.module === "faturamento" && intent.review) return { text: "Emissão e alterações de faturamento exigem acesso de gerador autorizado. Posso consultar suas faturas." };
  if (!ctx.generator && generatorOnly.includes(intent.module)) return { text: "Essa função pertence ao gerador ou à administração e não está disponível no seu acesso. Posso consultar os dados, faturas e contrato das suas UCs." };
  if (intent.module === "comercial" && ctx.role !== "ADMIN") return { text: "Esta consulta administrativa exige acesso de administrador. Não vou ampliar suas permissões." };
  if (intent.mode === "action") {
    if (intent.module === "recebimento" && ctx.generator && /\b(usina|producao|geradora)\b/.test(normalizeCapabilityText(question))) {
      if (!ctx.plantId) return { text: "Selecione a usina para gerenciar o recebimento da conta geradora." };
      ctx = { ...ctx, unitId: (await buscarDashboardUsina(ctx.plantId)).unidadeGeradora?.id };
    }
    const target = routeFor(intent, ctx, question);
    return { text: target ? intent.review ? "Posso abrir o fluxo correto para você revisar os dados e confirmar a operação no aplicativo. Ainda não executei nenhuma alteração." : "Toque abaixo para abrir essa função." : "Selecione a UC ou usina correspondente antes de abrir essa função.", actions: target ? [target] : [] };
  }
  const target = routeFor(intent, ctx, question);
  const actions = target ? [target] : [];
  switch (intent.module) {
    case "faturamento": {
      if (ctx.generator && !ctx.plantId) return { text: "Selecione a usina para consultar as faturas." };
      if (!ctx.generator && !ctx.unitNumber) return { text: "Selecione sua UC para consultar as faturas." };
      const invoices = onlyArray(await listarFaturas(ctx.generator ? undefined : ctx.clientId, ctx.generator ? undefined : ctx.unitNumber, ctx.generator ? ctx.plantId : undefined));
      return { text: listText(invoices, "faturas", row => `${scalar(row.referencia)} · ${scalar(row.status)} · ${displayNumber(row.valor_total_unificado ?? row.valor_total, true)}`), actions };
    }
    case "perfil": {
      const profile = await me(ctx.generator ? "GERADOR" : "CONSUMIDOR");
      return { text: `Seu cadastro atual:\nNome: ${scalar(profile.nome)}\nE-mail: ${scalar(profile.email)}\nTelefone: ${scalar(profile.telefone)}\nEndereço: ${scalar(profile.endereco)}\nNão consulte nem envie senhas ou códigos no chat.`, actions };
    }
    case "economia": {
      if (ctx.generator) return { text: "A economia individual pertence à UC do consumidor. Selecione o consumidor no aplicativo para conferir seu histórico.", actions: [action("Consultar clientes", "/(tabs)/clientes")] };
      const units = onlyArray(await listarMinhasUnidades());
      const unit = units.find(item => item.id === ctx.unitId);
      if (!unit?.cliente_id) return { text: "Selecione uma das suas UCs para consultar consumo e economia." };
      const d = await buscarDashboard(unit.cliente_id, unit.numero);
      return { text: `UC ${scalar(unit.numero)}\nEconomia do mês: ${displayNumber(d.economiaMes, true)}\nEconomia acumulada: ${displayNumber(d.economiaAcumulada, true)}\nCréditos: ${displayNumber(d.creditos)} kWh\nEnergia injetada: ${displayNumber(d.ultimaFatura?.energiaInjetada)} kWh\nEnergia compensada: ${displayNumber(d.ultimaFatura?.energiaCompensada)} kWh\nCompetência: ${scalar(d.ultimaFatura?.competencia)}`, actions };
    }
    case "carteira": {
      const d = await carregarCarteira();
      return { text: `Carteira: ${scalar(d.status)}\nSaldo disponível: ${displayNumber(d.saldoDisponivel, true)}\nSaldo pendente: ${displayNumber(d.saldoPendente, true)}\nTotal recebido: ${displayNumber(d.totalRecebido, true)}\nTotal transferido: ${displayNumber(d.totalTransferido, true)}\nAsaas: ${d.asaasConectado ? "conectado" : "não conectado"}\nNão realizei transferência nem pagamento.`, actions };
    }
    case "equipe": case "atividade": {
      const payload = await (intent.module === "equipe" ? listarColaboradores() : listarAuditoriaColaboradores());
      const rows = intent.module === "equipe" ? [...onlyArray(payload.colaboradores), ...onlyArray(payload.convites)] : onlyArray(payload);
      return { text: listText(rows, intent.module === "equipe" ? "registros de equipe e convites" : "registros de atividade", row => `${scalar(row.nome ?? row.usuario_nome ?? row.usuarios?.nome, "Colaborador")} · ${scalar(row.status ?? row.acao ?? row.tipo)}`), actions };
    }
    case "operacao": {
      if (!ctx.plantId) return { text: "Selecione a usina para consultar seus fechamentos." };
      const rows = onlyArray(await listarFechamentos()).filter(row => row.usina_id === ctx.plantId);
      return { text: listText(rows, "fechamentos desta usina", row => `${scalar(row.competencia)} · ${displayNumber(row.energia_gerada)} kWh gerados · ${displayNumber(row.energia_alocada)} kWh alocados · ${scalar(row.status)}`), actions };
    }
    case "inversores": {
      if (!ctx.plantId) return { text: "Selecione a usina para consultar seus inversores." };
      const rows = onlyArray(await listarInversoresDaUsina(ctx.plantId));
      return { text: listText(rows, "inversores", row => `${scalar(row.nome ?? row.provedor ?? row.fabricante, "Inversor")} · ${scalar(row.status)}`), actions };
    }
    case "recebimento": {
      let unitId = ctx.unitId;
      if (ctx.generator && /\b(usina|producao|geradora)\b/.test(normalizeCapabilityText(question))) {
        if (!ctx.plantId) return { text: "Selecione a usina para consultar o recebimento da conta geradora." };
        unitId = (await buscarDashboardUsina(ctx.plantId)).unidadeGeradora?.id;
      }
      if (!unitId) return { text: "Selecione a UC consumidora ou a usina cuja conta geradora você quer consultar." };
      const d = await obterRecebimentoFaturas(unitId);
      const connections = await listarConexoesEmail(unitId).catch(() => undefined);
      return { text: `Recebimento automático: ${d.ativo ? "ativado" : "desativado"}\nConfiguração: ${d.configurado ? "disponível" : "não configurada"}\nStatus: ${scalar(d.status)}\nÚltimo recebimento: ${scalar(d.ultimoRecebimentoEm)}${d.erro ? `\nErro informado: ${d.erro}` : ""}\n${connections ? connections.map(c => `${c.provedor}: ${c.status}`).join("\n") || "Nenhuma conexão de e-mail encontrada." : "Não consegui confirmar as conexões de e-mail."}\nNão alterei sua configuração.`, actions: [action("Gerenciar recebimento", "/unidades/recebimento-email", { unidadeId: unitId })] };
    }
    case "assinatura": {
      const d = await obterMinhaAssinatura(); const s = d?.assinatura;
      return { text: s ? `Plano: ${scalar(s.plano?.nome)}\nSituação: ${scalar(s.status)}\nValor contratado: ${displayNumber(s.valor_contratado, true)}\nCiclo: ${scalar(s.ciclo)}\nPróximo vencimento: ${scalar(s.proximo_vencimento)}` : "Não encontrei uma assinatura vinculada ao seu acesso.", actions };
    }
    case "termos": {
      const d = await obterTermosAssinatura();
      return { text: d.documentos.length ? d.documentos.map(doc => `${doc.titulo} · versão ${doc.versao}\n${doc.conteudo}`).join("\n\n") : d.mensagem ?? "Os termos ainda não estão disponíveis. Nenhum aceite foi registrado.", actions };
    }
    case "empresas": {
      const rows = onlyArray(await listarMinhasEmpresas());
      return { text: listText(rows, "ambientes autorizados", row => `${scalar(row.nome)} · ${scalar(row.papel)}`), actions };
    }
    case "comercial": {
      const d = await obterPainelComercial();
      return { text: `Geradores: ${displayNumber(d.resumo.total)}\nAtivos: ${displayNumber(d.resumo.ativas)}\nInadimplentes: ${displayNumber(d.resumo.inadimplentes)}\nReceita mensal prevista: ${displayNumber(d.resumo.receitaMensalPrevista, true)}\nPlanos disponíveis: ${d.planos.length}\nAssinaturas: ${d.assinaturas.length}`, actions };
    }
    case "privacidade": {
      const rows = onlyArray(await listarMeusPedidosDePrivacidade());
      return { text: listText(rows, "pedidos de privacidade", row => `${scalar(row.detalhes?.tipo)} · ${scalar(row.detalhes?.status)} · ${scalar(row.criado_em)}`), actions };
    }
    case "contratos": case "proposta": {
      if (ctx.generator && !ctx.plantId) return { text: "Selecione uma usina para consultar contratos e propostas." };
      const units = ctx.generator ? onlyArray(await listarUnidadesGestor(ctx.plantId)) : onlyArray(await listarMinhasUnidades());
      const selected = ctx.unitId ? units.filter(u => u.id === ctx.unitId) : units;
      if (intent.module === "proposta") return { text: "Escolha a UC para abrir a proposta disponível. Isso não envia convite nem registra aceite.", documents: selected.slice(0, 12).map(u => ({ kind: "proposta", id: u.id, label: `Proposta · UC ${scalar(u.numero)}` })) };
      if (ctx.generator && intent.mode !== "document") {
        const contracts = onlyArray(await listarContratosDaEmpresa(ctx.plantId));
        return { text: listText(contracts, "contratos", c => `${scalar(c.clientes?.nome, "Cliente")} · ${scalar(c.numero, "sem número")} · ${scalar(c.status)}`), actions };
      }
      const documents: AssistantDocument[] = [];
      const statuses: string[] = [];
      if (selected.length > 1 && intent.mode === "document") return { text: "Escolha a UC para consultar e abrir o contrato mais recente. Verificarei a disponibilidade do PDF ao abrir.", documents: selected.slice(0, 12).map(u => ({ kind: "contrato", id: u.id, label: `Consultar contrato · UC ${scalar(u.numero)}` })), actions };
      for (const u of selected.slice(0, 1)) {
        const c = await buscarContratoDaUnidade(u.id);
        if (!c) continue;
        statuses.push(`UC ${scalar(u.numero)} · ${scalar(c.status)}`);
        if (c.contrato_assinado_url || c.contrato_gerado_url || c.arquivo_pdf) documents.push({ kind: "contrato", id: u.id, label: `Contrato · UC ${scalar(u.numero)}` });
      }
      return { text: statuses.length ? `Contratos consultados:\n${statuses.join("\n")}\n${documents.length ? "Toque no documento para abrir ou salvar. Nenhum aceite foi registrado." : "Os PDFs ainda não estão disponíveis."}` : "Não encontrei contrato disponível para as UCs deste contexto.", documents, actions };
    }
    case "anexos": {
      if (!ctx.clientId) {
        if (!ctx.generator || !ctx.plantId) return { text: "Selecione um cliente ou UC para consultar os anexos." };
        const rows = onlyArray(await listarClientes(ctx.plantId));
        return { text: "Escolha o cliente para consultar suas faturas anexadas.", actions: rows.slice(0, 12).map(row => action(scalar(row.nome, "Cliente"), "/clientes/faturas-anexadas", { clienteId: row.id })) };
      }
      const rows = await listarFaturasAnexadasCliente(ctx.clientId);
      return { text: `Encontrei ${rows.length} anexos neste cliente.`, documents: rows.filter(row => row.url).slice(0, 12).map(row => ({ kind: "anexo", id: row.id, clientId: ctx.clientId, label: row.nome || "Fatura anexada" })), actions };
    }
    case "conta-luz": case "calculo": case "pagamento": {
      if (ctx.generator && !ctx.plantId) return { text: "Selecione uma usina para consultar as faturas corretas." };
      if (!ctx.generator && !ctx.unitNumber && !ctx.clientId) return { text: "Selecione sua UC para consultar a fatura." };
      const rows = await listarFaturas(ctx.generator ? undefined : ctx.clientId, ctx.generator ? undefined : ctx.unitNumber, ctx.generator ? ctx.plantId : undefined);
      const chosen = invoiceDocumentChoices(question, rows);
      if (intent.module === "pagamento") return { text: chosen.length ? "Escolha a fatura para consultar Pix, boleto e beneficiário. Não realizei pagamento." : "Não encontrei fatura emitida para esse pedido.", actions: chosen.map(f => action(`Pagamento · ${scalar(f.referencia)}`, `/faturas/${f.id}`)) };
      const docs = intent.module === "conta-luz" ? chosen.filter(f => f.pdf_cemig_url) : chosen;
      return { text: docs.length ? "Toque no documento para abrir ou salvar." : "Não encontrei esse documento disponível para o período pedido.", documents: docs.map(f => ({ kind: intent.module === "conta-luz" ? "conta-luz" : "calculo", id: f.id, label: `${intent.module === "conta-luz" ? "Conta de luz" : "Cálculo"} · ${scalar(f.referencia)}` })) };
    }
    default: return { text: "Você pode abrir esta função diretamente abaixo.", actions };
  }
}

export async function resolveAssistantDocument(doc: AssistantDocument): Promise<{ url?: string; file?: string }> {
  if (doc.kind === "contrato") {
    const c = await buscarContratoDaUnidade(doc.id);
    return { url: c?.contrato_assinado_url || c?.contrato_gerado_url || c?.arquivo_pdf };
  }
  if (doc.kind === "proposta") return { file: await baixarPropostaDaUnidade(doc.id) };
  if (doc.kind === "calculo") return { url: await obterRelatorioCalculoFatura(doc.id) };
  if (doc.kind === "conta-luz") return { url: (await buscarFatura(doc.id))?.pdf_cemig_url };
  if (!doc.clientId) throw new Error("Cliente não selecionado");
  const rows = await listarFaturasAnexadasCliente(doc.clientId);
  return { url: rows.find(row => row.id === doc.id)?.url };
}
