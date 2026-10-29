import {supabase} from '../../config/supabase';
import {conferirArtefatoEnvio,conferirTransicaoEnvio,EstadoEnvioNativo,copiaDiagnosticaAutorizada} from './rateioEnvioNativo.policy';
import {prepararPlanilhaRateio} from './rateioMensal.service';
import {randomUUID} from 'node:crypto';
const preview=()=>String(process.env.SUPABASE_URL).replace(/\/$/,'')==='https://qqhcjieymypowunkixmk.supabase.co';
async function scope(usina:string,empresa:string){
 if(!preview())throw new Error('Fila nativa em validação somente no Preview.');
 const r=await supabase.from('usinas').select('id').eq('empresa_id',empresa).eq('id',usina).maybeSingle();
 if(r.error||!r.data)throw new Error('Acesso indisponível.');
}
export async function configurarFilaNativa(usina:string,empresa:string,usuario:string,body:any){
 await scope(usina,empresa);
 if(typeof body?.habilitado!=='boolean'||body.habilitado&&body.autorizaEnvioAutomatico!==true)throw new Error('Confirme o modo de envio.');
 const competenciaInicio=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).slice(0,7)+'-01';
 const r=await supabase.from('rateio_envio_nativo_config').upsert({empresa_id:empresa,usina_id:usina,usuario_id:usuario,habilitado:body.habilitado,competencia_inicio:competenciaInicio,atualizado_em:new Date().toISOString()});
 if(r.error)throw new Error('Não foi possível salvar a automação.');
 return {habilitado:body.habilitado,competenciaInicio,simulacao:true};
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
 const ready=await supabase.from('rateios_mensais_automaticos').select('id,competencia,resultado').eq('empresa_id',empresa).eq('usina_id',usina).eq('status','GERADO').gte('competencia',c.data.competencia_inicio).order('competencia').limit(12);
 if(ready.error)throw ready.error;
 for(const r of ready.data??[]){
  let artefato;try{artefato=conferirArtefatoEnvio(r.resultado);}catch{continue;}
  const add=await supabase.from('rateio_envios_nativos').upsert({empresa_id:empresa,usina_id:usina,usuario_id:usuario,competencia:r.competencia,registro_rateio_id:r.id,csv_hash:artefato.hash},{onConflict:'empresa_id,usina_id,competencia',ignoreDuplicates:true});
  if(add.error)throw add.error;
 }
 const jobs=await supabase.from('rateio_envios_nativos').select('id,competencia,estado,csv_hash,protocolo,atualizado_em').eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).order('competencia',{ascending:false}).limit(12);
 if(jobs.error)throw jobs.error;
 return {habilitado:true,itens:jobs.data??[]};
}
export async function reivindicarEnvioNativo(usina:string,empresa:string,usuario:string,id:string){
 await scope(usina,empresa);
 const job=await supabase.from('rateio_envios_nativos').select('id').eq('id',id).eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).maybeSingle();
 if(job.error||!job.data)throw new Error('Envio indisponível.');
 const claim=await supabase.rpc('reivindicar_envio_nativo',{p_empresa:empresa,p_usuario:usuario,p_id:id});
 if(claim.error||!claim.data?.[0])throw new Error('Envio já reservado ou encerrado. Não repetir.');
 const row=claim.data[0];
 if(row.artefato_teste&&preview()){
  if(conferirArtefatoEnvio(row.artefato_teste).hash!==row.csv_hash)throw new Error('Cópia de teste divergente.');
  return {id:row.id,leaseId:row.lease_id,hash:row.csv_hash,plano:row.artefato_teste,simulacao:true};
 }
 const r=await supabase.from('rateios_mensais_automaticos').select('resultado').eq('id',row.registro_rateio_id).eq('empresa_id',empresa).eq('usina_id',usina).single();
 if(r.error||conferirArtefatoEnvio(r.data?.resultado).hash!==row.csv_hash)throw new Error('A planilha mudou. Confira o rateio antes de enviar.');
 return {id:row.id,leaseId:row.lease_id,hash:row.csv_hash,plano:r.data.resultado,simulacao:true};
}
export async function prepararTesteFila(usina:string,empresa:string,usuario:string,body:any){
 await scope(usina,empresa);
 if(body?.autorizaCopiaDiagnostica!==true)throw new Error('Confirme a cópia técnica.');
 const original=await prepararPlanilhaRateio(usina,empresa,'2026-10','3006605532','',false,true);
 const copy=copiaDiagnosticaAutorizada(original),artifact=conferirArtefatoEnvio(copy);
 const r=await supabase.from('rateio_envios_nativos').upsert({empresa_id:empresa,usina_id:usina,usuario_id:usuario,competencia:'2026-10-01',registro_rateio_id:randomUUID(),csv_hash:artifact.hash,artefato_teste:copy},{onConflict:'empresa_id,usina_id,competencia',ignoreDuplicates:true});
 if(r.error)throw r.error;
 const saved=await supabase.from('rateio_envios_nativos').select('usuario_id,csv_hash,artefato_teste,estado').eq('empresa_id',empresa).eq('usina_id',usina).eq('competencia','2026-10-01').single();
 if(saved.error||saved.data.usuario_id!==usuario||saved.data.csv_hash!==artifact.hash||!saved.data.artefato_teste)throw new Error('Já existe outro envio nesta competência. Nenhum arquivo foi substituído.');
 if(['AGUARDANDO_USUARIO','FALHA'].includes(saved.data.estado)){
  const retry=await supabase.from('rateio_envios_nativos').update({estado:'PENDENTE',lease_id:null,lease_ate:null,atualizado_em:new Date().toISOString()}).eq('empresa_id',empresa).eq('usina_id',usina).eq('usuario_id',usuario).eq('competencia','2026-10-01').eq('csv_hash',artifact.hash).eq('estado',saved.data.estado).select('id');
  if(retry.error||retry.data?.length!==1)throw new Error('O teste mudou de estado. Atualize a conferência.');
 }
 return {preparado:true,simulacao:true,geradora:artifact.geradora,hash:artifact.hash};
}
export async function atualizarEnvioNativo(usina:string,empresa:string,usuario:string,id:string,body:any){
 await scope(usina,empresa);
 if(!/^[a-f0-9-]{36}$/i.test(body?.leaseId??''))throw new Error('Sessão inválida.');
 const before=await supabase.from('rateio_envios_nativos').select('estado,csv_hash').eq('id',id).eq('empresa_id',empresa).eq('usina_id',usina).eq('usuario_id',usuario).eq('lease_id',body.leaseId).gt('lease_ate',new Date().toISOString()).single();
 if(before.error||before.data.csv_hash!==body.hash)throw new Error('Sessão encerrada ou arquivo divergente.');
 conferirTransicaoEnvio(before.data.estado as EstadoEnvioNativo,body.estado,preview(),body.protocolo);
 const saved=await supabase.from('rateio_envios_nativos').update({estado:body.estado,protocolo:body.estado==='PROTOCOLADO'?body.protocolo:null,atualizado_em:new Date().toISOString()}).eq('id',id).eq('lease_id',body.leaseId).eq('estado',before.data.estado).select('id,estado,protocolo');
 if(saved.error||saved.data?.length!==1)throw new Error('O envio mudou de estado. Não repetir.');
 return saved.data[0];
}
