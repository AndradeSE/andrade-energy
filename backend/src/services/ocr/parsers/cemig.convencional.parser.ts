import { FaturaExtraida } from "../../../types/FaturaExtraida";

export function parseCemigConvencional(
  texto: string
): FaturaExtraida {

  texto = texto.replace(/\r/g, "");

  // Cliente
 const cliente =
  (
    texto.match(
      /(\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,})+)\s+BAIRRO/i
    )?.[1] ?? ""
  ).trim();
console.log("CLIENTE =", cliente);

  // UC
  const uc =
    (
      texto.match(
        /N\.º DA UNIDADE CONSUMIDORA\s*([\d.\-]+)/i
      )?.[1] ?? ""
    ).replace(/\D/g, "");

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

    uc,

    referencia,

    vencimento,

    valorTotal,

    consumo,

    energiaInjetada: 0,

    energiaCompensada: 0,

    saldoAtual: 0,

    economia: 0,

    bandeira: "",

    distribuidora: "CEMIG",

  };

}