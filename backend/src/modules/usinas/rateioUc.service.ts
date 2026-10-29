import {supabase} from '../../config/supabase';
import {contratoElegivelParaRateio} from './rateioAutomatico.policy';
export async function obterRateioUc(empresa:string,id:string){
 const uc=await supabase.from('unidades_consumidoras').select('id,numero,rateio_ativo').eq('empresa_id',empresa).eq('id',id).maybeSingle();
 if(uc.error)throw uc.error;if(!uc.data)throw new Error('UC não encontrada.');
 const bloqueio=await supabase.from('uc_bloqueios_inadimplencia').select('suspenso').eq('empresa_id',empresa).eq('unidade_consumidora_id',id).maybeSingle();
 if(bloqueio.error)throw bloqueio.error;
 const contratos=await supabase.from('contratos').select('status,aceite_cliente_em,contrato_assinado_url,dados_documento').eq('empresa_id',empresa).eq('unidade_consumidora_id',id).in('status',['ATIVO','VIGENTE']);
 if(contratos.error)throw contratos.error;
 const contratoVigente=(contratos.data??[]).some(contratoElegivelParaRateio);
 return {ativo:uc.data.rateio_ativo!==false&&contratoVigente,contratoVigente,suspensoInadimplencia:bloqueio.data?.suspenso===true};
}
export async function salvarRateioUc(empresa:string,id:string,ativo:unknown){
 if(typeof ativo!=='boolean')throw new Error('Informe se o rateio deve ficar ativo.');
 const atual=await obterRateioUc(empresa,id);
 if(ativo&&!atual.contratoVigente)throw new Error('É necessário um contrato vigente para ativar o rateio.');
 const result=await supabase.from('unidades_consumidoras').update({rateio_ativo:ativo}).eq('empresa_id',empresa).eq('id',id).select('id').single();
 if(result.error)throw result.error;
 return obterRateioUc(empresa,id);
}
