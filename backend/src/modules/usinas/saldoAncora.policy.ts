import { chaveCompetencia, ordemCompetencia } from "../dashboard/competencia.policy";

export function saldoCreditoInformado(valor: unknown, informado?: boolean): number | null {
  if (informado === false || valor == null || String(valor).trim() === "") return null;
  const texto = String(valor).trim();
  const numero = typeof valor === "number" ? valor : Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
  if (!Number.isFinite(numero) || numero < 0 || (numero === 0 && informado !== true)) return null;
  return numero;
}

export function ultimoSaldoAncora(leituras: Array<{saldo: unknown; referencia: unknown; informado?: boolean; registradoEm?: string}>, competencia: string) {
  const limite = ordemCompetencia(competencia);
  const validas = leituras.flatMap(l => {
    const saldo = saldoCreditoInformado(l.saldo, l.informado);
    const ordem = ordemCompetencia(l.referencia);
    return saldo !== null && ordem && ordem <= limite ? [{saldo, referencia: chaveCompetencia(l.referencia), ordem, registradoEm:l.registradoEm ?? ""}] : [];
  }).sort((a,b) => b.ordem-a.ordem || b.registradoEm.localeCompare(a.registradoEm));
  return validas[0] ? {saldoKwh:validas[0].saldo, referencia:validas[0].referencia} : {saldoKwh:null, referencia:null};
}
