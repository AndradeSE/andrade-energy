import {supabase} from '../../config/supabase';
import {criptografarDado,descriptografarDado} from '../../utils/sensitiveData';
import {prepararPlanilhaRateio} from './rateioMensal.service';
import {CEMIG_PORTAL,exigirCemigSimulacao,conferirCsvSimulacao} from './cemigCloud.policy';
import {criarBrowserbaseSimulacao,encerrarBrowserbase,liveBrowserbase} from './cemigCloud.browserbase';
import {bloquearProtocoloNaSimulacao,validarAnexoCemig,FalhaEtapaCemig} from './cemigCloud.portal';
import {chromium,type Browser} from 'playwright-core';

const ativos=['FILA','INICIANDO','AGUARDANDO_LOGIN','VALIDANDO'];
const worker='https://andrade-energy-fallback-probe.netlify.app/.netlify/functions/cemig-background';
function segredo(){const s=process.env.CONTINGENCY_WORKER_SECRET;if(!s||s.length<32)throw new Error('Worker de simulação não configurado.');return s;}
function decifrar(valor:string){if(!valor?.startsWith('v1.'))throw new Error('Dados de sessão inválidos.');return descriptografarDado(valor);}
async function atualizar(id:string,patch:object){const r=await supabase.from('cemig_simulacoes').update(patch).eq('id',id);if(r.error)throw new Error('Não foi possível atualizar a simulação.');}

export async function iniciarCemigSimulacao(usinaId:string,empresaId:string,usuarioId:string,body:any){
 exigirCemigSimulacao(process.env);
 if(body?.autorizaNavegadorNuvem!==true||body?.numerosAtuaisConfirmados!==true)throw new Error('Confirme os números e o uso do navegador em nuvem para esta simulação.');
 const u=await supabase.from('usinas').select('numero_instalacao').eq('id',usinaId).eq('empresa_id',empresaId).maybeSingle();
 if(u.error||!u.data)throw new Error('Usina não encontrada.');
 const uc=String(u.data.numero_instalacao??'').replace(/\D/g,'');
 const plano=await prepararPlanilhaRateio(usinaId,empresaId,String(body.competencia??''),String(body.ucAncora||uc),'',true,true);
 conferirCsvSimulacao(plano.csv,uc);
 const r=await supabase.rpc('reservar_cemig_simulacao',{p_empresa:empresaId,p_usina:usinaId,p_usuario:usuarioId,p_competencia:plano.competencia,p_uc:uc,p_arquivo:plano.arquivo,p_csv:criptografarDado(plano.csv)});
 if(r.error||typeof r.data!=='string')throw new Error('Não foi possível reservar a simulação. Confira se há outra ativa ou se o limite mensal foi atingido.');
 const id=r.data;
 // A Netlify lê esta fila a cada minuto. Nenhuma credencial do navegador
 // ou segredo do worker precisa ser copiado para o Render.
 return {id,estado:'FILA',protocolo:null};
}

export async function consultarCemigSimulacao(id:string,usinaId:string,empresaId:string,usuarioId:string,acao?:'continuar'|'cancelar'){
 exigirCemigSimulacao(process.env);
 const r=await supabase.from('cemig_simulacoes').select('id,estado,erro,expira_em,live_cifrado').eq('id',id).eq('usina_id',usinaId).eq('empresa_id',empresaId).eq('usuario_id',usuarioId).maybeSingle();
 if(r.error||!r.data)throw new Error('Simulação não encontrada para este acesso.');
 const row=r.data;
 if(Date.parse(row.expira_em)<=Date.now()&&ativos.includes(row.estado)){
  await supabase.from('cemig_simulacoes').update({estado:'EXPIRADO',csv_cifrado:null,live_cifrado:null}).eq('id',id).in('estado',ativos);
  row.estado='EXPIRADO';row.live_cifrado=null;
 }
 if(acao==='continuar'&&row.estado==='AGUARDANDO_LOGIN'){
  const t=await supabase.from('cemig_simulacoes').update({continuar:true}).eq('id',id).eq('estado','AGUARDANDO_LOGIN');if(t.error)throw new Error('Não foi possível continuar.');
 }
 if(acao==='cancelar'&&ativos.includes(row.estado)){
  await supabase.from('cemig_simulacoes').update({estado:'CANCELADO',csv_cifrado:null,live_cifrado:null}).eq('id',id).in('estado',ativos);
  row.estado='CANCELADO';row.live_cifrado=null;
 }
 return {id:row.id,estado:row.estado,erro:row.erro,expiraEm:row.expira_em,liveUrl:row.live_cifrado&&Date.parse(row.expira_em)>Date.now()?decifrar(row.live_cifrado):null,protocolo:null};
}

/** Background worker: a conditional claim makes Netlify retries harmless. */
export async function executarCemigSimulacao(id:string){
 exigirCemigSimulacao(process.env);
 const claim=await supabase.from('cemig_simulacoes').update({estado:'INICIANDO'}).eq('id',id).eq('estado','FILA').gt('expira_em',new Date().toISOString()).select('*').maybeSingle();
 if(claim.error)throw new Error('Fila indisponível.');if(!claim.data)return;
 const job=claim.data;let sessionId:string|undefined;let browser:Browser|undefined;
 const prazo=Math.min(Date.parse(job.expira_em)-15000,Date.now()+570000);
 try{
  const csv=decifrar(job.csv_cifrado);conferirCsvSimulacao(csv,job.uc_geradora);
  const session=await criarBrowserbaseSimulacao();sessionId=session.id;
  browser=await chromium.connectOverCDP(session.connectUrl,{timeout:30000});
  const context=browser.contexts()[0];if(!context)throw new Error('Contexto não disponível');
  const page=context.pages()[0]??await context.newPage();
  await bloquearProtocoloNaSimulacao(page);
  await page.goto(CEMIG_PORTAL,{waitUntil:'domcontentloaded',timeout:45000});
  const live=await liveBrowserbase(session.id,page.url());
  const pronto=await supabase.from('cemig_simulacoes').update({estado:'AGUARDANDO_LOGIN',sessao_id:session.id,live_cifrado:criptografarDado(live)}).eq('id',id).eq('estado','INICIANDO').select('id').maybeSingle();
  if(pronto.error||!pronto.data)return;
  while(Date.now()<prazo){
   const r=await supabase.from('cemig_simulacoes').select('estado,continuar').eq('id',id).single();
   if(r.error)throw new Error('Consulta indisponível');
   if(!ativos.includes(r.data.estado))return;
   if(r.data.continuar){
    const v=await supabase.from('cemig_simulacoes').update({estado:'VALIDANDO'}).eq('id',id).eq('estado','AGUARDANDO_LOGIN').select('id').maybeSingle();
    if(v.error||!v.data)return;
    await validarAnexoCemig(page,job.uc_geradora,csv,job.arquivo);
    await supabase.from('cemig_simulacoes').update({estado:'REVISAO_SEM_PROTOCOLO',csv_cifrado:null,live_cifrado:null}).eq('id',id).eq('estado','VALIDANDO');
    return;
   }
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
  await supabase.from('cemig_simulacoes').update({estado:'EXPIRADO',csv_cifrado:null,live_cifrado:null}).eq('id',id).in('estado',ativos);
 }catch(error){
  // Provider/Playwright errors may contain credentials, DOM or customer data.
  const mensagem=error instanceof FalhaEtapaCemig ? error.message : 'A simulação não chegou à revisão. Nenhum protocolo foi solicitado. Confira o login e a cota.';
  await supabase.from('cemig_simulacoes').update({estado:'ERRO',erro:mensagem,csv_cifrado:null,live_cifrado:null}).eq('id',id).in('estado',ativos);
 }finally{
  if(sessionId)await encerrarBrowserbase(sessionId).catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
 }
}
