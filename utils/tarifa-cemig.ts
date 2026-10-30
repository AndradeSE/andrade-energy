export const FONTE_TARIFAS_CEMIG='https://www.cemig.com.br/valores-e-tarifas/tarifas-vigentes/';
export { tarifaComTributos } from "./impostos-tarifa";
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
export type TributosConsultados = {solicitado:string; vigente:boolean; tributos:{referencia:string;pis:number;cofins:number;icmsPadrao:number|null;fonte:string}|null};
export async function consultarTributosCemig(referencia:string):Promise<TributosConsultados>{
 const {data}=await api.get('/usinas/tributos-cemig',{params:{referencia},timeout:35000});
 const t=data?.tributos;
 if(t&&(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(t.referencia)||![t.pis,t.cofins].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<20)))throw new Error('A fonte não retornou impostos válidos.');
 return data;
}
