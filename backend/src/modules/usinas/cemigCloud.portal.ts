import type {Page} from "playwright-core";
import {CEMIG_PORTAL,conferirCsvSimulacao} from "./cemigCloud.policy";

/** Login can open a second tab. Never continue against the stale login tab. */
export function paginaPortalCemig(pages:Page[],atual:Page):Page {
  const candidatas=pages.filter(p=>{
    try { const u=new URL(p.url());return u.origin===new URL(CEMIG_PORTAL).origin&&u.pathname.startsWith('/portal/'); }
    catch{return false;}
  });
  return candidatas.find(p=>new URL(p.url()).pathname===new URL(CEMIG_PORTAL).pathname)
    ??candidatas.at(-1)??atual;
}

const etapas = {
  LOGIN: 'confirmar o login',
  SERVICO: 'abrir o serviço de compensação',
  USINA: 'selecionar a UC geradora',
  MODALIDADE: 'confirmar a modalidade',
  ANEXO: 'anexar o CSV',
  REVISAO: 'conferir a revisão do anexo',
} as const;
export class FalhaEtapaCemig extends Error {
  constructor(public readonly etapa: keyof typeof etapas) {
    super(`Não foi possível ${etapas[etapa]}. Nenhum protocolo foi solicitado.`);
  }
}

export class AcaoManualCemig extends Error {
  constructor(public readonly tipo:'LOGIN'|'VERIFICACAO'|'SERVICO') {
    super(tipo==='LOGIN'?'Conclua o login na mesma sessão em nuvem e depois toque em continuar. Nenhum protocolo foi solicitado.':
      tipo==='SERVICO'?'O login foi preservado. Abra Compensação de Geração Distribuída na mesma sessão, até a seleção da UC geradora, e depois toque em continuar. Nenhum arquivo foi enviado nesta etapa e nenhum protocolo foi solicitado.':
      'A Cemig pediu uma verificação de segurança. Conclua-a manualmente na mesma sessão em nuvem e depois toque em continuar. Nenhuma tarefa CAPTCHA foi enviada.');
  }
}
async function conferirAcaoManual(page:Page) {
  const url=new URL(page.url());
  if(!['https://www.atendimento.cemig.com.br','https://atende.cemig.com.br'].includes(url.origin))return;
  if(/\/(?:login|auth)(?:\/|$)/i.test(url.pathname))throw new AcaoManualCemig('LOGIN');
  const challenge=page.getByText(/Verify you are human|Performing security verification|Verifique se você é humano|Verificação de segurança/i).first();
  if(await challenge.isVisible())throw new AcaoManualCemig('VERIFICACAO');
}

/** The portal's cookie overlay intercepts the service action until dismissed. */
export async function fecharAvisoCookiesCemig(page:Page) {
  if(new URL(page.url()).origin!==new URL(CEMIG_PORTAL).origin)return;
  const rejeitar=page.getByRole('button',{name:/^(Reject All|Rejeitar todos|Rejeitar tudo)$/i}).first();
  if(await rejeitar.isVisible())await rejeitar.click({timeout:5000});
}

/** Somente simulação: esta função nunca aceita declaração nem solicita cadastro. */
export async function validarAnexoCemig(page:Page,uc:string,csv:string,arquivo:string) {
  conferirCsvSimulacao(csv,uc);
  let etapa: keyof typeof etapas = 'LOGIN';
  try {
  const url=new URL(page.url());
  if(url.origin==='https://atende.cemig.com.br' && /\/login(?:\/|$)/i.test(url.pathname))throw new AcaoManualCemig('LOGIN');
  if(url.origin!==new URL(CEMIG_PORTAL).origin)throw new Error("Faça o login manual no Cemig Atende.");
  await conferirAcaoManual(page);
  etapa='SERVICO';
  if(url.pathname.replace(/\/$/,'')!==new URL(CEMIG_PORTAL).pathname) {
    await page.goto(CEMIG_PORTAL,{waitUntil:"domcontentloaded",timeout:45000});
    await conferirAcaoManual(page);
  }
  await fecharAvisoCookiesCemig(page);
  // The user may already have opened the service in the preserved session.
  // Do not click the landing-page action again when UC selection is visible.
  const selecao=page.getByRole("button").filter({hasText:/Nº da unidade consumidora:/});
  if(!await selecao.first().isVisible())
    await page.getByRole("button",{name:"Realizar cadastro",exact:true}).click({timeout:15000});
  etapa='USINA';
  const opcoes=page.getByRole("button").filter({hasText:/Nº da unidade consumidora:/});
  await opcoes.first().waitFor({state:'visible',timeout:15000});
  let escolhida=false;
  for(let i=0;i<await opcoes.count();i++){
    const texto=await opcoes.nth(i).innerText();
    const numero=texto.match(/Nº da unidade consumidora:\s*([\d.\-]+)/i)?.[1]?.replace(/\D/g,"");
    if(numero===uc){await opcoes.nth(i).click();escolhida=true;break;}
  }
  if(!escolhida)throw new Error("A UC geradora não foi localizada nesta sessão Cemig.");
  await page.getByRole("button",{name:"Avançar",exact:true}).click();
  etapa='MODALIDADE';
  await page.getByRole("combobox",{name:/Selecione o tipo de modalidade/}).waitFor({timeout:15000});
  if(!/Autoconsumo remoto/.test(await page.getByRole("combobox",{name:/Selecione o tipo de modalidade/}).innerText()))throw new Error("Modalidade diferente da simulação autorizada.");
  await page.getByRole("button",{name:"Avançar",exact:true}).click();
  etapa='ANEXO';
  await page.getByRole("tab",{name:"Inserir por anexo",exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({name:arquivo,mimeType:"text/csv",buffer:Buffer.from(csv,"utf8")});
  await page.getByText(arquivo,{exact:true}).waitFor({timeout:15000});
  etapa='REVISAO';
  await page.getByRole("button",{name:"Avançar",exact:true}).click();
  await page.getByRole("heading",{name:"Revise e confirme as informações para realizar cadastro",exact:true}).waitFor({timeout:20000});
  const geradora=await page.locator("#document").inputValue();
  if(geradora.replace(/\D/g,"")!==uc)throw new Error("A UC mudou durante a revisão.");
  await page.getByText(arquivo,{exact:true}).waitFor();
  return {estado:"REVISAO_SEM_PROTOCOLO" as const,protocolo:null};
  } catch(error) {
    if(error instanceof AcaoManualCemig)throw error;
    try {await conferirAcaoManual(page);}catch(check){if(check instanceof AcaoManualCemig)throw check;}
    // A navigation/landing-page failure precedes any upload. Keep authentication
    // alive for a deliberate manual continuation; never retry the login/CAPTCHA.
    if(etapa==='SERVICO'&&new URL(page.url()).origin===new URL(CEMIG_PORTAL).origin)
      throw new AcaoManualCemig('SERVICO');
    // Never persist the raw Playwright error: it can include page/customer data.
    throw new FalhaEtapaCemig(etapa);
  }
}

export async function bloquearProtocoloNaSimulacao(page:Page){
  await page.addInitScript(()=>{
    const bloquear=(e:Event)=>{
      const alvo=e.target as HTMLElement|null;
      const botao=alvo?.closest('button');
      const final=botao&&/^Solicitar cadastro$/i.test(botao.textContent?.trim()??"");
      const envio=e.type==='submit'&&Array.from(document.querySelectorAll('button')).some(b=>/^Solicitar cadastro$/i.test(b.textContent?.trim()??""));
      if(final||envio){e.preventDefault();e.stopImmediatePropagation();}
    };
    document.addEventListener('click',bloquear,true);
    document.addEventListener('submit',bloquear,true);
  });
}
