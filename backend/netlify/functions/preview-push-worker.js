// Scheduled Functions are invoked by Netlify, not a public HTTP job endpoint.
exports.handler = async () => {
  if (process.env.CONTINGENCY_ROUTING_ENABLED === "true") return {statusCode:200};
  process.env.API_RUNTIME = "serverless";
  process.env.BACKGROUND_JOBS_ENABLED = "false";
  process.env.NETLIFY_HOMOLOGATION_ENABLED = "true";
  const { homologationConfigured } = require("../../dist/config/serverlessPolicy.js");
  if (!homologationConfigured(process.env)) throw new Error("Worker de homologação não configurado.");
  const { processarPushPendente } = require("../../dist/modules/notificacoes/push.service.js");
  await processarPushPendente();
  const { cleanupExpiredUploads } = require("../../dist/modules/uploads/uploads.service.js");
  await cleanupExpiredUploads();
  return { statusCode: 200, body: JSON.stringify({ processed: true }) };
};
