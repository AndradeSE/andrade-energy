export const CEMIG_PORTAL = "https://www.atendimento.cemig.com.br/portal/services/compensation-gd";
export const CEMIG_LOGIN = "https://atende.cemig.com.br/Login";
// Preview test: eight and a half minutes plus thirty seconds reserved for release.
export const CEMIG_SESSION_SECONDS = 510;
export const CEMIG_PREVIEW_DB = "https://qqhcjieymypowunkixmk.supabase.co";
export class CotaBrowserbaseInsuficiente extends Error {}

export function exigirCemigSimulacao(env:NodeJS.ProcessEnv) {
  if(env.CEMIG_CLOUD_ENABLED!=="true" || String(env.SUPABASE_URL).replace(/\/$/,"")!==CEMIG_PREVIEW_DB)
    throw new Error("A integração Cemig em nuvem está disponível somente para simulação no Preview.");
}
export function conferirMinutosGratuitos(valor:unknown) {
  // Reserve the full manual-login window plus release margin before creating a session.
  const maximoUsado=60-Math.ceil((CEMIG_SESSION_SECONDS+30)/60);
  if(typeof valor!=="number"||!Number.isFinite(valor)||valor<0)
    throw new Error("Cota gratuita insuficiente ou não confirmada. Nenhum plano será contratado.");
  if(valor>maximoUsado)throw new CotaBrowserbaseInsuficiente('Cota Browserbase insuficiente para uma sessão completa.');
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

