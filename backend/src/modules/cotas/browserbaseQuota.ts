import {consultarMinutosBrowserbase} from '../usinas/cemigCloud.browserbase';
import {supabase} from '../../config/supabase';
const ambiente=()=>/qqhcjieymypowunkixmk/.test(process.env.SUPABASE_URL??'')?'preview':'production';

/** Usage is per project, never claimed as total account usage. */
export function leituraBrowserbase(usado:unknown,agora=Date.now()){
 if(typeof usado!=='number'||!Number.isFinite(usado)||usado<0)throw new Error('Leitura de cota inválida.');
 return {servico:'BROWSERBASE',metrica:'navegador_minutos',rotulo:'Browserbase · navegador em nuvem',unidade:'minutos',automatico:true,
  observacao:'Plano Free · 60 minutos por período. Uso do projeto exclusivo da Cemig. Simulações de até dez minutos; nenhum plano é contratado pelo app.',
  consulta:{status:'OK',consultado_em:new Date(agora).toISOString()},
  leitura:{usado,limite:60,restante:Math.max(60-usado,0),percentual:usado/60*100,origem:'API_OFICIAL',renova_em:null,verificado_em:new Date(agora).toISOString(),desatualizada:false}};
}
export async function consultarCotaAtual(consultar:()=>Promise<number>){
 try{return [leituraBrowserbase(await consultar())];}
 catch{return [{servico:'BROWSERBASE',metrica:'navegador_minutos',rotulo:'Browserbase · navegador em nuvem',unidade:'minutos',automatico:true,
  observacao:'Não foi possível consultar o projeto configurado neste servidor. A falha não significa saldo zero.',
  consulta:{status:'CONSULTA_INDISPONIVEL',consultado_em:new Date().toISOString()},leitura:null}];}
}
export async function cotaBrowserbase(){
 if(!process.env.BROWSERBASE_API_KEY||!process.env.BROWSERBASE_PROJECT_ID||process.env.BROWSERBASE_FREE_PLAN_CONFIRMED!=='true')return [];
 // The shared legacy collector may still use another project's credentials.
 // Query this server's configured project; never substitute another project's cache.
 return consultarCotaAtual(consultarMinutosBrowserbase);
}
export async function coletarCotaBrowserbase(){
 if(!process.env.BROWSERBASE_API_KEY||process.env.BROWSERBASE_FREE_PLAN_CONFIRMED!=='true'||!process.env.BROWSERBASE_PROJECT_ID)return;
 try{
  const usado=await consultarMinutosBrowserbase();
  const r=await supabase.from('browserbase_cota_coletada').upsert({ambiente:ambiente(),usado,status:'OK',consultado_em:new Date().toISOString()});
  if(r.error)throw new Error('Não foi possível salvar a cota.');
 }catch{
  // Preserve the last confirmed amount; a failed query is never a zero.
  const r=await supabase.from('browserbase_cota_coletada').upsert({ambiente:ambiente(),status:'CONSULTA_INDISPONIVEL',consultado_em:new Date().toISOString()},{onConflict:'ambiente',ignoreDuplicates:true});
  if(r.error)throw new Error('Não foi possível registrar a consulta.');
  await supabase.from('browserbase_cota_coletada').update({status:'CONSULTA_INDISPONIVEL'}).eq('ambiente',ambiente());
 }
}
