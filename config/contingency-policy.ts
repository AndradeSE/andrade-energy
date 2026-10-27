export const CONTINGENCY_ENDPOINTS = {
  preview: { primary: "https://andrade-energy-api-homologacao.onrender.com/api", standby: "https://andrade-energy-api-reserva-preview.onrender.com/api", netlify: "https://andrade-energy-fallback-probe.netlify.app/api" },
  production: { primary: "https://andrade-energy-api-vda.onrender.com/api", standby: "https://andrade-energy-api-reserva-producao.onrender.com/api", netlify: "https://andrade-energy-api-reserva.netlify.app/api" },
} as const;
type Environment=keyof typeof CONTINGENCY_ENDPOINTS;

/** Only metadata GETs may try another control server; never a business request. */
export async function readContingencyControlSource(environment:Environment,request:typeof fetch=fetch) {
  const endpoints=CONTINGENCY_ENDPOINTS[environment];
  const reads=[
    {url:`${endpoints.netlify.replace(/\/api$/, '')}/contingency/runtime`,timeout:12_000},
    {url:`${endpoints.standby.replace(/\/api$/, '')}/api/contingencia/estado`,timeout:70_000},
  ].map(async({url,timeout})=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
    try {
      const response=await request(url,{signal:controller.signal,cache:'no-store',redirect:'error'});
      if(!response.ok)throw new Error('Controle indisponível.');
      const body=await response.json();
      resolveContingencyTarget(environment,body);
      return {body,baseURL:url.includes('/contingency/runtime') ? endpoints.netlify : endpoints.standby};
    }finally{clearTimeout(timer);}
  });
  // Both sources read the same transactional owner. Accept the first valid answer.
  return new Promise<{body:any;baseURL:string}>((resolve,reject)=>{
    let failures=0;
    for(const read of reads)read.then(resolve,()=>{if(++failures===reads.length)reject(new Error('Controles indisponíveis.'));});
  });
}
export async function readContingencyControl(environment:Environment,request:typeof fetch=fetch) {
  return (await readContingencyControlSource(environment,request)).body;
}

export function resolveContingencyTarget(environment:Environment, value:unknown) {
  const body=value as {environment?:unknown;executor?:unknown;revision?:unknown;contingency?:{readyForFailover?:unknown}}|null;
  const endpoints=CONTINGENCY_ENDPOINTS[environment];
  if(!body || body.environment!==environment || !Number.isSafeInteger(body.revision) || Number(body.revision)<1) {
    throw new Error("Configuração de contingência inválida.");
  }
  if(body.executor==="RENDER") return endpoints.primary;
  if(body.executor==="NETLIFY" && body.contingency?.readyForFailover===true)
    return endpoints.netlify;
  if(body.executor==="RENDER_RESERVA" && body.contingency?.readyForFailover===true)
    return endpoints.standby;
  throw new Error("Reserva em conferência.");
}

/** Resolve BEFORE the operation; never replay a business request after a timeout. */
export function createContingencyResolver(environment:Environment, read:()=>Promise<unknown>,now=Date.now) {
  let cached: string=CONTINGENCY_ENDPOINTS[environment].primary;
  let validUntil=0;
  let pending:Promise<string>|undefined;
  const resolve=async()=>{
    if(now()<validUntil) return cached;
    if(!pending) pending=(async()=>{
      try {
        cached=resolveContingencyTarget(environment,await read());
        validUntil=now()+60_000;
        return cached;
      } catch {
        // Keep the last confirmed owner, rather than switch based on an outage.
        validUntil=now()+5_000;
        return cached;
      } finally {pending=undefined;}
    })();
    return pending;
  };
  return Object.assign(resolve,{invalidate:()=>{validUntil=0;}});
}
