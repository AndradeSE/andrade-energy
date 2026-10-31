/** Configurar/transmitir e-mail não ativa o contrato nem autoriza cobrar a UC.
 * Uma beneficiária pendente pode ser a referência da caixa compartilhada do titular.
 * A seleção da UC do PDF continua exigindo status ATIVA antes de faturar.
 */
export function origemEmailPermitida(unidade: { status?: string; tipo?: string } | null | undefined) {
  return unidade?.status === "ATIVA"
    || (unidade?.status === "PENDENTE_CONTRATO" && unidade.tipo === "BENEFICIARIA");
}


export function pdfDeOutraUcNaGeradora(origem: { tipo?: string; numero?: string }, numeroPdf: unknown) {
  const numeros=(v:unknown)=>String(v??'').replace(/\D/g,'');
  const numero=numeros(numeroPdf), esperado=numeros(origem.numero);
  return origem.tipo==='GERADORA' && numero.length>=6 && esperado.length>=6 && numero!==esperado;
}
