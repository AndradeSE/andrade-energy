export function apenasNumeros(texto: string) {
  return texto.replace(/\D/g, "");
}

export function limparEspacos(texto: string) {
  return texto.replace(/\s+/g, " ").trim();
}

export function buscar(
  texto: string,
  regex: RegExp
) {
  return texto.match(regex)?.[1]?.trim() ?? "";
}