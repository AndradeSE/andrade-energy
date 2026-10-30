import { parseCemigConvencional } from "./parsers/cemig.convencional.parser";
import { parseCemigGD } from "./parsers/cemig.gd.parser";
import { extrairCadastroCemig } from "./parsers/cemig.cadastro.parser";

export function interpretarFatura(texto: string) {
  const cadastro = extrairCadastroCemig(texto);
  // Mantém as quebras de linha da NF. Os parsers tarifários dependem delas
  // para separar Energia Elétrica, iluminação, bandeira e disponibilidade.
  texto = texto.replace(/[^\S\r\n]+/g, " ").replace(/\r/g, "").trim();

  // Faturas GD possuem informações de compensação
  if (
    texto.includes("SALDO ATUAL DE GERAÇÃO") ||
    texto.includes("Energia compensada") ||
    texto.includes("Energia Injetada")
  ) {
    return { ...parseCemigGD(texto), ...cadastro };
  }

  return { ...parseCemigConvencional(texto), ...cadastro };

}
