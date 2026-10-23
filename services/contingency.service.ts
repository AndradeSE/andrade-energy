import axios from 'axios';
import {CONTINGENCY_ENDPOINTS} from '../config/contingency-policy';
import {isPreviewEnvironment} from '../config/environment';
import {obterSessao} from '../storage/session';

export type ContingencyState={control:{executor:'RENDER'|'NETLIFY';revisao:number;commit_validado:string|null};jobs:{nome:string;estado:string}[];requests:unknown[]};
// The control must remain reachable when the primary has exhausted its quota.
async function controlRequest(method:'GET'|'POST',path='',data?:unknown) {
  const session=await obterSessao();
  if(!session?.token)throw new Error('Entre novamente para consultar a contingência.');
  return (await axios.request({method,url:`${CONTINGENCY_ENDPOINTS[isPreviewEnvironment?'preview':'production'].standby}/contingencia${path}`,
    headers:{Authorization:`Bearer ${session.token}`},data,timeout:20_000})).data;
}
export async function readContingency():Promise<ContingencyState>{return controlRequest('GET');}
export async function switchContingency(state:ContingencyState) {
  const executor=state.control.executor==='RENDER'?'NETLIFY':'RENDER';
  return controlRequest('POST','/trocar',{executor,revisao:state.control.revisao,
    confirmacao:executor==='NETLIFY'?'COTA_RENDER_ESGOTADA':'RENDER_RECUPERADO'});
}
