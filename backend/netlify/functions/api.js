exports.handler = async (event, context) => {
  // Netlify TOML build variables are not guaranteed in the Functions runtime.
  process.env.API_RUNTIME = "serverless";
  process.env.BACKGROUND_JOBS_ENABLED = "false";
  process.env.NETLIFY_HOMOLOGATION_ENABLED = "true";
  process.env.NETLIFY_AUTH_VALIDATION_ENABLED = "true";
  process.env.EMAIL_DESTINATARIOS_PERMITIDOS = "";
  process.env.COMMIT_REF = require("../../dist/release.json").commit;
  const { handler } = require("../../dist/serverless.js");
  return handler(event, context);
};
