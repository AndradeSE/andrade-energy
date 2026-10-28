import {supabase} from '../../config/supabase';
import {exigirCemigSimulacao} from './cemigCloud.policy';
import {cifrarAcessoCemig,abrirAcessoCemig,validarAcessoCemig} from './cemigCredential.crypto';
async function escopo(usina:string,empresa:string){
 exigirCemigSimulacao(process.env);
 const r=await supabase.from('usinas').select('id').eq('id',usina).eq('empresa_id',empresa).maybeSingle();
 if(r.error||!r.data)throw new Error('Acesso indisponível.');
}
export async function statusAcessoCemig(usina:string,empresa:string,usuario:string){
 await escopo(usina,empresa);
 const r=await supabase.from('cemig_credenciais_preview').select('atualizado_em').eq('empresa_id',empresa).eq('usuario_id',usuario).maybeSingle();
 if(r.error)throw new Error('Cofre indisponível.');
 return {configurado:Boolean(r.data),atualizadoEm:r.data?.atualizado_em??null};
}
export async function salvarAcessoCemig(usina:string,empresa:string,usuario:string,body:any){
 await escopo(usina,empresa);
 if(body?.autorizaArmazenamento!==true)throw new Error('Autorize o armazenamento protegido.');
 const acesso=validarAcessoCemig(body.login,body.senha);
 const r=await supabase.from('cemig_credenciais_preview').upsert({empresa_id:empresa,usuario_id:usuario,
  acesso_cifrado:cifrarAcessoCemig(acesso,empresa,usuario),atualizado_em:new Date().toISOString()});
 if(r.error)throw new Error('Não foi possível salvar o acesso da Cemig.');
 return {configurado:true};
}
export async function excluirAcessoCemig(usina:string,empresa:string,usuario:string){
 await escopo(usina,empresa);
 // Prevent a queued login from using a credential after removal was requested.
 const cancel=await supabase.from('cemig_simulacoes').update({login_estado:'CANCELADO'}).eq('empresa_id',empresa).eq('usuario_id',usuario).in('login_estado',['FILA','ENVIANDO']);
 if(cancel.error)throw new Error('Não foi possível interromper o login pendente.');
 const r=await supabase.from('cemig_credenciais_preview').delete().eq('empresa_id',empresa).eq('usuario_id',usuario);
 if(r.error)throw new Error('Não foi possível remover o acesso.');
 return {configurado:false};
}
/** Worker-only read; never exported through a GET endpoint or assistant tool. */
export async function lerAcessoCemig(empresa:string,usuario:string){
 exigirCemigSimulacao(process.env);
 return abrirRegistro(empresa,usuario);
}
/** Native pilot shares the vault without enabling the cloud browser executor. */
export async function lerAcessoCemigNativo(usina:string,empresa:string,usuario:string){
 if(String(process.env.SUPABASE_URL).replace(/\/$/,'')!=='https://qqhcjieymypowunkixmk.supabase.co')throw new Error('Acesso nativo ainda não habilitado neste ambiente.');
 const plant=await supabase.from('usinas').select('id').eq('id',usina).eq('empresa_id',empresa).maybeSingle();
 if(plant.error||!plant.data)throw new Error('Acesso indisponível.');
 return abrirRegistro(empresa,usuario);
}
async function abrirRegistro(empresa:string,usuario:string){
 const r=await supabase.from('cemig_credenciais_preview').select('acesso_cifrado').eq('empresa_id',empresa).eq('usuario_id',usuario).maybeSingle();
 if(r.error||!r.data)throw new Error('Acesso da Cemig não cadastrado.');
 return abrirAcessoCemig(r.data.acesso_cifrado,empresa,usuario);
}
