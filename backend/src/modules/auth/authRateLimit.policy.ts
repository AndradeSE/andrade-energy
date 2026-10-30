/** Leituras autenticadas não consomem o orçamento de tentativas de senha. */
export function consultaSessaoAutenticada(req: {method:string;path:string}) {
  return req.method === "GET" && ["/session","/me"].includes(req.path.replace(/\/$/,""));
}
