export function extrairCliente(texto: string): string {

  const match =
    texto.match(/\n([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ ]+)\n\nBAIRRO/);

  return match?.[1].trim() ?? "";

}