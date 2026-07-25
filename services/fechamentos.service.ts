import {
    buscarFechamento,
    criarFechamento,
    listarFechamentos,
    obterResumoOperacao,
} from "./fechamentos.repository";

import { gerarRateio } from "./rateios.service";

export {
    buscarFechamento, listarFechamentos, obterResumoOperacao
};

export async function fecharUsina({
  usinaId,
  competencia,
  energiaGerada,
  energiaAlocada,
  receitaPrevista,
  receitaRealizada,
}: any) {

     console.log("SERVICE CHAMADO");

  console.log("INICIANDO FECHAMENTO");

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

  console.log("FECHAMENTO", fechamento);

  await gerarRateio(
    fechamento.id,
    usinaId,
    energiaGerada
  );

  return fechamento;
}