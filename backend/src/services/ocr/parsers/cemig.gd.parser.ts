import { FaturaExtraida } from "../../../types/FaturaExtraida";
import { buscar } from "../regex";
import { extrairCadastroCemig } from "./cemig.cadastro.parser";
import { extrairHistoricoConsumo } from "./cemig.historico.parser";
import { extrairMedicaoCemig } from "./cemig.medicao.parser";

function paraNumero(valor: string): number {
  return Number(
    valor
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

export function parseCemigGD(
  texto: string
): FaturaExtraida {

  const dadosConta = texto.match(
    /Referente a\s*Vencimento\s*Valor a pagar \(R\$\)\s*([A-Z]{3}\/\d{4})(\d{2}\/\d{2}\/\d{4})([\d.,]+)/i
  );

  const referencia =
    dadosConta?.[1] ?? "";

  const vencimento =
    dadosConta?.[2] ?? "";

  const valorTotal =
    paraNumero(
      dadosConta?.[3] ?? "0"
    );

  const competenciaCurta =
    referencia.replace(
      /\/20(\d{2})$/,
      "/$1"
    );

  const consumo = Number(
    buscar(
      texto,
      new RegExp(
        `${competenciaCurta}\\s+(\\d+)`
      )
    ) || "0"
  );

  const energiaInjetada = Number(
    buscar(
      texto,
      /Energia Injetada.*?\d+\.\d{3}\s*\d+\.\d{3}\s*1\s*(\d+)\s/i
    ) || "0"
  );

  const energiaCompensada = Number(
    buscar(
      texto,
      /Energia compensada\s+GD\s*(?:II|I)\s*kWh\s*(\d+)/i
    ) || "0"
  );

  const saldoAtual = paraNumero(
    buscar(
      texto,
      /SALDO ATUAL DE GERAÇÃO:\s*([\d.,]+)/i
    ) || "0"
  );

  const tarifaCheia = paraNumero(
    buscar(texto, /Custo de Disponibilidade\s*([\d.,]+)/i) ||
    buscar(texto, /Energia Elétrica\s*kWh\s*\d+\s+([\d.,]+)/i) ||
    "0"
  );

  const tarifaGD = paraNumero(
    buscar(
      texto,
      /Energia compensada\s+GD\s*(?:II|I)\s*kWh\s*\d+\s+([\d.,]+)/i
    ) || "0"
  );

  const custoDisponibilidade = paraNumero(
    buscar(
      texto,
      /Custo de Disponibilidade\s*[\d.,]+\s+([\d.,]+)/i
    ) || "0"
  );

  const economia = paraNumero(
    buscar(
      texto,
      /Energia compensada\s+GD\s*(?:II|I)\s*kWh\s*\d+\s+[\d.,]+\s*-\s*([\d.,]+)/i
    ) || "0"
  );

  const cadastro = extrairCadastroCemig(texto);
  const historico = extrairHistoricoConsumo(texto);
  const medicao = extrairMedicaoCemig(texto);

  return {

    cliente: cadastro.cliente,

    endereco: cadastro.endereco,

    uc: cadastro.uc,

    referencia,

    vencimento,

    valorTotal,

    consumo,

    energiaInjetada,

    ...medicao,

    energiaCompensada,

    saldoAtual,

    economia,

    tarifaCheia,

    tarifaGD,

    custoDisponibilidade,

    bandeira: buscar(
      texto,
      /Bandeira\s+([A-Za-zÀ-Ý]+)/i
    ),

    distribuidora: "CEMIG",

    saldoAnterior: 0,

historico,

debitos: [],

  };

}
