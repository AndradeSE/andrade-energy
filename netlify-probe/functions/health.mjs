export default async () => Response.json({
  status: "probe-only",
  runtime: "netlify",
  apiReady: false,
  commit: process.env.COMMIT_REF?.slice(0, 7) ?? "local",
}, { headers: { "Cache-Control": "no-store" } });
export const config = { path: "/health" };
