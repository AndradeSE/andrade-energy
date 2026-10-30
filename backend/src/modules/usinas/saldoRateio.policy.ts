import { chaveCompetencia, ordemCompetencia } from "../dashboard/competencia.policy";
export type LeituraSaldoRateio = {numero:unknown;clienteId:unknown;referencia:unknown;saldo:unknown;registradoEm?:unknown;fonte:"FATURA"|"ANEXO"};
const digitos=(v:unknown)=>String(v??"").replace(/\D/g,"");

export function saldoAnteriorParaRateio(numero:string,clienteId:string,competencia:string,leituras:LeituraSaldoRateio[]) {
  const alvo=ordemCompetencia(competencia);
  const validas=leituras.flatMap(l=>{
    if(digitos(l.numero)!==digitos(numero)||String(l.clienteId)!==clienteId)return [];
    const ordem=ordemCompetencia(l.referencia);
    if(!ordem||ordem>alvo||l.saldo==null||String(l.saldo).trim()==="")return [];
    const texto=String(l.saldo).trim();
    const saldo=typeof l.saldo==="number"?l.saldo:Number(texto.includes(",")?texto.replace(/\./g,"").replace(",","."):texto);
    return Number.isFinite(saldo)&&saldo>=0?[{...l,saldo,ordem}]:[];
  }).sort((a,b)=>b.ordem-a.ordem || Number(b.fonte==="ANEXO")-Number(a.fonte==="ANEXO") || String(b.registradoEm??"").localeCompare(String(a.registradoEm??"")));
  const ultima=validas[0];
  return ultima?{saldo:ultima.saldo,referencia:chaveCompetencia(ultima.referencia),semHistorico:false}
    :{saldo:0,referencia:undefined,semHistorico:true};
}
