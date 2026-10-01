exports.handler = async (event, context) => {
  // Netlify TOML build variables are not guaranteed in the Functions runtime.
  process.env.API_RUNTIME = "serverless";
  process.env.BACKGROUND_JOBS_ENABLED = "false";
  process.env.NETLIFY_HOMOLOGATION_ENABLED = "true";
  process.env.EMAIL_DESTINATARIOS_PERMITIDOS = "";
  const { handler } = require("../../dist/serverless.js");
  return handler(event, context);
};
