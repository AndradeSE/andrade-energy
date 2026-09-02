import {
  buscarDashboardUsina,
  buscarUsina,
  criarUsina,
  editarUsina,
  excluirUsina,
  listarUsinas,
} from "./usinas.repository";
import { supabase } from "../../config/supabase";
import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import type { FaturaExtraida } from "../../types/FaturaExtraida";

const meses: Record<string, string> = { JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06", JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12" };

function competenciaData(referencia: string) {
  const [mes, ano] = referencia.toUpperCase().split("/");
  if (!meses[mes] || !ano) throw new Error("Competência não identificada na fatura.");
  return `${ano}-${meses[mes]}-01`;
}

function calcularAlocacaoProjetada(unidades: any[], energiaGerada: number) {
  const gerada = Math.max(0, Number(energiaGerada ?? 0));
  const solicitada = (unidades ?? []).reduce((total, unidade) => {
    const percentual = Math.max(0, Math.min(100, Number(unidade.percentual_rateio ?? 0)));
    if (percentual > 0) return total + gerada * percentual / 100;

    // Cadastros antigos ou recém-importados podem ainda não ter o percentual
    // persistido. Nesse intervalo, a autonomia não pode voltar a 100%: para
    // compensação reservamos consumo médio + 15%; para injeção, toda a cota.
    const consumoMedio = Math.max(0, Number(unidade.consumo_medio_kwh ?? 0));
    const modalidade = String(unidade.modalidade_faturamento ?? "COMPENSACAO").toUpperCase();
    const reserva = modalidade === "INJECAO" ? gerada : consumoMedio * 1.15;
    return total + Math.min(gerada, reserva);
  }, 0);
  const energiaAlocada = Math.min(gerada, solicitada);
  return {
    energia_alocada: energiaAlocada,
    energia_disponivel: Math.max(0, gerada - energiaAlocada),
    ocupacao: gerada > 0 ? energiaAlocada / gerada * 100 : 0,
  };
}

async function obterAlocacaoProjetadaDaUsina(usinaId: string, energiaGerada: number, empresaId?: string) {
  let query = supabase.from("unidades_consumidoras")
    .select("percentual_rateio,modalidade_faturamento,consumo_medio_kwh")
    .eq("usina_id", usinaId)
    .eq("status", "ATIVA")
    .neq("tipo", "GERADORA");
  if (empresaId) query = query.eq("empresa_id", empresaId);
  const { data, error } = await query;
  if (error) throw error;
  return calcularAlocacaoProjetada(data ?? [], energiaGerada);
}

/**
 * Registra a produção de uma usina a partir dos dados já lidos da conta de
 * energia. Esta função é compartilhada pela importação manual e pelo
 * recebimento automático por e-mail, garantindo que ambos usem a mesma
 * validação das leituras, fator de multiplicação e competência.
 */
export async function registrarProducaoDaFaturaGeradora(usinaId: string, dados: FaturaExtraida) {
  const usina = await buscarUsina(usinaId);
  const numeroFatura = String(dados.uc ?? "").replace(/\D/g, "");
  const numeroUsina = String(usina.numero_instalacao ?? "").replace(/\D/g, "");
  if (!numeroFatura) throw new Error("Não foi possível identificar a UC na conta de energia.");
  if (!numeroUsina) throw new Error("Cadastre o número da instalação da usina antes de importar a produção.");
  if (numeroUsina && numeroFatura !== numeroUsina) throw new Error("A instalação da fatura não pertence a esta usina.");

  const medicoes = Array.isArray(dados.medicoes) ? dados.medicoes : [];
  const medicoesDeInjecao = medicoes.filter((item) => item.tipo === "INJECAO");
  const leituraAtual = Number(dados.leituraAtual);
  const leituraAnterior = Number(dados.leituraAnterior);
  const fatorMultiplicacao = Number(dados.fatorMultiplicacao ?? 1);
  const energiaGerada = medicoesDeInjecao.length
    ? medicoesDeInjecao.reduce((total, item) => total + Math.max(0, Number(item.energiaKwh ?? 0)), 0)
    : Number.isFinite(leituraAtual) && Number.isFinite(leituraAnterior) && fatorMultiplicacao > 0 && leituraAtual >= leituraAnterior
      ? (leituraAtual - leituraAnterior) * fatorMultiplicacao
      : 0;
  if (energiaGerada <= 0) throw new Error("A diferença entre as medições não apresenta produção no período.");

  const competencia = competenciaData(String(dados.referencia ?? ""));
  const { data: atual, error: buscaError } = await supabase.from("fechamentos").select("*").eq("usina_id", usinaId).eq("competencia", competencia).maybeSingle();
  if (buscaError) throw buscaError;

  const energiaAlocada = Number(atual?.energia_alocada ?? 0);
  const payload = {
    usina_id: usinaId, competencia, energia_gerada: energiaGerada,
    energia_alocada: energiaAlocada, energia_disponivel: energiaGerada - energiaAlocada,
    ocupacao: energiaGerada ? (energiaAlocada / energiaGerada) * 100 : 0,
    receita_prevista: Number(atual?.receita_prevista ?? 0), receita_realizada: Number(atual?.receita_realizada ?? 0),
    status: atual?.status ?? "ABERTO",
  };

  const consulta = atual
    ? supabase.from("fechamentos").update(payload).eq("id", atual.id)
    : supabase.from("fechamentos").insert(payload);
  const { data: fechamento, error } = await consulta.select().single();
  if (error) throw error;
  await recalcularAlocacaoUsina(usinaId);
  const { data: fechamentoAtualizado } = await supabase.from("fechamentos").select("*").eq("id", fechamento.id).single();
  return {
    sucesso: true,
    origem: "CONTA_ENERGIA",
    dados: { ...dados, leituraAtual, leituraAnterior, fatorMultiplicacao, medicoes, energiaGerada },
    fechamento: fechamentoAtualizado ?? fechamento,
  };
}

export async function importarFaturaGeradora(usinaId: string, caminhoArquivo: string) {
  const dados = interpretarFatura(await extrairTextoPDF(caminhoArquivo));
  return registrarProducaoDaFaturaGeradora(usinaId, dados);
}

export async function listarUsinasService(empresaId?: string) {
  const usinas = await listarUsinas(empresaId);
  // Normaliza a projeção atual antes de entregá-la ao app. Isso também corrige
  // cadastros antigos que foram removidos antes da regra de recálculo existir,
  // sem reescrever as competências históricas fechadas.
  await Promise.all(usinas.map((usina: any) => recalcularAlocacaoUsina(usina.id, empresaId)));
  return Promise.all(usinas.map(async (usina: any) => {
    const [dashboard, producaoMedia12Meses, unidades, tarifaGd2Recente] = await Promise.all([
      buscarDashboardUsina(usina.id, empresaId),
      calcularProducaoMedia12Meses(usina.id),
      supabase.from("unidades_consumidoras").select("id,percentual_rateio,modalidade_faturamento,consumo_medio_kwh", { count: "exact" }).eq("usina_id", usina.id).eq("status", "ATIVA").neq("tipo", "GERADORA"),
      supabase.from("faturas")
        .select("tarifa_cheia,tarifa_gd,referencia")
        .eq("usina_id", usina.id)
        .gt("tarifa_cheia", 0)
        .gt("tarifa_gd", 0)
        .order("referencia", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (unidades.error) throw unidades.error;
    if (tarifaGd2Recente.error) throw tarifaGd2Recente.error;
    const energiaDaCompetencia = Number(dashboard.ultimo?.energia_gerada ?? 0);
    const energiaProjetada = energiaDaCompetencia > 0
      ? energiaDaCompetencia
      : Math.max(0, Number(producaoMedia12Meses || usina.geracao_media || 0));
    const alocacaoProjetada = calcularAlocacaoProjetada(unidades.data ?? [], energiaProjetada);
    return {
      ...usina,
      fechamento_atual: dashboard.ultimo ?? {
        energia_gerada: energiaProjetada,
        ...alocacaoProjetada,
        status: "ABERTO",
      },
      producao_media_12_meses: producaoMedia12Meses > 0 ? producaoMedia12Meses : Number(usina.geracao_media ?? 0),
      unidades_alocadas: unidades.count ?? 0,
      tarifa_scee_referencia: Number(tarifaGd2Recente.data?.tarifa_cheia ?? 0),
      tarifa_gd2_referencia: Number(tarifaGd2Recente.data?.tarifa_gd ?? 0),
      referencia_tarifa_gd2: tarifaGd2Recente.data?.referencia ?? null,
    };
  }));
}

async function calcularProducaoMedia12Meses(usinaId: string) {
  const inicio = new Date();
  inicio.setUTCDate(1);
  inicio.setUTCHours(0, 0, 0, 0);
  inicio.setUTCMonth(inicio.getUTCMonth() - 11);
  const fechamentos = await supabase
    .from("fechamentos")
    .select("energia_gerada")
    .eq("usina_id", usinaId)
    .gte("competencia", inicio.toISOString().slice(0, 10))
    .order("competencia", { ascending: false })
    .limit(12);
  if (fechamentos.error) throw fechamentos.error;

  const producoes = (fechamentos.data ?? [])
    .map((item) => Number(item.energia_gerada ?? 0))
    .filter(Number.isFinite);
  if (producoes.length) {
    return producoes.reduce((total, valor) => total + valor, 0) / producoes.length;
  }
  const { data: usina, error: erroUsina } = await supabase
    .from("usinas")
    .select("geracao_media")
    .eq("id", usinaId)
    .maybeSingle();
  if (erroUsina) throw erroUsina;
  return Math.max(0, Number(usina?.geracao_media ?? 0));
}

/**
 * Recalcula a energia alocada, disponível e a ocupação vigente da usina.
 * Deve ser chamado sempre que uma UC for incluída, editada, movida ou
 * removida.
 */
export async function recalcularAlocacaoUsina(usinaId: string, empresaId?: string) {
  const empresa = empresaId ? String(empresaId) : null;
  let unidadesQuery = supabase
    .from("unidades_consumidoras")
    .select("percentual_rateio,modalidade_faturamento,consumo_medio_kwh")
    .eq("usina_id", usinaId)
    .eq("status", "ATIVA")
    .neq("tipo", "GERADORA");
  let fechamentosQuery = supabase
    .from("fechamentos")
    .select("id,energia_gerada,status,competencia")
    .eq("usina_id", usinaId)
    .order("competencia", { ascending: false });
  if (empresa) {
    unidadesQuery = unidadesQuery.eq("empresa_id", empresa);
    fechamentosQuery = fechamentosQuery.eq("empresa_id", empresa);
  }
  const [{ data: unidades, error: erroUnidades }, { data: fechamentos, error: erroFechamentos }] = await Promise.all([
    unidadesQuery,
    fechamentosQuery,
  ]);
  if (erroUnidades) throw erroUnidades;
  if (erroFechamentos) throw erroFechamentos;

  // A competência aberta é a projeção que muda conforme entram ou saem UCs.
  // Quando ainda não existe uma competência aberta, o último fechamento é o
  // dado exibido no card da usina; atualizá-lo evita que a autonomia mostrada
  // fique presa à alocação de um cliente/UC que já foi removido. Fechamentos
  // históricos anteriores continuam imutáveis.
  const competenciasAAtualizar = (fechamentos ?? []).filter((fechamento) => fechamento.status === "ABERTO");
  const alvos = competenciasAAtualizar.length ? competenciasAAtualizar : (fechamentos ?? []).slice(0, 1);

  for (const fechamento of alvos) {
    const gerada = Number(fechamento.energia_gerada ?? 0);
    const alocacao = calcularAlocacaoProjetada(unidades ?? [], gerada);
    const { error } = await supabase.from("fechamentos").update({
      ...alocacao,
    }).eq("id", fechamento.id);
    if (error) throw error;
  }
}

export async function sincronizarParticipacaoClienteUsina(
  usinaId: string,
  clienteId: string
) {
  const { error: erroLimpeza } = await supabase
    .from("participacoes_usina")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("usina_id", usinaId);
  if (erroLimpeza && erroLimpeza.code !== "42P01") throw erroLimpeza;

  const { data: unidades, error: erroUnidades } = await supabase
    .from("unidades_consumidoras")
    .select("percentual_rateio")
    .eq("cliente_id", clienteId)
    .eq("usina_id", usinaId)
    .eq("status", "ATIVA");
  if (erroUnidades) throw erroUnidades;

  const percentual = Math.min(
    100,
    (unidades ?? []).reduce(
      (total, unidade) => total + Number(unidade.percentual_rateio ?? 0),
      0
    )
  );
  if (percentual <= 0) return;

  const { error: erroParticipacao } = await supabase
    .from("participacoes_usina")
    .insert({ usina_id: usinaId, cliente_id: clienteId, percentual, ativo: true });
  if (erroParticipacao && erroParticipacao.code !== "42P01") throw erroParticipacao;
}

export async function alocarUnidadeNaUsina(usinaId: string, input: any) {
  const clienteId = String(input.clienteId ?? "");
  const numero = String(input.numero ?? "").replace(/\D/g, "");
  const modalidade = String(input.modalidade ?? "COMPENSACAO").toUpperCase();
  const percentualInformado = Number(input.percentual);
  const calcularAutomaticamente = Boolean(input.calcularAutomaticamente);
  const desconto = Number(input.desconto);
  const consumoMedio = Math.max(0, Number(input.consumoMedio ?? 0));
  const cpfTitular = String(input.cpfTitular ?? "").replace(/\D/g, "").slice(0, 14);
  if (!clienteId || !numero) throw new Error("Cliente e UC são obrigatórios.");
  if (!['INJECAO', 'COMPENSACAO'].includes(modalidade)) throw new Error("Modalidade inválida.");
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) throw new Error("Informe um desconto entre 0% e 100%.");

  const [{ data: cliente, error: erroBusca }, { data: unidadeAnterior, error: erroUnidadeAnterior }, { data: usina, error: erroUsina }] = await Promise.all([
    supabase
      .from("clientes")
      .select("nome,endereco,distribuidora,usina_id,uc")
      .eq("id", clienteId)
      .single(),
    supabase
      .from("unidades_consumidoras")
      .select("id,usina_id,cliente_id,endereco,cpf_titular,percentual_repasse_disponibilidade,fatura_somente_andrade,repassar_disponibilidade_gd1,repassar_disponibilidade_gd2,repassar_diferenca_fio_b_gd2,tipo_gd")
      .eq("numero", numero)
      .maybeSingle(),
    supabase
      .from("usinas")
      .select("tipo_gd")
      .eq("id", usinaId)
      .single(),
  ]);
  if (erroBusca) throw erroBusca;
  if (erroUnidadeAnterior) throw erroUnidadeAnterior;
  if (erroUsina) throw erroUsina;
  if (unidadeAnterior?.cliente_id && unidadeAnterior.cliente_id !== clienteId) {
    throw new Error("Esta UC já está vinculada a outro cliente.");
  }

  const somenteAndrade = input.faturaSomenteAndrade === undefined
    ? Boolean(unidadeAnterior?.fatura_somente_andrade)
    : Boolean(input.faturaSomenteAndrade);
  const repasseInformado = input.percentualRepasseDisponibilidade;
  const percentualRepasseDisponibilidade = Number(repasseInformado ?? unidadeAnterior?.percentual_repasse_disponibilidade ?? 100);
  if (!Number.isFinite(percentualRepasseDisponibilidade) || percentualRepasseDisponibilidade < 0 || percentualRepasseDisponibilidade > 100) {
    throw new Error("Informe um percentual de repasse da disponibilidade entre 0% e 100%.");
  }
  const repassarCustoDisponibilidadeGD2 = input.repassarCustoDisponibilidadeGD2 === undefined
    ? (unidadeAnterior?.repassar_disponibilidade_gd2 ?? percentualRepasseDisponibilidade > 0)
    : Boolean(input.repassarCustoDisponibilidadeGD2);
  const repassarCustoDisponibilidadeGD1 = input.repassarCustoDisponibilidadeGD1 === undefined
    ? (unidadeAnterior?.repassar_disponibilidade_gd1 ?? percentualRepasseDisponibilidade > 0)
    : Boolean(input.repassarCustoDisponibilidadeGD1);
  const repassarDiferencaFioBGD2 = input.repassarDiferencaFioBGD2 === undefined
    ? (unidadeAnterior?.repassar_diferenca_fio_b_gd2 ?? true)
    : Boolean(input.repassarDiferencaFioBGD2);
  // A modalidade regulatória pertence à usina. A fatura da UC e o payload do
  // app nunca podem trocar GD I por GD II (ou o inverso).
  const tipoGdDaUsina = String(usina?.tipo_gd ?? "").toUpperCase();
  const tipoGd = ["GD1", "GD2"].includes(tipoGdDaUsina)
    ? tipoGdDaUsina
    : null;

  let percentual = Number.isFinite(percentualInformado) && percentualInformado > 0
    ? percentualInformado
    : 0;
  let producaoMedia = 0;
  if (calcularAutomaticamente) {
    if (modalidade === "INJECAO") {
      percentual = 100;
    } else {
      producaoMedia = await calcularProducaoMedia12Meses(usinaId);
      percentual = producaoMedia > 0 && consumoMedio > 0
        // Mantém uma margem de 15% acima do consumo médio para a UC não
        // ficar subalocada quando houver oscilação mensal de consumo.
        ? Math.min(100, consumoMedio * 1.15 / producaoMedia * 100)
        : 0;
    }
  } else if (!Number.isFinite(percentualInformado) || percentualInformado <= 0 || percentualInformado > 100) {
    throw new Error("Informe um percentual entre 0,01% e 100%.");
  }

  const enderecoDaFatura = String(input.endereco ?? "").trim();
  const enderecoDaUc = enderecoDaFatura || unidadeAnterior?.endereco || cliente.endereco || null;
  const usinaAnterior = unidadeAnterior?.usina_id ?? null;
  const { data: unidade, error: erroUc } = await supabase
    .from("unidades_consumidoras")
    .upsert({
      cliente_id: clienteId,
      usina_id: usinaId,
      numero,
      tipo: "BENEFICIARIA",
      titular: cliente.nome,
      endereco: enderecoDaUc,
      cpf_titular: cpfTitular || unidadeAnterior?.cpf_titular || null,
      distribuidora: cliente.distribuidora ?? "CEMIG",
      modalidade_faturamento: modalidade,
      desconto_percentual: desconto,
      consumo_medio_kwh: consumoMedio,
      percentual_rateio: percentual,
      percentual_repasse_disponibilidade: percentualRepasseDisponibilidade,
      repassar_disponibilidade_gd1: repassarCustoDisponibilidadeGD1,
      repassar_disponibilidade_gd2: repassarCustoDisponibilidadeGD2,
      repassar_diferenca_fio_b_gd2: repassarDiferencaFioBGD2,
      tipo_gd: tipoGd,
      fatura_somente_andrade: somenteAndrade,
      status: "ATIVA",
    }, { onConflict: "numero" })
    .select("id")
    .single();
  if (erroUc) throw erroUc;

  const ucPrincipal = String(cliente.uc ?? "").replace(/\D/g, "") === numero;
  const atualizacaoCliente: Record<string, unknown> = {
    usina_id: cliente.usina_id ?? usinaId,
  };
  if (ucPrincipal) {
    atualizacaoCliente.modalidade_faturamento = modalidade;
    atualizacaoCliente.percentual_rateio = percentual;
    atualizacaoCliente.desconto_percentual = desconto;
    atualizacaoCliente.consumo_medio_kwh = consumoMedio;
  }
  const { error: erroCliente } = await supabase
    .from("clientes")
    .update(atualizacaoCliente)
    .eq("id", clienteId);
  if (erroCliente) throw erroCliente;

  if (usinaAnterior && usinaAnterior !== usinaId) {
    await sincronizarParticipacaoClienteUsina(usinaAnterior, clienteId);
    await recalcularAlocacaoUsina(usinaAnterior);
  }
  await sincronizarParticipacaoClienteUsina(usinaId, clienteId);
  await recalcularAlocacaoUsina(usinaId);
  return {
    sucesso: true,
    usinaId,
    clienteId,
    unidadeId: unidade.id,
    numero,
    percentual,
    producaoMedia12Meses: producaoMedia || await calcularProducaoMedia12Meses(usinaId),
  };
}

export async function buscarUsinaService(
  id: string,
  empresaId?: string,
) {
  const usina = await buscarUsina(id, empresaId);

  if (!usina) {
    throw new Error("Usina não encontrada.");
  }

  return usina;
}

export async function criarUsinaService(
  dados: any,
  empresaId?: string,
) {
  const {
    cpf_titular: cpfTitularSnake,
    cpfTitular: cpfTitularCamel,
    ...dadosUsina
  } = dados ?? {};
  const usina = await criarUsina(dadosUsina, empresaId);
  const numero = String(usina?.numero_instalacao ?? "").replace(/\D/g, "");
  if (!numero) return usina;

  const { error } = await supabase.from("unidades_consumidoras").upsert({
    empresa_id: empresaId, usina_id: usina.id, numero, tipo: "GERADORA",
    titular: usina.titular_nome ?? usina.nome ?? "Usina",
    cpf_titular: String(cpfTitularSnake ?? cpfTitularCamel ?? "").replace(/\D/g, "") || null,
    distribuidora: usina.distribuidora ?? "CEMIG", endereco: usina.endereco ?? null,
    modalidade_faturamento: "INJECAO", status: "ATIVA",
  }, { onConflict: "numero" });
  if (error) {
    await supabase.from("usinas").delete().eq("id", usina.id);
    throw error;
  }
  return usina;
}

export async function atualizarUsinaService(
  id: string,
  dados: any,
  empresaId?: string,
) {
  return await editarUsina(id, dados, empresaId);
}

export async function excluirUsinaService(
  id: string,
  empresaId?: string,
) {
  await excluirUsina(id, empresaId);

  return {
    sucesso: true,
  };
}

export async function obterDashboardUsina(
  id: string,
  empresaId?: string,
) {
  // Garante que salvar/mover/excluir uma UC seja refletido mesmo quando o app
  // consulta novamente a mesma usina sem trocar o contexto selecionado.
  await recalcularAlocacaoUsina(id, empresaId);
  const [dashboard, usina, clientes, buscaUnidadeGeradora] = await Promise.all([
    buscarDashboardUsina(id, empresaId),
    buscarUsina(id, empresaId),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("usina_id", id).eq("empresa_id", empresaId),
    supabase
      .from("unidades_consumidoras")
      .select("id, numero, tipo, recebimento_email_ativo, recebimento_email_status")
      .eq("usina_id", id)
      .eq("empresa_id", empresaId)
      .eq("tipo", "GERADORA")
      .maybeSingle(),
  ]);
  if (buscaUnidadeGeradora.error) throw buscaUnidadeGeradora.error;
  let unidadeGeradora = buscaUnidadeGeradora.data ?? null;
  const numeroInstalacao = String(usina?.numero_instalacao ?? "").replace(/\D/g, "");
  if (!unidadeGeradora && numeroInstalacao) {
    const { data, error } = await supabase.from("unidades_consumidoras").upsert({
      empresa_id: empresaId, usina_id: id, numero: numeroInstalacao, tipo: "GERADORA",
      titular: usina?.titular_nome ?? usina?.nome ?? "Usina", distribuidora: usina?.distribuidora ?? "CEMIG",
      endereco: usina?.endereco ?? null, modalidade_faturamento: "INJECAO", status: "ATIVA",
    }, { onConflict: "numero" }).select("id, numero, tipo, recebimento_email_ativo, recebimento_email_status").single();
    if (error) throw error;
    unidadeGeradora = data;
  }
  const fechamento = dashboard.ultimo;

  if (!fechamento) {
    const energiaProjetada = await calcularProducaoMedia12Meses(id);
    const alocacaoProjetada = await obterAlocacaoProjetadaDaUsina(id, energiaProjetada, empresaId);
    const agora = new Date();
    return {
      usina,
      unidadeGeradora,
      clientes: clientes.count ?? 0,
      energiaGerada: energiaProjetada,
      energiaTotal: energiaProjetada,
      energiaDisponivel: alocacaoProjetada.energia_disponivel,
      ocupacao: alocacaoProjetada.ocupacao,
      receitaPrevista: 0,
      receitaRealizada: 0,
      competencia: `${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`,
      status: "ABERTO",
    };
  }

  return {
    usina,
    unidadeGeradora,
    clientes: clientes.count ?? 0,
    energiaGerada:
      Number(fechamento.energia_gerada ?? 0),

    energiaTotal:
      Number(dashboard.energiaTotal ?? 0),

    energiaDisponivel:
      Number(fechamento.energia_disponivel ?? 0),

    ocupacao:
      Number(fechamento.ocupacao ?? 0),

    receitaPrevista:
      Number(fechamento.receita_prevista ?? 0),

    receitaRealizada:
      Number(fechamento.receita_realizada ?? 0),

    competencia:
      fechamento.competencia,

    status:
      fechamento.status,
  };
}
