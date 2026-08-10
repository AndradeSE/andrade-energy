import {
  buscarFechamento as buscarFechamentoRepository,
  criarFechamento,
  listarFechamentos as listarFechamentosRepository,
  obterResumoOperacao as obterResumoOperacaoRepository,
} from "./fechamentos.repository";

import { gerarRateio } from "../rateio/rateio.service";

export async function listarFechamentos() {
  return await listarFechamentosRepository();
}

export async function buscarFechamento(id: string) {
  return await buscarFechamentoRepository(id);
}

export async function obterResumoOperacao() {
  return await obterResumoOperacaoRepository();
}

export async function fecharUsina({
  usinaId,
  competencia,
  energiaGerada,
  energiaAlocada,
  receitaPrevista,
  receitaRealizada,
}: any) {

  // Converte 07/2026 -> 2026-07-01
  let competenciaDate = competencia;

  if (
    typeof competencia === "string" &&
    competencia.includes("/")
  ) {
    const [mes, ano] = competencia.split("/");

    competenciaDate =
      `${ano}-${mes.padStart(2, "0")}-01`;
  }

  const energiaDisponivel =
    energiaGerada - energiaAlocada;

  const ocupacao =
    energiaGerada === 0
      ? 0
      : (energiaAlocada / energiaGerada) * 100;

  const fechamento =
    await criarFechamento({

      usina_id: usinaId,

      competencia: competenciaDate,

      energia_gerada: energiaGerada,

      energia_alocada: energiaAlocada,

      energia_disponivel: energiaDisponivel,

      receita_prevista: receitaPrevista,

      receita_realizada: receitaRealizada,

      ocupacao,

      status: "FECHADO",

    });

  await gerarRateio(
    fechamento.id,
    usinaId,
    energiaGerada
  );

  return fechamento;
}