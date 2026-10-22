import assert from "node:assert/strict";
import { test } from "node:test";
import { homologationConfigured, serverlessRequestAllowed } from "./serverlessPolicy";

const preview = { API_RUNTIME: "serverless", BACKGROUND_JOBS_ENABLED: "false", NETLIFY_HOMOLOGATION_ENABLED: "true",
  SUPABASE_URL: "https://qqhcjieymypowunkixmk.supabase.co" };
test("homologation refuses production, substituted hosts and active schedulers", () => {
  assert.equal(homologationConfigured(preview), true);
  for (const url of ["https://ehnkyrsseisvvtbkwrvu.supabase.co", preview.SUPABASE_URL + ".evil.test", "http://qqhcjieymypowunkixmk.supabase.co"]) {
    assert.equal(homologationConfigured({ ...preview, SUPABASE_URL: url }), false);
  }
  assert.equal(homologationConfigured({ ...preview, BACKGROUND_JOBS_ENABLED: "true" }), false);
});
test("authentication validation does not unlock billing, signing, OAuth or webhooks", () => {
  const env = { ...preview, NETLIFY_AUTH_VALIDATION_ENABLED: "true" };
  assert.equal(serverlessRequestAllowed("POST", "/api/auth/login", env), true);
  assert.equal(serverlessRequestAllowed("POST", "/api/auth/logout", env), true);
  assert.equal(serverlessRequestAllowed("POST", "/api/auth/login", preview), false);
  for (const path of ["/api/asaas", "/api/webhooks/asaas", "/api/auth/cadastro", "/api/contratos/assinar", "/api/usinas/id/rateio-mensal"]) {
    assert.equal(serverlessRequestAllowed("POST", path, env), false);
  }
  for (const method of ["DELETE", "PUT", "PATCH"]) assert.equal(serverlessRequestAllowed(method, "/api/auth/me", env), false);
  assert.equal(serverlessRequestAllowed("GET", "/api/oauth/email/callback/GMAIL", env), false);
  assert.equal(serverlessRequestAllowed("GET", "/api/auth/session", env), true);
});
