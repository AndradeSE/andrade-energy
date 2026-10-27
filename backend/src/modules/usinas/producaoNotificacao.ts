import {criarNotificacaoApp} from '../notificacoes/push.service';
import {destinatarioDoRateio} from './rateioMensal.service';
export async function notificarProducaoImportada(usinaId:string,empresaId:string,nome:string,competencia:string,energia:number){
 const destino=await destinatarioDoRateio(usinaId,empresaId);
 await criarNotificacaoApp({usuario_id:destino.id,empresa_id:empresaId,usina_id:usinaId,tipo:'PRODUCAO_IMPORTADA',titulo:'Produção da usina importada',detalhe:`${nome}: ${energia.toLocaleString('pt-BR')} kWh em ${competencia.slice(0,7).split('-').reverse().join('/')}. A conta de energia foi processada.`,rota:`/operacao/rateio?competencia=${encodeURIComponent(competencia.slice(0,7))}&usinaId=${encodeURIComponent(usinaId)}`,chave_dedupe:`producao:${empresaId}:${usinaId}:${competencia}:${energia}`});
}
