const { timingSafeEqual } = require("node:crypto");
// Netlify retries background invocations; the database reservation prevents replay.
exports.handler = async (event) => {
  const expected = process.env.CONTINGENCY_WORKER_SECRET;
  const actual = event.headers?.["x-contingency-worker"];
  if (process.env.NETLIFY_DURABLE_JOBS_ENABLED !== "true" || !expected || expected.length < 32 ||
      typeof actual !== "string" || Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return {statusCode:403};
  process.env.API_RUNTIME = "serverless";
  process.env.BACKGROUND_JOBS_ENABLED = "false";
  process.env.COMMIT_REF = require("../../dist/release.json").commit;
  const { contingencyEnvironment } = require("../../dist/config/contingencyRuntime.js");
  if (!contingencyEnvironment(process.env)) throw new Error("Ambiente do worker inválido.");
  const { scheduledJobs, executeScheduledJob } = require("../../dist/config/scheduledJobs.js");
  let name;
  try { name=JSON.parse(event.body || "{}").job; } catch { return {statusCode:400}; }
  if (!Object.hasOwn(scheduledJobs,name)) return {statusCode:400};
  await executeScheduledJob(name,"NETLIFY");
  return {statusCode:200};
};
