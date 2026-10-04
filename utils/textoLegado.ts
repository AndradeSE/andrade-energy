// Alguns nomes antigos foram persistidos como UTF-8 interpretado como Latin-1.
// Corrige somente sequências reconhecíveis, sem alterar o valor salvo no banco.
export function textoLegivel(valor: string | null | undefined): string {
  return String(valor ?? "").replace(/(?:[ÃÂ][\u0080-\u00bf])+/g, trecho => {
    try {
      const bytes = Array.from(trecho, letra => `%${letra.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");
      return decodeURIComponent(bytes);
    } catch {
      return trecho;
    }
  });
}
