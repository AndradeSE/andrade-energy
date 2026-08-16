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
  return {
    sucesso: true,
    origem: "CONTA_ENERGIA",
    dados: { ...dados, leituraAtual, leituraAnterior, fatorMultiplicacao, energiaGerada },
    fechamento,
  };
}

export async function listarUsinasService() {
  return await listarUsinas();
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
