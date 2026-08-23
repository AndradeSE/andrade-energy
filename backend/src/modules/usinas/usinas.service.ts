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

  const leituraAtual = Number(dados.leituraAtual);
  const leituraAnterior = Number(dados.leituraAnterior);
  const fatorMultiplicacao = Number(dados.fatorMultiplicacao ?? 1);
  if (!Number.isFinite(leituraAtual) || !Number.isFinite(leituraAnterior)) {
    throw new Error("Não foi possível identificar as leituras atual e anterior na conta de energia.");
  }
  if (!Number.isFinite(fatorMultiplicacao) || fatorMultiplicacao <= 0) {
    throw new Error("O fator de multiplicação informado na conta é inválido.");
  }
  if (leituraAtual < leituraAnterior) throw new Error("A leitura atual é menor que a leitura anterior.");
  const energiaGerada = (leituraAtual - leituraAnterior) * fatorMultiplicacao;
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
    dados: { ...dados, leituraAtual, leituraAnterior, fatorMultiplicacao, energiaGerada },
    fechamento: fechamentoAtualizado ?? fechamento,
  };
}

export async function importarFaturaGeradora(usinaId: string, caminhoArquivo: string) {
  const dados = interpretarFatura(await extrairTextoPDF(caminhoArquivo));
  return registrarProducaoDaFaturaGeradora(usinaId, dados);
}

export async function listarUsinasService() {
  const usinas = await listarUsinas();
  return Promise.all(usinas.map(async (usina: any) => {
    const [dashboard, producaoMedia12Meses, unidades] = await Promise.all([
      buscarDashboardUsina(usina.id),
      calcularProducaoMedia12Meses(usina.id),
      supabase.from("unidades_consumidoras").select("id", { count: "exact", head: true }).eq("usina_id", usina.id),
    ]);
    if (unidades.error) throw unidades.error;
    return {
      ...usina,
      fechamento_atual: dashboard.ultimo,
      producao_media_12_meses: producaoMedia12Meses,
      unidades_alocadas: unidades.count ?? 0,
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

  // A produção é apurada exclusivamente pelos fechamentos processados. A coluna
  // legada `geracao_media` não existe em todas as bases já migradas.
  return 0;
}

async function recalcularAlocacaoUsina(usinaId: string) {
  const [{ data: unidades, error: erroUnidades }, { data: fechamentos, error: erroFechamentos }] = await Promise.all([
    supabase
      .from("unidades_consumidoras")
      .select("percentual_rateio,modalidade_faturamento,consumo_medio_kwh")
      .eq("usina_id", usinaId)
      .eq("status", "ATIVA")
      .neq("tipo", "GERADORA"),
    supabase.from("fechamentos").select("id,energia_gerada").eq("usina_id", usinaId).eq("status", "ABERTO"),
  ]);
  if (erroUnidades) throw erroUnidades;
  if (erroFechamentos) throw erroFechamentos;

  for (const fechamento of fechamentos ?? []) {
    const gerada = Number(fechamento.energia_gerada ?? 0);
    const alocadaSolicitada = (unidades ?? []).reduce((total, unidade) => {
      const percentual = Math.max(0, Math.min(100, Number(unidade.percentual_rateio ?? 0)));
      return total + gerada * percentual / 100;
    }, 0);
    const alocada = Math.min(gerada, alocadaSolicitada);
    const { error } = await supabase.from("fechamentos").update({
      energia_alocada: alocada,
      energia_disponivel: Math.max(0, gerada - alocada),
      ocupacao: gerada > 0 ? alocada / gerada * 100 : 0,
    }).eq("id", fechamento.id);
    if (error) throw error;
  }
}

async function sincronizarParticipacaoClienteUsina(
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
  if (!clienteId || !numero) throw new Error("Cliente e UC são obrigatórios.");
  if (!['INJECAO', 'COMPENSACAO'].includes(modalidade)) throw new Error("Modalidade inválida.");
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) throw new Error("Informe um desconto entre 0% e 100%.");

  const [{ data: cliente, error: erroBusca }, { data: unidadeAnterior, error: erroUnidadeAnterior }] = await Promise.all([
    supabase
      .from("clientes")
      .select("nome,endereco,distribuidora,usina_id,uc")
      .eq("id", clienteId)
      .single(),
    supabase
      .from("unidades_consumidoras")
      .select("id,usina_id,cliente_id,endereco,percentual_repasse_disponibilidade,fatura_somente_andrade,repassar_disponibilidade_gd1,repassar_disponibilidade_gd2,repassar_diferenca_fio_b_gd2,tipo_gd")
      .eq("numero", numero)
      .maybeSingle(),
  ]);
  if (erroBusca) throw erroBusca;
  if (erroUnidadeAnterior) throw erroUnidadeAnterior;
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
  const tipoGdInformado = String(input.tipoGd ?? "").toUpperCase();
  const tipoGd = ["GD1", "GD2", "MISTA"].includes(tipoGdInformado)
    ? tipoGdInformado
    : unidadeAnterior?.tipo_gd ?? null;

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
  id: string
) {
  const usina = await buscarUsina(id);

  if (!usina) {
    throw new Error("Usina não encontrada.");
  }

  return usina;
}

export async function criarUsinaService(
  dados: any
) {
  return await criarUsina(dados);
}

export async function atualizarUsinaService(
  id: string,
  dados: any
) {
  return await editarUsina(id, dados);
}

export async function excluirUsinaService(
  id: string
) {
  await excluirUsina(id);

  return {
    sucesso: true,
  };
}

export async function obterDashboardUsina(
  id: string
) {
  const [dashboard, usina, clientes, unidadeGeradora] = await Promise.all([
    buscarDashboardUsina(id),
    buscarUsina(id),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("usina_id", id),
    supabase
      .from("unidades_consumidoras")
      .select("id, numero, tipo, recebimento_email_ativo, recebimento_email_status")
      .eq("usina_id", id)
      .eq("tipo", "GERADORA")
      .maybeSingle(),
  ]);
  if (unidadeGeradora.error) throw unidadeGeradora.error;
  const fechamento = dashboard.ultimo;

  if (!fechamento) {
    const agora = new Date();
    return {
      usina,
      unidadeGeradora: unidadeGeradora.data ?? null,
      clientes: clientes.count ?? 0,
      energiaGerada: 0,
      energiaTotal: 0,
      energiaDisponivel: 0,
      ocupacao: 0,
      receitaPrevista: 0,
      receitaRealizada: 0,
      competencia: `${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`,
      status: "ABERTO",
    };
  }

  return {
    usina,
    unidadeGeradora: unidadeGeradora.data ?? null,
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
