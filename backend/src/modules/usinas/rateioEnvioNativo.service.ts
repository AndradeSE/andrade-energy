import {supabase} from '../../config/supabase';
import {conferirArtefatoEnvio,conferirTransicaoEnvio,conferirAutorizacaoEnvio,EstadoEnvioNativo} from './rateioEnvioNativo.policy';
import {prepararPlanilhaRateio} from './rateioMensal.service';
import {randomUUID} from 'node:crypto';
const preview=()=>String(process.env.SUPABASE_URL).replace(/\/$/,'')==='https://qqhcjieymypowunkixmk.supabase.co';
async function scope(usina:string,empresa:string){
 if(!preview()&&process.env.CEMIG_NATIVE_BACKGROUND_ENABLED!=='true')throw new Error('Fila nativa ainda não habilitada neste ambiente.');
 const r=await supabase.from('usinas').select('id').eq('empresa_id',empresa).eq('id',usina).maybeSingle();
 if(r.error||!r.data)throw new Error('Acesso indisponível.');
}
export async function configurarFilaNativa(usina:string,empresa:string,usuario:string,body:any){
 await scope(usina,empresa);
 if(typeof body?.habilitado!=='boolean'||body.habilitado&&body.autorizaEnvioAutomatico!==true)throw new Error('Confirme o modo de envio.');
 const modo=body?.modo??'AUTOMATICO';
 if(!['AUTOMATICO','AUTORIZADO'].includes(modo))throw new Error('Modo inválido.');
 let competenciaAutorizada:string|null=null,hashAutorizado:string|null=null;
 if(body.habilitado&&modo==='AUTORIZADO'){
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(body.competencia??'')||! /^[a-f0-9]{64}$/.test(body.hash??''))throw new Error('Confira o arquivo antes de autorizar.');
  competenciaAutorizada=body.competencia+'-01';hashAutorizado=body.hash;
  const ready=await supabase.from('rateios_mensais_automaticos').select('resultado,status').eq('empresa_id',empresa).eq('usina_id',usina).eq('competencia',competenciaAutorizada).maybeSingle();
  if(ready.error||ready.data?.status!=='GERADO'||conferirArtefatoEnvio(ready.data.resultado).hash!==hashAutorizado)throw new Error('A planilha não está pronta ou mudou após a conferência.');
 }
 const competenciaInicio=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).slice(0,7)+'-01';
 const r=await supabase.from('rateio_envio_nativo_config').upsert({empresa_id:empresa,usina_id:usina,usuario_id:usuario,habilitado:body.habilitado,competencia_inicio:competenciaInicio,modo,competencia_autorizada:competenciaAutorizada,hash_autorizado:hashAutorizado,atualizado_em:new Date().toISOString()});
 if(r.error)throw new Error('Não foi possível salvar a automação.');
 return {habilitado:body.habilitado,competenciaInicio,simulacao:preview()};
}
export async function listarFilaNativa(usina:string,empresa:string,usuario:string){
 await scope(usina,empresa);
 const c=await supabase.from('rateio_envio_nativo_config').select('*').eq('empresa_id',empresa).eq('usina_id',usina).eq('usuario_id',usuario).maybeSingle();
 if(c.error)throw c.error;
 if(!c.data?.habilitado)return {habilitado:false,itens:[]};
 const now=new Date().toISOString();
 const uncertain=await supabase.from('rateio_envios_nativos').update({estado:'INCERTO',atualizado_em:now}).eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).eq('estado','ENVIANDO').lt('lease_ate',now);
 if(uncertain.error)throw uncertain.error;
 const interrupted=await supabase.from('rateio_envios_nativos').update({estado:'PENDENTE',lease_id:null,lease_ate:null,atualizado_em:now}).eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).eq('estado','EXECUTANDO').lt('lease_ate',now);
 if(interrupted.error)throw interrupted.error;
 let readyQuery=supabase.from('rateios_mensais_automaticos').select('id,competencia,resultado').eq('empresa_id',empresa).eq('usina_id',usina).eq('status','GERADO');
 readyQuery=c.data.modo==='AUTORIZADO'?readyQuery.eq('competencia',c.data.competencia_autorizada):readyQuery.gte('competencia',c.data.competencia_inicio);
 const ready=await readyQuery.order('competencia').limit(12);
 if(ready.error)throw ready.error;
 for(const r of ready.data??[]){
  let artefato;try{artefato=conferirArtefatoEnvio(r.resultado);}catch{continue;}
  if(c.data.modo==='AUTORIZADO'&&artefato.hash!==c.data.hash_autorizado)continue;
  const add=await supabase.from('rateio_envios_nativos').upsert({empresa_id:empresa,usina_id:usina,usuario_id:usuario,competencia:r.competencia,registro_rateio_id:r.id,csv_hash:artefato.hash},{onConflict:'empresa_id,usina_id,competencia',ignoreDuplicates:true});
  if(add.error)throw add.error;
 }
 const jobs=await supabase.from('rateio_envios_nativos').select('id,competencia,estado,csv_hash,protocolo,atualizado_em').eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).order('competencia',{ascending:false}).limit(12);
 if(jobs.error)throw jobs.error;
 return {habilitado:true,modo:c.data.modo,itens:jobs.data??[]};
}
export async function reivindicarEnvioNativo(usina:string,empresa:string,usuario:string,id:string){
 await scope(usina,empresa);
 const job=await supabase.from('rateio_envios_nativos').select('id,competencia,csv_hash').eq('id',id).eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).maybeSingle();
 if(job.error||!job.data)throw new Error('Envio indisponível.');
 const authorization=await supabase.from('rateio_envio_nativo_config').select('*').eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).maybeSingle();
 if(authorization.error)throw authorization.error;
 conferirAutorizacaoEnvio(authorization.data,job.data);
 const claim=await supabase.rpc('reivindicar_envio_nativo',{p_empresa:empresa,p_usuario:usuario,p_id:id});
 if(claim.error||!claim.data?.[0])throw new Error('Envio já reservado ou encerrado. Não repetir.');
 const row=claim.data[0];
 if(row.artefato_teste&&!preview())throw new Error('Cópia de teste bloqueada em produção.');
 if(row.artefato_teste&&preview()){
  if(conferirArtefatoEnvio(row.artefato_teste).hash!==row.csv_hash)throw new Error('Cópia de teste divergente.');
  return {id:row.id,leaseId:row.lease_id,hash:row.csv_hash,plano:row.artefato_teste,simulacao:true};
 }
 const r=await supabase.from('rateios_mensais_automaticos').select('resultado').eq('id',row.registro_rateio_id).eq('empresa_id',empresa).eq('usina_id',usina).single();
 if(r.error||conferirArtefatoEnvio(r.data?.resultado).hash!==row.csv_hash)throw new Error('A planilha mudou. Confira o rateio antes de enviar.');
 return {id:row.id,leaseId:row.lease_id,hash:row.csv_hash,plano:r.data.resultado,simulacao:preview(),permiteProtocolo:!preview()};
}
export async function atualizarEnvioNativo(usina:string,empresa:string,usuario:string,id:string,body:any){
 await scope(usina,empresa);
 if(!/^[a-f0-9-]{36}$/i.test(body?.leaseId??''))throw new Error('Sessão inválida.');
 const before=await supabase.from('rateio_envios_nativos').select('estado,csv_hash,competencia').eq('id',id).eq('empresa_id',empresa).eq('usina_id',usina).eq('usuario_id',usuario).eq('lease_id',body.leaseId).gt('lease_ate',new Date().toISOString()).single();
 if(before.error||before.data.csv_hash!==body.hash)throw new Error('Sessão encerrada ou arquivo divergente.');
 conferirTransicaoEnvio(before.data.estado as EstadoEnvioNativo,body.estado,preview(),body.protocolo);
 if(body.estado==='ENVIANDO'){
  const enabled=await supabase.from('rateio_envio_nativo_config').select('*').eq('empresa_id',empresa).eq('usina_id',usina).eq('usuario_id',usuario).maybeSingle();
  if(enabled.error)throw enabled.error;
  conferirAutorizacaoEnvio(enabled.data,before.data);
 }
 const saved=await supabase.from('rateio_envios_nativos').update({estado:body.estado,protocolo:body.estado==='PROTOCOLADO'?body.protocolo:null,atualizado_em:new Date().toISOString()}).eq('id',id).eq('lease_id',body.leaseId).eq('estado',before.data.estado).select('id,estado,protocolo');
 if(saved.error||saved.data?.length!==1)throw new Error('O envio mudou de estado. Não repetir.');
 return saved.data[0];
}
