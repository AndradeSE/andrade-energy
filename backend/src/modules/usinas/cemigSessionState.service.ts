import type {BrowserContext} from 'playwright-core';
import {supabase} from '../../config/supabase';
import {exigirCemigSimulacao} from './cemigCloud.policy';
import {abrirSessaoCemig,cifrarSessaoCemig,restaurarEstadoCemig} from './cemigSessionState';

async function versaoAcesso(empresa:string,usuario:string){
 const r=await supabase.from('cemig_credenciais_preview').select('atualizado_em').eq('empresa_id',empresa).eq('usuario_id',usuario).maybeSingle();
 if(r.error)throw new Error('Não foi possível conferir o acesso salvo.');
 return r.data?.atualizado_em as string|undefined;
}
export async function restaurarSessaoSalvaCemig(context:BrowserContext,empresa:string,usuario:string){
 exigirCemigSimulacao(process.env);
 const versao=await versaoAcesso(empresa,usuario);if(!versao)return false;
 await supabase.from('cemig_sessoes_salvas_preview').delete().eq('empresa_id',empresa).eq('usuario_id',usuario).lte('expira_em',new Date().toISOString());
 const r=await supabase.from('cemig_sessoes_salvas_preview').select('estado_cifrado,versao_acesso').eq('empresa_id',empresa).eq('usuario_id',usuario)
  .gt('expira_em',new Date().toISOString()).maybeSingle();
 if(r.error)throw new Error('Não foi possível consultar a sessão salva.');
 if(!r.data||r.data.versao_acesso!==versao)return false;
 await restaurarEstadoCemig(context,abrirSessaoCemig(r.data.estado_cifrado,empresa,usuario,versao));
 return true;
}
export async function salvarSessaoCemig(context:BrowserContext,empresa:string,usuario:string){
 exigirCemigSimulacao(process.env);
 const versao=await versaoAcesso(empresa,usuario);if(!versao)return;
 const estado_cifrado=cifrarSessaoCemig(await context.storageState(),empresa,usuario,versao);
 const r=await supabase.from('cemig_sessoes_salvas_preview').upsert({empresa_id:empresa,usuario_id:usuario,versao_acesso:versao,
  estado_cifrado,expira_em:new Date(Date.now()+86400000).toISOString()});
 if(r.error)throw new Error('Não foi possível preservar a sessão.');
}
