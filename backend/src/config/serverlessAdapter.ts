import serverless from "serverless-http";
import type { Application } from "express";

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
