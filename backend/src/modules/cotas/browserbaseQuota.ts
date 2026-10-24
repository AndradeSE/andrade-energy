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
export async function cotaBrowserbase(){
 const r=await supabase.from('browserbase_cota_coletada').select('usado,status,consultado_em').eq('ambiente',ambiente()).maybeSingle();
 if(r.error||!r.data)return [];
 if(r.data.usado!=null){
  const item=leituraBrowserbase(Number(r.data.usado),Date.parse(r.data.consultado_em));
  item.consulta.status=r.data.status;
  item.leitura.desatualizada=Date.now()-Date.parse(r.data.consultado_em)>15*60000||r.data.status!=='OK';
  return [item];
 }
 return [{servico:'BROWSERBASE',metrica:'navegador_minutos',rotulo:'Browserbase · navegador em nuvem',unidade:'minutos',automatico:true,observacao:'Uso do projeto da automação Cemig. Falha de consulta não significa saldo zero.',consulta:{status:r.data.status,consultado_em:r.data.consultado_em},leitura:null}];
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
