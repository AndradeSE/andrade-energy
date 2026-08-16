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

function extrairLinhasCompensadas(texto: string) {
  const linhas = texto.matchAll(
    /Energia\s+compensada\s+GD\s*(I{1,2}|[12])\s*kWh\s+([\d.]+(?:,\d+)?)(?:\s+([\d.,]+))?/gi
  );
  const porGrupo = new Map<string, { quantidade: number; tarifa: number }>();

  for (const linha of linhas) {
    const grupo = linha[1].toUpperCase().replace("II", "2").replace("I", "1");
    if (porGrupo.has(grupo)) continue;
    const quantidade = paraNumero(linha[2]);
    const tarifa = paraNumero(linha[3] ?? "0");
    if (Number.isFinite(quantidade) && quantidade >= 0) {
      porGrupo.set(grupo, { quantidade, tarifa });
    }
  }

  return [...porGrupo.values()];
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

  const linhasCompensadas = extrairLinhasCompensadas(texto);
  const energiaCompensada = linhasCompensadas.reduce(
    (total, linha) => total + linha.quantidade,
    0
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

  const tarifaGD = linhasCompensadas.find((linha) => linha.tarifa > 0)?.tarifa ?? 0;

  const custoDisponibilidade = paraNumero(
    buscar(
      texto,
      /Custo de Disponibilidade\s*[\d.,]+\s+([\d.,]+)/i
    ) || "0"
  );

  const economia = paraNumero(
    buscar(
      texto,
      /Energia\s+compensada\s+GD\s*(?:I{1,2}|[12])\s*kWh\s+[\d.]+(?:,\d+)?\s+[\d.,]+\s*-\s*([\d.,]+)/i
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
