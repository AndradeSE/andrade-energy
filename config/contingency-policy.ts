export const CONTINGENCY_ENDPOINTS = {
  preview: { primary: "https://andrade-energy-api-homologacao.onrender.com/api", standby: "https://andrade-energy-fallback-probe.netlify.app/api" },
  production: { primary: "https://andrade-energy-api-vda.onrender.com/api", standby: "https://andrade-energy-api-reserva.netlify.app/api" },
} as const;
type Environment=keyof typeof CONTINGENCY_ENDPOINTS;

export function resolveContingencyTarget(environment:Environment, value:unknown) {
  const body=value as {environment?:unknown;executor?:unknown;revision?:unknown;contingency?:{readyForFailover?:unknown}}|null;
  const endpoints=CONTINGENCY_ENDPOINTS[environment];
  if(!body || body.environment!==environment || !Number.isSafeInteger(body.revision) || Number(body.revision)<1) {
    throw new Error("Configuração de contingência inválida.");
  }
  if(body.executor==="RENDER") return endpoints.primary;
  if(body.executor==="NETLIFY" && body.contingency?.readyForFailover===true) return endpoints.standby;
  throw new Error("Reserva em conferência.");
}

/** Resolve BEFORE the operation; never replay a business request after a timeout. */
export function createContingencyResolver(environment:Environment, read:()=>Promise<unknown>,now=Date.now) {
  let cached: string=CONTINGENCY_ENDPOINTS[environment].primary;
  let validUntil=0;
  let pending:Promise<string>|undefined;
  return async()=>{
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
}
