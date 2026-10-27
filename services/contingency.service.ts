import axios from 'axios';
import {readContingencyControlSource} from '../config/contingency-policy';
import {isPreviewEnvironment} from '../config/environment';
import {obterSessao} from '../storage/session';

export type ContingencyState={control:{executor:'RENDER'|'NETLIFY'|'RENDER_RESERVA';reserva_preferida?:'NETLIFY'|'RENDER_RESERVA';revisao:number;commit_validado:string|null};jobs:{nome:string;estado:string}[];requests:unknown[];automation?:{ativa:boolean;configurada:boolean;ultimo_estado:string|null;ultima_consulta:string|null;ultimo_resultado:string|null}};
// The control must remain reachable when the primary has exhausted its quota.
async function controlRequest(method:'GET'|'POST',path='',data?:unknown) {
  const session=await obterSessao();
  if(!session?.token)throw new Error('Entre novamente para consultar a contingência.');
  const {baseURL}=await readContingencyControlSource(isPreviewEnvironment?'preview':'production');
  return (await axios.request({method,url:`${baseURL}/contingencia${path}`,
    headers:{Authorization:`Bearer ${session.token}`},data,timeout:20_000})).data;
}
export async function readContingency():Promise<ContingencyState>{return controlRequest('GET');}
export async function setContingencyAutomation(ativa:boolean) {return controlRequest('POST','/automacao',{ativa,confirmacao:ativa?'AUTOMATIZAR_BILLING':'DESATIVAR_AUTOMACAO'});}
export async function switchContingency(state:ContingencyState) {
  const executor=state.control.executor==='RENDER'?(state.control.reserva_preferida??'NETLIFY'):'RENDER';
  return controlRequest('POST','/trocar',{executor,revisao:state.control.revisao,
    confirmacao:executor!=='RENDER'?'COTA_RENDER_ESGOTADA':'RENDER_RECUPERADO'});
}
