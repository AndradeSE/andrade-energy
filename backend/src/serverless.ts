import { createServerlessHandler, normalizeNetlifyEvent } from "./config/serverlessAdapter";
import { homologationConfigured, serverlessRequestAllowed } from "./config/serverlessPolicy";

// Fail closed until the isolated homologation deployment is configured.
let ready: Promise<ReturnType<typeof createServerlessHandler>> | undefined;
export async function handler(event: object, context: object) {
  const method = (event as { httpMethod?: string }).httpMethod;
  // Initial remote validation cannot mutate records or trigger payments/queues.
  if (!method || !serverlessRequestAllowed(method, (event as { path?: string }).path ?? "", process.env)) {
    return { statusCode: 503, body: JSON.stringify({ error: "Contingência em validação: operações de escrita indisponíveis." }) };
  }
  if (!homologationConfigured(process.env)) {
    return { statusCode: 503, body: JSON.stringify({ error: "API de homologação não configurada." }) };
  }
  ready ??= (async () => {
    const { app, validarSchemaAntesDeIniciar } = await import("./server.js");
    await validarSchemaAntesDeIniciar();
    return createServerlessHandler(app);
  })();
  try {
    const normalized = normalizeNetlifyEvent(event);
    if (!normalized) return { statusCode: 503, body: JSON.stringify({ error: "Metadados de conexão indisponíveis." }) };
    return await (await ready)(normalized, context);
  } catch {
    ready = undefined;
    return { statusCode: 503, body: JSON.stringify({ error: "API temporariamente indisponível." }) };
  }
}
