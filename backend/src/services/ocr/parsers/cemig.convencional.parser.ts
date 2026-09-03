import { FaturaExtraida } from "../../../types/FaturaExtraida";
import { extrairCadastroCemig } from "./cemig.cadastro.parser";
import { extrairHistoricoConsumo } from "./cemig.historico.parser";
import { extrairMedicaoCemig } from "./cemig.medicao.parser";
import { extrairEncargosCemig } from "./cemig.encargos.parser";

function ultimoValorDaLinha(linha?: string) {
  if (!linha) return 0;
  const valores = [...linha.matchAll(/-?[\d.]+(?:,\d+)?/g)]
    .map((item) => Number(item[0].replace(/\./g, "").replace(",", ".")));
  const valor = valores.at(-1) ?? 0;
  return Number.isFinite(valor) ? Math.abs(valor) : 0;
}

function extrairDisponibilidadeConvencional(texto: string) {
  const linha = texto
    .split(/\r?\n/)
    .find((item) => /Custo\s+de\s+Disponibilidade/i.test(item) && !/Ajuste\s+Custo\s+Disponibilidade/i.test(item));
  return ultimoValorDaLinha(linha);
}

function extrairLinhaEnergiaEletrica(texto: string) {
  const linha = texto.split(/\r?\n/).find((item) => /Energia\s+Elétrica\s*kWh/i.test(item));
  if (!linha) return { quantidade: 0, tarifaCheia: 0, tarifaSemImpostos: 0 };
  const valores = [...linha.matchAll(/[\d.]+(?:,\d+)?/g)]
    .map((item) => Number(item[0].replace(/\./g, "").replace(",", ".")));
  return {
    quantidade: valores[0] ?? 0,
    tarifaCheia: valores[1] ?? 0,
    tarifaSemImpostos: valores.at(-1) ?? 0,
  };
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

function extrairProximaLeitura(texto: string) {
  return texto.match(/Pr[oó]xima\s+(?:data\s+(?:de|da)\s+)?leitura[^\d]{0,45}(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i)?.[1]?.replace(/[.-]/g, "/")
    ?? texto.match(/(\d{2}[\/.-]\d{2}[\/.-]\d{4})[^A-Za-zÀ-ÿ]{0,25}Pr[oó]xima\s+(?:data\s+(?:de|da)\s+)?leitura/i)?.[1]?.replace(/[.-]/g, "/")
    ?? undefined;
}

export function parseCemigConvencional(
  texto: string
): FaturaExtraida {

  texto = texto.replace(/\r/g, "");

  const { cliente, endereco, uc, tensao, classificacao } = extrairCadastroCemig(texto);

  // Referência + vencimento + valor
  const dadosConta =
    texto.match(
      /([A-Z]{3}\/20\d{2})\s*(\d{2}\/\d{2}\/20\d{2})\s*([\d.]+,\d{2})/
    );

  const referencia =
    dadosConta?.[1] ?? "";

  const vencimento =
    dadosConta?.[2] ?? "";

  const valorTotal =
    Number(
      (dadosConta?.[3] ?? "0")
        .replace(".", "")
        .replace(",", ".")
    );

  const linhaEnergia = extrairLinhaEnergiaEletrica(texto);
  const tarifaCheia = linhaEnergia.tarifaCheia;
  const tipoLigacao = extrairTipoLigacao(texto);
  const franquiaDisponibilidadeKwh = franquiaDaLigacao(tipoLigacao);
  const tarifaDisponibilidadeSemImpostos = linhaEnergia.tarifaSemImpostos;
  const disponibilidadeDaLinha = extrairDisponibilidadeConvencional(texto);
  const custoDisponibilidadeGD1 = Math.max(0, franquiaDisponibilidadeKwh * tarifaDisponibilidadeSemImpostos);
  const custoDisponibilidadeGD2 = disponibilidadeDaLinha > 0
    ? disponibilidadeDaLinha
    : Math.max(0, franquiaDisponibilidadeKwh * (tarifaCheia - tarifaDisponibilidadeSemImpostos));
  const historico = extrairHistoricoConsumo(texto);
  const medicao = extrairMedicaoCemig(texto);
  const encargosDetalhados = extrairEncargosCemig(texto);

  // Consumo do histórico
  let consumo = 0;

  if (referencia) {

    const chave =
      referencia.replace("/20", "/");

    consumo =
      Number(
        texto.match(
          new RegExp(`${chave}\\s+(\\d+)`)
        )?.[1] ?? 0
      );

  }

 return {
  cliente,
  endereco,
  uc,
  referencia,
  vencimento,
  proximaLeitura: extrairProximaLeitura(texto),
  valorTotal,
  consumo,

  energiaInjetada: 0,
  ...medicao,
  tensao,
  classificacao,
  ...encargosDetalhados,
  energiaCompensada: 0,

  saldoAnterior: 0,
  saldoAtual: 0,

  economia: 0,

  tarifaCheia,
  tarifaGD: 0,
  tipoLigacao,
  franquiaDisponibilidadeKwh,
  tarifaDisponibilidadeSemImpostos,
  custoDisponibilidade: custoDisponibilidadeGD2,
  custoDisponibilidadeGD1,
  custoDisponibilidadeGD2,

  bandeira: texto.match(/Bandeira\s+(?:Tarif[aá]ria\s+)?([A-Za-zÀ-Ý]+)/i)?.[1] ?? "",

  distribuidora: "CEMIG",

  historico,

  debitos: [],
};

}
