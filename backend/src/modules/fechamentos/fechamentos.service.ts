import {
  buscarFechamento,
  criarFechamento,
  listarFechamentos,
  obterResumoOperacao,
} from "./fechamentos.repository";

import { gerarRateio } from "../rateio/rateio.service";

export {
  buscarFechamento, criarFechamento, listarFechamentos,
  obterResumoOperacao
};

export async function fecharUsina({
  usinaId,
  competencia,
  energiaGerada,
  energiaAlocada,
  receitaPrevista,
  receitaRealizada,
}: any) {

  const energiaDisponivel =
    energiaGerada - energiaAlocada;

  const ocupacao =
    energiaGerada === 0
      ? 0
      : (energiaAlocada / energiaGerada) * 100;

  const fechamento =
    await criarFechamento({

      usina_id: usinaId,

      competencia,

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