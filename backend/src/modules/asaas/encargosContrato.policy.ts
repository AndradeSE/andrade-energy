/** Só reconhece a cláusula completa do modelo Andrade. Outros instrumentos
 * exigem conferência, sem aplicar taxas presumidas a contratos externos. */
export function encargosDoTextoAssinado(texto: string) {
  const normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLowerCase();
  const clausula = normalizado.match(/o atraso no pagamento da remuneracao acarretara multa moratoria de 2% \(dois por cento\) sobre o valor devido, juros de mora de 1% \(um por cento\) ao mes, calculados pro rata die/);
  if (!clausula) throw new Error("Os encargos deste contrato precisam de conferência antes da configuração da cobrança.");
  return { interest: { value: 1 }, fine: { value: 2, type: "PERCENTAGE" } };
}
