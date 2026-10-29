import {createHash} from 'node:crypto';
export type EstadoEnvioNativo='PENDENTE'|'EXECUTANDO'|'AGUARDANDO_USUARIO'|'REVISAO'|'ENVIANDO'|'PROTOCOLADO'|'INCERTO'|'FALHA'|'CANCELADO';
export function conferirArtefatoEnvio(plano:any){
 if(plano?.rascunho||plano?.formatoCemig!==true||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(plano?.competencia)||plano?.pendencias?.length||typeof plano?.csv!=='string'||Buffer.byteLength(plano.csv)>100000)throw new Error('Planilha não está pronta para envio.');
 const geradora=String(plano.arquivo??'').match(/-(\d{6,20})\.csv$/)?.[1];
 if(!geradora)throw new Error('Geradora ausente no arquivo.');
 const rows=plano.csv.trim().split(/\r?\n/).map((line:string)=>line.split(';'));
 if(!rows.length||rows.some((r:string[])=>r.length!==4||!/^\d{6,20}$/.test(r[0])||!/^\d{11}(\d{3})?$/.test(r[1])||!/^\d+(,\d{1,4})?$/.test(r[2])||!['','X'].includes(r[3])))throw new Error('CSV fora do padrão.');
 if(rows.filter((r:string[])=>r[3]==='X').length!==1||new Set(rows.map((r:string[])=>r[0])).size!==rows.length||rows.reduce((n:number,r:string[])=>n+Math.round(Number(r[2].replace(',','.'))*10000),0)!==1000000)throw new Error('Confira as UCs, âncora e percentuais.');
 return {hash:createHash('sha256').update(plano.csv).digest('hex'),geradora};
}
const transitions:Record<EstadoEnvioNativo,EstadoEnvioNativo[]>={
 PENDENTE:['EXECUTANDO','CANCELADO'],EXECUTANDO:['AGUARDANDO_USUARIO','REVISAO','FALHA','CANCELADO'],
 AGUARDANDO_USUARIO:['EXECUTANDO','CANCELADO'],REVISAO:['ENVIANDO','CANCELADO'],
 ENVIANDO:['PROTOCOLADO','INCERTO'],PROTOCOLADO:[],INCERTO:[],FALHA:[],CANCELADO:[],
};
export function conferirTransicaoEnvio(de:EstadoEnvioNativo,para:EstadoEnvioNativo,preview:boolean,protocolo?:string){
 if(!transitions[de]?.includes(para))throw new Error('Transição não permitida; não repetir envio.');
 if(preview&&['ENVIANDO','PROTOCOLADO'].includes(para))throw new Error('Preview bloqueia o protocolo definitivo.');
 if(para==='PROTOCOLADO'&&!/^\d{6,30}$/.test(protocolo??''))throw new Error('Protocolo não confirmado.');
}
export function estadoAposInterrupcao(estado:EstadoEnvioNativo):EstadoEnvioNativo{
 if(estado==='ENVIANDO')return 'INCERTO';
 return estado==='EXECUTANDO'?'AGUARDANDO_USUARIO':estado;
}
