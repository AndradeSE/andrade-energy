export const CEMIG_PORTAL = "https://www.atendimento.cemig.com.br/portal/services/compensation-gd";
export const CEMIG_SESSION_SECONDS = 600;
export const CEMIG_PREVIEW_DB = "https://qqhcjieymypowunkixmk.supabase.co";

export function exigirPortalNuvemValidado(env:NodeJS.ProcessEnv){
  if(env.CEMIG_CLOUD_PORTAL_VALIDATED!=="true")
    throw new Error("A Cemig ainda não abriu corretamente no navegador em nuvem. Novas simulações estão suspensas para preservar sua cota. Você pode baixar o CSV e anexá-lo manualmente no portal; nenhum protocolo foi enviado.");
}

export function exigirCemigSimulacao(env:NodeJS.ProcessEnv) {
  if(env.CEMIG_CLOUD_ENABLED!=="true" || String(env.SUPABASE_URL).replace(/\/$/,"")!==CEMIG_PREVIEW_DB)
    throw new Error("A integração Cemig em nuvem está disponível somente para simulação no Preview.");
}
export function conferirMinutosGratuitos(valor:unknown) {
  if(typeof valor!=="number"||!Number.isFinite(valor)||valor<0||valor>40)
    throw new Error("Cota gratuita insuficiente ou não confirmada. Nenhum plano será contratado.");
}
export function conferirCsvSimulacao(csv:string,ucGeradora:string) {
  if(!/^\d{6,20}$/.test(ucGeradora)||!csv||Buffer.byteLength(csv)>100_000)throw new Error("CSV inválido.");
  const linhas=csv.replace(/\r?\n$/,"").split(/\r?\n/).map(l=>l.split(";"));
  if(linhas.some(l=>l.length!==4||!/^\d{6,20}$/.test(l[0])||!/^\d{11}$|^\d{14}$/.test(l[1])||!/^\d+(,\d{1,4})?$/.test(l[2])||!["","X"].includes(l[3])))throw new Error("CSV fora do padrão Cemig.");
  const soma=linhas.reduce((s,l)=>s+Math.round(Number(l[2].replace(",","."))*10000),0);
  if(soma!==1_000_000||linhas.filter(l=>l[3]==="X").length!==1||new Set(linhas.map(l=>l[0])).size!==linhas.length)throw new Error("Confira cotas, duplicatas e âncora.");
}
export function urlLivePermitida(valor:unknown) {
  const u=new URL(String(valor));
  if(u.protocol!=="https:"||u.username||u.password||!(u.hostname==="browserbase.com"||u.hostname.endsWith(".browserbase.com")))throw new Error("URL de sessão inválida.");
  return u.toString();
}
