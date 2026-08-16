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

const meses: Record<string, string> = { JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06", JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12" };

function competenciaData(referencia: string) {
  const [mes, ano] = referencia.toUpperCase().split("/");
  if (!meses[mes] || !ano) throw new Error("Competência não identificada na fatura.");
  return `${ano}-${meses[mes]}-01`;
}

export async function importarFaturaGeradora(usinaId: string, caminhoArquivo: string) {
  const usina = await buscarUsina(usinaId);
  const dados = interpretarFatura(await extrairTextoPDF(caminhoArquivo));
  const numeroFatura = dados.uc.replace(/\D/g, "");
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

  const competencia = competenciaData(dados.referencia);
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
  const { data, error } = await supabase
    .from("fechamentos")
    .select("energia_gerada")
    .eq("usina_id", usinaId)
    .gte("competencia", inicio.toISOString().slice(0, 10))
    .order("competencia", { ascending: false })
    .limit(12);
  if (error) throw error;
  const producoes = (data ?? []).map((item) => Number(item.energia_gerada ?? 0)).filter(Number.isFinite);
  return producoes.length ? producoes.reduce((total, valor) => total + valor, 0) / producoes.length : 0;
}

async function recalcularAlocacaoUsina(usinaId: string) {
  const [{ data: clientes, error: erroClientes }, { data: fechamentos, error: erroFechamentos }] = await Promise.all([
    supabase.from("clientes").select("percentual_rateio,modalidade_faturamento,consumo_medio_kwh").eq("usina_id", usinaId).eq("status", "ATIVO"),
    supabase.from("fechamentos").select("id,energia_gerada").eq("usina_id", usinaId).eq("status", "ABERTO"),
  ]);
  if (erroClientes) throw erroClientes;
  if (erroFechamentos) throw erroFechamentos;
  for (const fechamento of fechamentos ?? []) {
    const gerada = Number(fechamento.energia_gerada ?? 0);
    const alocadaSolicitada = (clientes ?? []).reduce((total, cliente) => {
      if (String(cliente.modalidade_faturamento).toUpperCase() === "COMPENSACAO" && Number(cliente.consumo_medio_kwh) > 0) {
        return total + Number(cliente.consumo_medio_kwh);
      }
      return total + gerada * Number(cliente.percentual_rateio ?? 0) / 100;
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
  if (!calcularAutomaticamente && (!Number.isFinite(percentualInformado) || percentualInformado <= 0 || percentualInformado > 100)) throw new Error("Informe um percentual entre 0,01% e 100%.");
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) throw new Error("Informe um desconto entre 0% e 100%.");

  const { data: cliente, error: erroBusca } = await supabase.from("clientes").select("nome,endereco,distribuidora,usina_id").eq("id", clienteId).single();
  if (erroBusca) throw erroBusca;
  let percentual = Number.isFinite(percentualInformado) && percentualInformado > 0 ? percentualInformado : 100;
  if (calcularAutomaticamente && consumoMedio > 0) {
    const producaoMedia = await calcularProducaoMedia12Meses(usinaId);
    if (producaoMedia > 0) percentual = Math.min(100, consumoMedio / producaoMedia * 100);
  }
  const usinaAnterior = cliente.usina_id;
  const { error: erroCliente } = await supabase.from("clientes").update({ usina_id: usinaId, modalidade_faturamento: modalidade, percentual_rateio: percentual, desconto_percentual: desconto, consumo_medio_kwh: consumoMedio }).eq("id", clienteId);
  if (erroCliente) throw erroCliente;
  const { error: erroUc } = await supabase.from("unidades_consumidoras").upsert({ cliente_id: clienteId, usina_id: usinaId, numero, tipo: "BENEFICIARIA", titular: cliente.nome, endereco: cliente.endereco, distribuidora: cliente.distribuidora ?? "CEMIG", modalidade_faturamento: modalidade, desconto_percentual: desconto, status: "ATIVA" }, { onConflict: "numero" });
  if (erroUc) throw erroUc;

  const { error: erroLimpeza } = await supabase.from("participacoes_usina").delete().eq("cliente_id", clienteId);
  if (erroLimpeza && erroLimpeza.code !== "42P01") throw erroLimpeza;
  const { error: erroParticipacao } = await supabase.from("participacoes_usina").insert({ usina_id: usinaId, cliente_id: clienteId, percentual, ativo: true });
  if (erroParticipacao && erroParticipacao.code !== "42P01") throw erroParticipacao;

  if (usinaAnterior && usinaAnterior !== usinaId) await recalcularAlocacaoUsina(usinaAnterior);
  await recalcularAlocacaoUsina(usinaId);
  return { sucesso: true, usinaId, clienteId, numero, percentual, producaoMedia12Meses: await calcularProducaoMedia12Meses(usinaId) };
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
  const [dashboard, usina, clientes] = await Promise.all([
    buscarDashboardUsina(id),
    buscarUsina(id),
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("usina_id", id),
  ]);
  const fechamento = dashboard.ultimo;

  if (!fechamento) {
    const agora = new Date();
    return {
      usina,
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
