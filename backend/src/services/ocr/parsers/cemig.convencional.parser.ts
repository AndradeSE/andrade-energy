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

  const tarifaCheia = Number(
    (texto.match(/Energia Elétrica\s*kWh\s*\d+\s+([\d.,]+)/i)?.[1] ?? "0")
      .replace(/\./g, "")
      .replace(",", ".")
  );
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
  custoDisponibilidade: extrairDisponibilidadeConvencional(texto),

  bandeira: texto.match(/Bandeira\s+(?:Tarif[aá]ria\s+)?([A-Za-zÀ-Ý]+)/i)?.[1] ?? "",

  distribuidora: "CEMIG",

  historico,

  debitos: [],
};

}
