import {supabase} from '../../config/supabase';
import {abrirAcessoCemig,cifrarAcessoCemig,validarAcessoCemig} from './cemigCredential.crypto';

const defaults={db:supabase};
// Every operation checks the tenant and plant before touching a user's vault.
export async function escopoCofreNativo(usina:string,empresa:string,deps=defaults){
 const r=await deps.db.from('usinas').select('id').eq('id',usina).eq('empresa_id',empresa).maybeSingle();
 if(r.error||!r.data)throw new Error('Acesso indisponível.');
}
export async function statusCofreNativo(usina:string,empresa:string,usuario:string){
 await escopoCofreNativo(usina,empresa);
 const r=await supabase.from('cemig_credenciais_nativas').select('atualizado_em').eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).maybeSingle();
 if(r.error)throw new Error('Cofre indisponível.');
 return {configurado:!!r.data,atualizadoEm:r.data?.atualizado_em??null};
}
export async function salvarCofreNativo(usina:string,empresa:string,usuario:string,body:any){
 await escopoCofreNativo(usina,empresa);
 if(body?.autorizaArmazenamento!==true)throw new Error('Autorize o armazenamento protegido.');
 const acesso=validarAcessoCemig(body.login,body.senha);
 const r=await supabase.from('cemig_credenciais_nativas').upsert({empresa_id:empresa,usuario_id:usuario,usina_id:usina,acesso_cifrado:cifrarAcessoCemig(acesso,empresa,`${usuario}:${usina}`),atualizado_em:new Date().toISOString()},{onConflict:'empresa_id,usuario_id,usina_id'});
 if(r.error)throw new Error('Não foi possível salvar o acesso.');
 return {configurado:true};
}
export async function removerCofreNativo(usina:string,empresa:string,usuario:string){
 await escopoCofreNativo(usina,empresa);
 const r=await supabase.from('cemig_credenciais_nativas').delete().eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina);
 if(r.error)throw new Error('Não foi possível remover o acesso.');
 return {configurado:false};
}
export async function lerCofreNativo(usina:string,empresa:string,usuario:string){
 await escopoCofreNativo(usina,empresa);
 const r=await supabase.from('cemig_credenciais_nativas').select('acesso_cifrado').eq('empresa_id',empresa).eq('usuario_id',usuario).eq('usina_id',usina).maybeSingle();
 if(r.error||!r.data)throw new Error('Acesso da Cemig não cadastrado.');
 return abrirAcessoCemig(r.data.acesso_cifrado,empresa,`${usuario}:${usina}`);
}
