import {criarNotificacaoApp} from '../notificacoes/push.service';
import {supabase} from '../../config/supabase';
export async function notificarProducaoImportada(usinaId:string,empresaId:string,nome:string,competencia:string,energia:number){
 // Both roles already have company-wide operation access. Never select an arbitrary owner.
 const {data,error}=await supabase.from('empresa_usuarios').select('usuario_id').eq('empresa_id',empresaId).eq('ativo',true).in('papel',['ADMIN_EMPRESA','GESTOR']);
 if(error)throw error;
 for(const aviso of avisosProducao((data??[]).map(row=>String(row.usuario_id)),usinaId,empresaId,nome,competencia,energia))await criarNotificacaoApp(aviso);
}
export function avisosProducao(usuarios:string[],usinaId:string,empresaId:string,nome:string,competencia:string,energia:number){
 return [...new Set(usuarios.filter(Boolean))].map(usuario_id=>({usuario_id,empresa_id:empresaId,usina_id:usinaId,tipo:'PRODUCAO_IMPORTADA',titulo:'Produção da usina importada',detalhe:`${nome}: ${energia.toLocaleString('pt-BR')} kWh em ${competencia.slice(0,7).split('-').reverse().join('/')}. A produção foi registrada.`,rota:`/operacao/rateio?competencia=${encodeURIComponent(competencia.slice(0,7))}&usinaId=${encodeURIComponent(usinaId)}`,chave_dedupe:`producao:${empresaId}:${usinaId}:${competencia}:${energia}:${usuario_id}`}));
}
