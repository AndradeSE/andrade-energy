exports.handler = async () => {
  if (process.env.CONTINGENCY_ROUTING_ENABLED === "true") return {statusCode:200};
  process.env.API_RUNTIME = "serverless";
  process.env.BACKGROUND_JOBS_ENABLED = "false";
  process.env.NETLIFY_HOMOLOGATION_ENABLED = "true";
  const { homologationConfigured } = require("../../dist/config/serverlessPolicy.js");
  if (!homologationConfigured(process.env)) throw new Error("Worker de homologação não configurado.");
  await require("../../dist/modules/cotas/cotas.service.js").monitorServiceQuotas();
  return { statusCode: 200, body: "{}" };
};
