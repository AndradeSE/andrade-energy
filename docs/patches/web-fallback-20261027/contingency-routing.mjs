const ENDPOINTS = {
 preview: { primary:'https://andrade-energy-api-homologacao.onrender.com', reserve:'https://andrade-energy-api-reserva-preview.onrender.com', netlify:'https://andrade-energy-fallback-probe.netlify.app' },
 production: { primary:'https://andrade-energy-api-vda.onrender.com', reserve:'https://andrade-energy-api-reserva-producao.onrender.com', netlify:'https://andrade-energy-api-reserva.netlify.app' },
};
export function createWebContingencyResolver(request=fetch, now=Date.now) {
 const cache=new Map(), pending=new Map();
 return async function resolve(primary) {
  const environment=Object.keys(ENDPOINTS).find(key=>ENDPOINTS[key].primary===primary);
  if(!environment)throw Error('Origem não autorizada.');
  const endpoints=ENDPOINTS[environment]; const previous=cache.get(environment);
  if(previous && previous.until>now())return previous.target;
  if(!pending.has(environment)) {
   const task=(async()=>{
    const controllers=[];
    try {
     const target=await Promise.any([['netlify',12000],['reserve',70000]].map(async([key,timeout])=>{
      const controller=new AbortController();controllers.push(controller);const timer=setTimeout(()=>controller.abort(),timeout);
      try {
       const response=await request(`${endpoints[key]}/api/contingencia/estado`,{method:'GET',headers:{Accept:'application/json'},signal:controller.signal,redirect:'error',cache:'no-store'});
       if(!response.ok)throw Error('Controle indisponível.');
       const data=await response.json();
       if(data?.environment!==environment||!Number.isSafeInteger(data.revision)||data.revision<1)throw Error('Controle inválido.');
       if(data.executor==='RENDER')return endpoints.primary;
       if(data.contingency?.readyForFailover!==true)throw Error('Reserva não validada.');
       if(data.executor==='RENDER_RESERVA')return endpoints.reserve;
       if(data.executor==='NETLIFY')return endpoints.netlify;
       throw Error('Executor inválido.');
      } finally {clearTimeout(timer);}
     }));
     cache.set(environment,{target,until:now()+60000});return target;
    } catch {
     // Preserve only a previously confirmed owner; the primary is the initial owner.
     const target=previous?.target??endpoints.primary;
     cache.set(environment,{target,until:now()+5000});return target;
    } finally {controllers.forEach(c=>c.abort());pending.delete(environment);}
   })();pending.set(environment,task);
  }
  return pending.get(environment);
 };
}
