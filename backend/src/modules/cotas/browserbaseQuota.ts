import {consultarMinutosBrowserbase} from '../usinas/cemigCloud.browserbase';

/** Usage is per project, never claimed as total account usage. */
export function leituraBrowserbase(usado:unknown,agora=Date.now()){
 if(typeof usado!=='number'||!Number.isFinite(usado)||usado<0)throw new Error('Leitura de cota inválida.');
 return {servico:'BROWSERBASE',metrica:'navegador_minutos',rotulo:'Browserbase · navegador em nuvem',unidade:'minutos',automatico:true,
  observacao:'Plano Free · 60 minutos por período. Uso do projeto exclusivo da Cemig. Simulações de até dez minutos; nenhum plano é contratado pelo app.',
  consulta:{status:'OK',consultado_em:new Date(agora).toISOString()},
  leitura:{usado,limite:60,restante:Math.max(60-usado,0),percentual:usado/60*100,origem:'API_OFICIAL',renova_em:null,verificado_em:new Date(agora).toISOString(),desatualizada:false}};
}
export async function cotaBrowserbase(){
 if(!process.env.BROWSERBASE_API_KEY||process.env.BROWSERBASE_FREE_PLAN_CONFIRMED!=='true'||!process.env.BROWSERBASE_PROJECT_ID)return [];
 try{return [leituraBrowserbase(await consultarMinutosBrowserbase())];}
 catch{return [{servico:'BROWSERBASE',metrica:'navegador_minutos',rotulo:'Browserbase · navegador em nuvem',unidade:'minutos',automatico:true,observacao:'Uso do projeto da automação Cemig. Falha de consulta não significa saldo zero.',consulta:{status:'CONSULTA_INDISPONIVEL',consultado_em:new Date().toISOString()},leitura:null}];}
}
