import serverless from "serverless-http";
import type { Application } from "express";
import { isIP } from "node:net";

export function normalizeNetlifyEvent(event: any) {
  const headers = { ...event.headers };
  const ip = headers["x-nf-client-connection-ip"];
  if (typeof ip !== "string" || !isIP(ip)) return null;
  // Netlify supplies the connecting address. Do not trust caller-supplied
  // forwarded chains when adapting the event to the AWS transport shape.
  for (const key of Object.keys(headers)) {
    if (["x-forwarded-for", "forwarded"].includes(key.toLowerCase())) delete headers[key];
  }
  return { ...event, headers, requestContext: {
    ...event.requestContext,
    identity: { ...event.requestContext?.identity, sourceIp: ip },
  } };
}

// Injection keeps transport tests isolated from Supabase and private settings.
export function createServerlessHandler(app: Application) {
  const handler = serverless(app, { binary: ["application/pdf", "application/octet-stream", "image/*"] });
  return async (event: object, context: object) => await handler(event, context) as {
    statusCode: number;
    body: string;
    isBase64Encoded: boolean;
    headers: Record<string, string>;
  };
}
