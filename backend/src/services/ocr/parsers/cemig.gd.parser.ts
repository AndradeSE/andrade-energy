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

  return porGrupo;
}

function extrairValorLinha(texto: string, expressao: RegExp): number {
  const valor = buscar(texto, expressao);
  return valor ? paraNumero(valor) : 0;
}

function extrairCustoDisponibilidade(texto: string) {
  // Nas contas recentes a linha vem como "Custo de Disponibilidade kWh
  // quantidade tarifa valor". O kWh era ignorado pelo padrão anterior e
  // fazia o campo cair indevidamente em zero.
  const linha = texto.match(
    /Custo\s+de\s+Disponibilidade(?:\s+kWh)?\s+([\d.,]+)(?:\s+([\d.,]+))?(?:\s+([\d.,]+))?/i
  );
  if (!linha) return 0;
  return paraNumero(linha[3] ?? linha[2] ?? "0");
}

export function parseCemigGD(
  texto: string
): FaturaExtraida {

  const dadosConta = texto.match(
    /Referente a\s*Vencimento\s*Valor a pagar \(R\$\)\s*([A-Z]{3}\/\d{4})\s*(\d{2}\/\d{2}\/\d{4})\s*([\d.,]+)/i
  ) ?? texto.match(
    /([A-Z]{3}\/20\d{2})\s*(\d{2}\/\d{2}\/20\d{2})\s*([\d.]+,\d{2})/
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

  // A competência também aparece no histórico de consumo. Para não pegar
  // acidentalmente o valor de outro mês, a fonte preferencial é a própria
  // linha tarifária "Energia Elétrica" da conta.
  const consumoDaLinhaTarifaria = paraNumero(
    buscar(texto, /Energia\s+Elétrica\s*kWh\s+([\d.,]+)/i) || "0"
  );
  const consumoDoHistorico = Number(
    buscar(texto, new RegExp(`${competenciaCurta}\\s+(\\d+)`)) || "0"
  );
  const consumo = consumoDaLinhaTarifaria || consumoDoHistorico;

  const energiaInjetada = Number(
    buscar(
      texto,
      /Energia Injetada.*?\d+\.\d{3}\s*\d+\.\d{3}\s*1\s*(\d+)\s/i
    ) || "0"
  );

  const linhasCompensadas = extrairLinhasCompensadas(texto);
  const energiaCompensada = [...linhasCompensadas.values()].reduce(
    (total, linha) => total + linha.quantidade,
    0
  );
  const gd1 = linhasCompensadas.get("1");
  const gd2 = linhasCompensadas.get("2");

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

  const tarifaGD = gd1?.tarifa ?? gd2?.tarifa ?? 0;

  const tarifaScee = paraNumero(
    buscar(texto, /Energia SCEE(?:\s+HR)?\s+ISENTA\s*kWh\s+[\d.,]+\s+([\d.,]+)/i) || "0"
  );

  const valorEnergiaEletrica = extrairValorLinha(
    texto,
    /Energia Elétrica\s*kWh\s+[\d.,]+\s+[\d.,]+\s+([\d.,]+)/i
  );
  const valorCustoDisponibilidade = extrairCustoDisponibilidade(texto);
  const valorScee = extrairValorLinha(
    texto,
    /Energia SCEE(?:\s+HR)?\s+ISENTA\s*kWh\s+[\d.,]+\s+[\d.,]+\s+([\d.,]+)/i
  );
  const valorCompensado = [...linhasCompensadas.values()].reduce(
    (total, linha) => total + linha.quantidade * linha.tarifa,
    0
  );
  const ajusteCustoDisponibilidade = extrairValorLinha(
    texto,
    /Ajuste Custo Disponibilidade\s*-\s*([\d.,]+)/i
  );
  const valorEnergiaConcessionaria = Math.max(
    0,
    valorEnergiaEletrica + valorCustoDisponibilidade + valorScee - valorCompensado - ajusteCustoDisponibilidade
  );

  const custoDisponibilidade = valorCustoDisponibilidade;

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

    energiaCompensadaGD1: gd1?.quantidade ?? 0,

    energiaCompensadaGD2: gd2?.quantidade ?? 0,

    saldoAtual,

    economia,

    tarifaCheia,

    tarifaGD,

    tarifaGD1: gd1?.tarifa ?? 0,

    tarifaGD2: gd2?.tarifa ?? 0,

    tarifaScee,

    valorEnergiaConcessionaria,

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
