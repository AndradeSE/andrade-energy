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

function extrairCustoDisponibilidadeBruto(texto: string) {
  // Nas contas recentes a linha vem como "Custo de Disponibilidade kWh
  // quantidade tarifa valor". O kWh era ignorado pelo padrão anterior e
  // fazia o campo cair indevidamente em zero.
  // A fatura também traz "Ajuste Custo Disponibilidade". Esse ajuste não é
  // o valor bruto da disponibilidade e não pode ser escolhido como a linha
  // principal, ou a parcela que fica na concessionária vira indevidamente 0.
  // Em algumas contas CEMIG a unidade "kWh" não é impressa e a linha começa
  // diretamente por tarifa cheia e valor bruto: 1,20907534  60,42 ...
  // Capturamos esse formato antes da leitura genérica das colunas.
  const formatoSemKwh = texto.match(
    /Custo\s+de\s+Disponibilidade\s*([\d.,]+)\s+([\d.,]+)/i
  );
  if (formatoSemKwh) return paraNumero(formatoSemKwh[2]);

  const linha = texto
    .split(/\r?\n/)
    .find((item) => /Custo\s+de\s+Disponibilidade/i.test(item) && !/Ajuste\s+Custo\s+Disponibilidade/i.test(item));
  if (!linha) return 0;
  const valores = [...linha.matchAll(/[\d.]+(?:,\d+)?/g)].map((item) => paraNumero(item[0]));
  // Sem kWh, a NF traz "preço unitário, valor". Quando vier quantidade,
  // ela ocupa a primeira posição e o valor passa a ser o terceiro número.
  return /Disponibilidade\s*kWh/i.test(linha)
    ? valores[2] ?? 0
    : valores[1] ?? 0;
}

function extrairLinhaEnergiaEletrica(texto: string) {
  const linha = texto.split(/\r?\n/).find((item) => /Energia\s+Elétrica\s*kWh/i.test(item));
  if (!linha) return { quantidade: 0, precoComImpostos: 0, valorComImpostos: 0, tarifaSemImpostos: 0 };
  const valores = [...linha.matchAll(/[\d.]+(?:,\d+)?/g)].map((item) => paraNumero(item[0]));
  return {
    quantidade: valores[0] ?? 0,
    precoComImpostos: valores[1] ?? 0,
    valorComImpostos: valores[2] ?? 0,
    // A última coluna da NF é a tarifa unitária sem PIS/COFINS e ICMS.
    tarifaSemImpostos: valores.at(-1) ?? 0,
  };
}

function extrairTarifaDoAjusteDisponibilidade(texto: string) {
  const linha = texto.split(/\r?\n/).find((item) => /(?:Ajuste\s+)?Custo\s+Disponibilidade\s*-/i.test(item));
  if (!linha) return 0;
  const valores = [...linha.matchAll(/[\d.]+(?:,\d+)?/g)].map((item) => paraNumero(item[0]));
  return valores.at(-1) ?? 0;
}

function extrairTipoLigacao(texto: string) {
  const tipo = texto.match(/(Monof[aá]sico|Bif[aá]sico|Trif[aá]sico)/i)?.[1]
    ?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (tipo === "MONOFASICO" || tipo === "BIFASICO" || tipo === "TRIFASICO") return tipo;
  return undefined;
}

function franquiaDaLigacao(tipo?: string) {
  if (tipo === "TRIFASICO") return 100;
  if (tipo === "BIFASICO") return 50;
  if (tipo === "MONOFASICO") return 30;
  return 0;
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
  const historico = extrairHistoricoConsumo(texto);
  const consumoDoHistorico = Number(
    buscar(texto, new RegExp(`${competenciaCurta}\\s+(\\d+)`)) || "0"
  );
  const consumo = historico.find((item) => item.mes === competenciaCurta)?.consumo || consumoDoHistorico;
  const linhaEnergiaEletrica = extrairLinhaEnergiaEletrica(texto);

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

  const tarifaCheia = linhaEnergiaEletrica.precoComImpostos || paraNumero(
    buscar(texto, /Custo de Disponibilidade\s*([\d.,]+)/i) || "0"
  );

  const tarifaGD = gd1?.tarifa ?? gd2?.tarifa ?? 0;

  const tarifaScee = paraNumero(
    buscar(texto, /Energia SCEE(?:\s+HR)?\s+ISENTA\s*kWh\s+[\d.,]+\s+([\d.,]+)/i) || "0"
  );

  const valorEnergiaEletrica = extrairValorLinha(
    texto,
    /Energia Elétrica\s*kWh\s+[\d.,]+\s+[\d.,]+\s+([\d.,]+)/i
  );
  const custoDisponibilidadeComImpostos = extrairCustoDisponibilidadeBruto(texto);
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
    /(?:Ajuste\s+)?Custo\s+Disponibilidade\s*-\s*([\d.,]+)/i
  );
  const tipoLigacao = extrairTipoLigacao(texto);
  const franquiaDisponibilidadeKwh = franquiaDaLigacao(tipoLigacao);
  const tarifaDoAjusteDisponibilidade = extrairTarifaDoAjusteDisponibilidade(texto);
  // Em GD II o ajuste corresponde exatamente à franquia sem impostos.
  // Ex.: bifásico: 50 kWh x R$ 0,92214 = R$ 46,10.
  const tarifaDisponibilidadeSemImpostos = tarifaDoAjusteDisponibilidade || (franquiaDisponibilidadeKwh > 0 && ajusteCustoDisponibilidade > 0
    ? ajusteCustoDisponibilidade / franquiaDisponibilidadeKwh
    : linhaEnergiaEletrica.quantidade === franquiaDisponibilidadeKwh
      ? linhaEnergiaEletrica.tarifaSemImpostos
      : 0);
  const custoDisponibilidade = franquiaDisponibilidadeKwh * tarifaDisponibilidadeSemImpostos;
  const custoBrutoDaLinhaEnergia = linhaEnergiaEletrica.quantidade === franquiaDisponibilidadeKwh
    ? linhaEnergiaEletrica.valorComImpostos
    : 0;
  const custoDisponibilidadeBrutoFinal = custoDisponibilidadeComImpostos || custoBrutoDaLinhaEnergia;
  const valorEnergiaConcessionaria = Math.max(
    0,
    valorEnergiaEletrica + custoDisponibilidadeComImpostos + valorScee - valorCompensado - ajusteCustoDisponibilidade
  );
  const encargosAdicionais = Math.max(0, valorTotal - valorEnergiaConcessionaria);

  const economia = paraNumero(
    buscar(
      texto,
      /Energia\s+compensada\s+GD\s*(?:I{1,2}|[12])\s*kWh\s+[\d.]+(?:,\d+)?\s+[\d.,]+\s*-\s*([\d.,]+)/i
    ) || "0"
  );

  const cadastro = extrairCadastroCemig(texto);
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

    valorCreditoCompensado: valorCompensado,

    valorEnergiaConcessionaria,

    tipoLigacao,

    franquiaDisponibilidadeKwh,

    tarifaDisponibilidadeSemImpostos,

    custoDisponibilidade,

    custoDisponibilidadeComImpostos: custoDisponibilidadeBrutoFinal,

    ajusteCustoDisponibilidade,

    encargosAdicionais,

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
