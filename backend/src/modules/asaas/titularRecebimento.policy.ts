const documento = (valor: unknown) => String(valor ?? "").replace(/\D/g, "");

// Uma carteira interna ou um split não comprovam a titularidade da conta
// emissora. Até conectar contas individuais, só o próprio titular pode emitir.
export function exigirMesmoTitularRecebimento(conta: unknown, gerador: unknown) {
  const origem = documento(conta);
  const destino = documento(gerador);
  if (![11, 14].includes(origem.length) || ![11, 14].includes(destino.length) || origem !== destino) {
    throw new Error("Cobrança bloqueada: conecte uma conta Asaas na titularidade deste gerador. A conta principal não pode receber por terceiros.");
  }
}
