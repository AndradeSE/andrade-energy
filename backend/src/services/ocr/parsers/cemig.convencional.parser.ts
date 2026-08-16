import { FaturaExtraida } from "../../../types/FaturaExtraida";
import { extrairCadastroCemig } from "./cemig.cadastro.parser";
import { extrairHistoricoConsumo } from "./cemig.historico.parser";

export function parseCemigConvencional(
  texto: string
): FaturaExtraida {

  texto = texto.replace(/\r/g, "");

  const { cliente, endereco, uc } = extrairCadastroCemig(texto);

  // Referência + vencimento + valor
  const dadosConta =
    texto.match(
      /([A-Z]{3}\/20\d{2})(\d{2}\/\d{2}\/20\d{2})(\d+,\d{2})/
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
  energiaCompensada: 0,

  saldoAnterior: 0,
  saldoAtual: 0,

  economia: 0,

  tarifaCheia,
  tarifaGD: 0,
  custoDisponibilidade: 0,

  bandeira: "",

  distribuidora: "CEMIG",

  historico,

  debitos: [],
};

}
