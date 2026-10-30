export function paraNumero(valor?: string): number {

  if (!valor)
    return 0;

  return Number(
    valor
      .replace(/\./g, "")
      .replace(",", ".")
  );

}