import type {Page} from "playwright-core";
import {CEMIG_PORTAL,conferirCsvSimulacao} from "./cemigCloud.policy";

/** Somente simulação: esta função nunca aceita declaração nem solicita cadastro. */
export async function validarAnexoCemig(page:Page,uc:string,csv:string,arquivo:string) {
  conferirCsvSimulacao(csv,uc);
  const url=new URL(page.url());
  if(url.origin!==new URL(CEMIG_PORTAL).origin)throw new Error("Faça o login manual no Cemig Atende.");
  await page.goto(CEMIG_PORTAL,{waitUntil:"domcontentloaded",timeout:45000});
  await page.getByRole("button",{name:"Realizar cadastro",exact:true}).click({timeout:15000});
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
  await page.getByRole("combobox",{name:/Selecione o tipo de modalidade/}).waitFor({timeout:15000});
  if(!/Autoconsumo remoto/.test(await page.getByRole("combobox",{name:/Selecione o tipo de modalidade/}).innerText()))throw new Error("Modalidade diferente da simulação autorizada.");
  await page.getByRole("button",{name:"Avançar",exact:true}).click();
  await page.getByRole("tab",{name:"Inserir por anexo",exact:true}).click();
  await page.locator('input[type="file"]').setInputFiles({name:arquivo,mimeType:"text/csv",buffer:Buffer.from(csv,"utf8")});
  await page.getByText(arquivo,{exact:true}).waitFor({timeout:15000});
  await page.getByRole("button",{name:"Avançar",exact:true}).click();
  await page.getByRole("heading",{name:"Revise e confirme as informações para realizar cadastro",exact:true}).waitFor({timeout:20000});
  const geradora=await page.locator("#document").inputValue();
  if(geradora.replace(/\D/g,"")!==uc)throw new Error("A UC mudou durante a revisão.");
  await page.getByText(arquivo,{exact:true}).waitFor();
  return {estado:"REVISAO_SEM_PROTOCOLO" as const,protocolo:null};
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
