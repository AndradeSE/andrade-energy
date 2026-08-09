import { buscarClientePorUC } from "../clientes/clientes.repository";
import { criarCobranca } from "../cobrancas/cobrancas.repository";
import { consumirCreditos, registrarCreditosDaFatura, } from "../creditos/consumo.service";
import { buscarUsina } from "../usinas/usinas.repository";
import {
  buscarFatura,
  inserirFatura,
} from "./faturas.repository";

import { FaturaExtraida } from "../../types/FaturaExtraida";

function converterDataBrasileiraParaIso(data: string): string {
  const correspondencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data.trim());

  if (!correspondencia) {
    throw new Error("Vencimento da fatura inv\u00e1lido.");
  }

  const [, dia, mes, ano] = correspondencia;
  return `${ano}-${mes}-${dia}`;
}

export async function processarFatura(
  dados: FaturaExtraida
) {

  const vencimento = converterDataBrasileiraParaIso(dados.vencimento);

  const cliente = await buscarClientePorUC(dados.uc);

  if (!cliente) {

  return {

    clienteNaoEncontrado: true,

    dadosCadastro: {

      nome: dados.cliente,

      uc: dados.uc,

      distribuidora: dados.distribuidora,

    },

  };

}
const faturaExistente = await buscarFatura(
  dados.uc,
  dados.referencia
);

if (faturaExistente) {

  return {

    jaProcessada: true,

    mensagem: "Esta fatura já foi importada anteriormente.",

    fatura: faturaExistente,

  };

}
if (!cliente.usina_id) {
  throw new Error(
    "Cliente não possui usina vinculada."
  );
  }
  const usina = await buscarUsina(cliente.usina_id);
  const modalidade = usina.modelo ?? usina.modalidade;

  const fatura = await inserirFatura({

    cliente_id: cliente.id,

    usina_id: cliente.usina_id,

    numero_instalacao: dados.uc,

    referencia: dados.referencia,

    vencimento,

    consumo: dados.consumo,

    energia_injetada: dados.energiaInjetada,

    energia_compensada: dados.energiaCompensada,

    saldo_atual: dados.saldoAtual,

    valor_total: dados.valorTotal,

    economia: dados.economia,

    bandeira: dados.bandeira,

    distribuidora: dados.distribuidora,

    status: "ABERTA",

  });

  if (modalidade === "COMPENSACAO") {

  await registrarCreditosDaFatura({
    clienteId: cliente.id,
    usinaId: cliente.usina_id,
    faturaId: fatura.id,
    competencia: dados.referencia,
    energiaInjetada: Number(dados.energiaInjetada),
    energiaCompensada: Number(dados.energiaCompensada),
    saldoAtual: Number(dados.saldoAtual),
  });
console.log("Modalidade:", modalidade);
console.log("Chamando consumirCreditos...");
  await consumirCreditos(
    
    cliente.id,
    dados.referencia,
    Number(dados.energiaCompensada)
  );
console.log("consumirCreditos executado.");
}

  await criarCobranca({

    clienteId: cliente.id,

    faturaId: fatura.id,

    valor: dados.valorTotal,

    vencimento,

  });

  return fatura;

}
