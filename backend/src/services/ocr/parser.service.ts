import { parseCemigConvencional } from "./parsers/cemig.convencional.parser";
import { parseCemigGD } from "./parsers/cemig.gd.parser";
import { extrairCadastroCemig } from "./parsers/cemig.cadastro.parser";
import { limparEspacos } from "./regex";

export function interpretarFatura(texto: string) {
  const cadastro = extrairCadastroCemig(texto);
  texto = limparEspacos(texto);

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
