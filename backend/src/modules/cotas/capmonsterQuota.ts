export async function capmonsterQuota(env:NodeJS.ProcessEnv=process.env,request:typeof fetch=fetch){
 const key=String(env.CAPMONSTER_API_KEY??'').trim();
 const item={servico:'CAPMONSTER',metrica:'saldo_usd',rotulo:'CapMonster · saldo disponível',unidade:'USD',automatico:true,observacao:'Crédito pré-pago em dólares. Não é uma franquia mensal. Consultar o saldo não resolve CAPTCHA nem compra créditos.',leitura:null};
 const now=new Date().toISOString();
 if(!key)return {...item,saldoDisponivel:null,consulta:{status:'SEM_CHAVE',consultado_em:now}};
 try{
  const response=await request('https://api.capmonster.cloud/getBalance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientKey:key}),signal:AbortSignal.timeout(8000)});
  const data=await response.json();
  if(!response.ok||data.errorId!==0||typeof data.balance!=='number'||!Number.isFinite(data.balance)||data.balance<0)throw new Error('Leitura indisponível');
  return {...item,saldoDisponivel:data.balance,consulta:{status:'OK',consultado_em:now}};
 }catch{return {...item,saldoDisponivel:null,consulta:{status:'CONSULTA_INDISPONIVEL',consultado_em:now}};}
}
