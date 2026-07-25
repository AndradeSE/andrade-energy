import { parseCemig } from "./parsers/cemig.parser";

export function interpretarFatura(
  texto: string
) {

  if (
    texto
      .toUpperCase()
      .includes("CEMIG")
  ) {

    return parseCemig(texto);

  }

  throw new Error(
    "Distribuidora não suportada."
  );

}