import { createServerlessHandler } from "./config/serverlessAdapter";

// Fail closed until the isolated homologation deployment is configured.
let ready: Promise<ReturnType<typeof createServerlessHandler>> | undefined;
export async function handler(event: object, context: object) {
  const method = (event as { httpMethod?: string }).httpMethod;
  // Initial remote validation cannot mutate records or trigger payments/queues.
  if (method && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { statusCode: 503, body: JSON.stringify({ error: "Contingência em validação: operações de escrita indisponíveis." }) };
  }
  if (process.env.API_RUNTIME !== "serverless" || process.env.BACKGROUND_JOBS_ENABLED !== "false" ||
      process.env.NETLIFY_HOMOLOGATION_ENABLED !== "true" ||
      process.env.SUPABASE_URL !== "https://qqhcjieymypowunkixmk.supabase.co") {
    return { statusCode: 503, body: JSON.stringify({ error: "API de homologação não configurada." }) };
  }
  ready ??= (async () => {
    const { app, validarSchemaAntesDeIniciar } = await import("./server.js");
    await validarSchemaAntesDeIniciar();
    return createServerlessHandler(app);
  })();
  try {
    return await (await ready)(event, context);
  } catch {
    ready = undefined;
    return { statusCode: 503, body: JSON.stringify({ error: "API temporariamente indisponível." }) };
  }
}
