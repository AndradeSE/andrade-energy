import {supabase} from '../../config/supabase';

export class FalhaCadastroAncora extends Error {}
export function validarCadastroAncora(input:any){
 const numero=typeof input?.numero==='string'?input.numero.trim():'';
 const apelido=typeof input?.apelido==='string'?input.apelido.trim():'';
 if(!/^\d{6,20}$/.test(numero))throw new FalhaCadastroAncora('Informe uma UC com 6 a 20 dígitos.');
 if(apelido.length>80||/[\x00-\x1f\x7f]/.test(apelido))throw new FalhaCadastroAncora('Use um apelido de até 80 caracteres, em uma linha.');
 return {numero,apelido};
}

export function criarCadastroAncoras(db:typeof supabase){
 async function conferirUsina(usina:string,empresa:string){
  const r=await db.from('usinas').select('id').eq('id',usina).eq('empresa_id',empresa).maybeSingle();
  if(r.error)throw new Error('Consulta indisponível');
  if(!r.data)throw new FalhaCadastroAncora('Usina não encontrada nesta empresa.');
 }
 function conferirId(id:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new FalhaCadastroAncora('Cadastro de âncora inválido.');}
 function falha(error:any){
  if(error?.code==='23505')throw new FalhaCadastroAncora('Essa UC já está na lista de âncoras.');
  if(error)throw new Error('Cadastro de âncoras indisponível');
 }
 return {
  async listar(usina:string,empresa:string){
   await conferirUsina(usina,empresa);
   const rows:any[]=[];
   for(let inicio=0;inicio<10000;inicio+=1000){
    const r=await db.from('rateio_ucs_ancoras').select('id,numero,apelido').eq('empresa_id',empresa).is('excluido_em',null).order('apelido').order('numero').range(inicio,inicio+999);
    falha(r.error);rows.push(...r.data??[]);if((r.data??[]).length<1000)return rows;
   }
   throw new FalhaCadastroAncora('A lista excede o limite de consulta.');
  },
  async salvar(usina:string,empresa:string,input:any,id?:string){
   const dados=validarCadastroAncora(input);if(id)conferirId(id);
   await conferirUsina(usina,empresa);
   const q=id?db.from('rateio_ucs_ancoras').update({...dados,atualizado_em:new Date().toISOString()}).eq('id',id).eq('empresa_id',empresa).is('excluido_em',null)
    :db.from('rateio_ucs_ancoras').insert({...dados,empresa_id:empresa});
   const r=await q.select('id,numero,apelido').maybeSingle();falha(r.error);
   if(!r.data)throw new FalhaCadastroAncora('Âncora não encontrada nesta empresa.');return r.data;
  },
  async excluir(usina:string,empresa:string,id:string){
   conferirId(id);await conferirUsina(usina,empresa);
   const r=await db.from('rateio_ucs_ancoras').update({excluido_em:new Date().toISOString(),atualizado_em:new Date().toISOString()}).eq('id',id).eq('empresa_id',empresa).is('excluido_em',null).select('id').maybeSingle();
   falha(r.error);if(!r.data)throw new FalhaCadastroAncora('Âncora não encontrada nesta empresa.');
   return {excluido:true};
  },
 };
}
export const cadastroAncoras=criarCadastroAncoras(supabase);
