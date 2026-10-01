exports.handler = async (event, context) => {
  const { handler } = require("../../dist/serverless.js");
  return handler(event, context);
};
