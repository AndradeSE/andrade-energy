import {parseControlCommand,visibleSolarControls} from './assistant-controls';
import {resolveSafeNavigation,type SafeNavigationContext} from './assistant-safe-navigation';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function parseSolarSequence(text:string){
 const steps=text.trim().split(/\s*;\s*|\s+(?:e depois|depois|em seguida)\s+/i).filter(Boolean);
 return steps.length>1?steps:undefined;
}
export async function executeSolarSequence(text:string,io:{context:SafeNavigationContext;scope:string;current:()=>boolean;navigate:(route:string,params?:Record<string,string>)=>void;routeReady:(route:string)=>boolean;control:(step:string)=>Promise<string|undefined>;pause?:(ms:number)=>Promise<void>}){
 const steps=parseSolarSequence(text);
 if(!steps)return undefined;
 if(steps.length>12||text.length>1800)return 'Divida o pedido em até 12 etapas por sequência.';
 // Valida o plano inteiro antes de abrir a primeira tela.
 const plan=steps.map(step=>({step,command:parseControlCommand(step),navigation:resolveSafeNavigation(step,io.context)}));
 if(plan.some(p=>!p.command&&!p.navigation?.action))return 'Uma etapa não corresponde a uma navegação ou controle permitido. Informe cada etapa com abrir, buscar, preencher ou clicar, separadas por “depois”.';
 const pause=io.pause??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 const wait=async(ready:()=>boolean)=>{for(let i=0;i<80;i++){if(!io.current())return false;if(ready())return true;await pause(100);}return false;};
 let completed=0;
 for(const p of plan){
  if(!io.current())return `Sequência interrompida: o acesso ou ambiente mudou. ${completed} etapas concluídas.`;
  if(p.navigation?.action&&!p.command){
   const a=p.navigation.action;io.navigate(a.route,a.params);
   if(!await wait(()=>io.routeReady(a.route)))return `Parei na etapa ${completed+1}: a tela não confirmou a abertura. Não repeti nenhuma operação.`;
  }else if(p.command){
   const command=p.command;
   const ready=()=>visibleSolarControls(io.scope).filter(c=>c.kind===command.kind&&norm(c.label)===norm(command.label)).length===1;
   if(!await wait(ready))return `Parei na etapa ${completed+1}: o controle “${command.label}” não está disponível ou é ambíguo. Não repeti nenhuma operação.`;
   const result=await io.control(p.step);
   if(!result||! /^(Preenchi|Acionei)\b/.test(result))return `Parei na etapa ${completed+1}: ${result??'controle indisponível'}`;
  }
  completed++;
 }
 return `Concluí ${completed} etapas de navegação e comandos. Confira os resultados na tela; botões acionados não comprovam emissão, pagamento ou protocolo.`;
}
