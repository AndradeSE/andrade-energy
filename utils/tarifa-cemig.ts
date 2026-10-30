export const FONTE_TARIFAS_CEMIG='https://www.cemig.com.br/valores-e-tarifas/tarifas-vigentes/';
export function tarifaComTributos(tarifa:number,icms:number,pis:number,cofins:number){
 const aliquotas=[icms,pis,cofins];
 if(!Number.isFinite(tarifa)||tarifa<=0||aliquotas.some(v=>!Number.isFinite(v)||v<0||v>=100)||icms+pis+cofins>=100)throw new Error('Confira a tarifa e as alíquotas de ICMS, PIS e Cofins.');
 // PIS/Cofins não incluem ICMS em sua base (orientação Cemig).
 return tarifa/((1-icms/100)*(1-(pis+cofins)/100));
}
export async function consultarTarifaCemig(classe:string,bandeira:number):Promise<number>{
 if(!['B1','B2','B3'].includes(classe)||![0,1,2,3].includes(bandeira))throw new Error('Selecione a classe e a bandeira.');
 const response=await api.get('/usinas/tarifas-cemig',{timeout:20000});
 const html=String(response.data?.html||'');
 const tables=html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi)||[];
 for(const table of tables){
  const plain=table.replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ');
  if(!new RegExp(`${classe}\\s*[-–]?\\s*${classe==='B1'?'Residencial Normal':classe==='B2'?'Rural':'Demais classes'}`,'i').test(plain)||/Geração distribuída/i.test(plain))continue;
  const rows=table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[];
  for(const row of rows){
   const cells=(row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi)||[]).map(c=>c.replace(/<[^>]+>/g,' ').trim());
   const prices=cells.map(c=>/^\s*(\d+,\d+)\s*$/.exec(c)?.[1]).filter(Boolean);
   if(prices.length===4){const value=Number(prices[bandeira]!.replace(',','.'));if(value>0&&value<10)return value;}
  }
 }
 throw new Error('Tabela oficial não reconhecida. Informe a tarifa manualmente.');
}
import api from '../config/api';
