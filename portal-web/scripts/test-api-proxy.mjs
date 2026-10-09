import { strict as assert } from "node:assert";
import { test } from "node:test";
import { proxyApi } from "../worker/api-proxy.js";
const origin = "https://portal.example";
const token = "a".repeat(64);
function request(path, method = "GET", options = {}) {
  return new Request(origin + path, { method, headers: { ...(method !== "GET" ? { Origin: origin } : {}), ...options.headers }, ...(options.body ? { body: options.body } : {}) });
}
test("login guarda token só em cookie HttpOnly, Secure e SameSite", async () => {
  const response = await proxyApi(request("/api/auth/login", "POST", { body: '{"email":"test@example.invalid"}' }), {}, async (url, options) => {
    assert.equal(String(url), "https://andrade-energy-api-vda.onrender.com/api/auth/login");
    assert.equal(options.headers.has("Cookie"), false);
    return Response.json({ token, usuario: { id: "synthetic" } });
  });
  assert.equal((await response.json()).token, "cookie-session");
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/api"]) assert.ok(response.headers.get("Set-Cookie").includes(attribute));
});
test("cookie fornece credencial real; ignora Authorization informado no navegador", async () => {
  const response = await proxyApi(request("/api/faturas", "GET", { headers: { Cookie: `__Secure-andrade_web_session=${token}`, Authorization: "Bearer attacker" } }), {}, async (_url, options) => {
    assert.equal(options.headers.get("Authorization"), `Bearer ${token}`);
    return Response.json([]);
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("não encaminha credenciais ou aceita destinos externos", async () => {
  let contacted = false;
  const fetchMock = async () => { contacted = true; return Response.json({}); };
  assert.equal((await proxyApi(request("/api/faturas"), { ANDRADE_API_ORIGIN: "https://attacker.invalid" }, fetchMock)).status, 503);
  assert.equal(contacted, false);
});
test("mutações recusam origem ausente ou estrangeira e cross-site", async () => {
  for (const headers of [{}, { Origin: "https://attacker.invalid" }, { Origin: origin, "Sec-Fetch-Site": "cross-site" }]) {
    const response = await proxyApi(new Request(origin + "/api/auth/login", { method: "POST", headers }), {}, () => { throw Error("Não deve chegar ao upstream"); });
    assert.equal(response.status, 403);
  }
});
test("migração valida token legado no servidor antes de criar cookie", async () => {
  const response = await proxyApi(request("/api/auth/session", "POST", { body: JSON.stringify({ legacyToken: token }) }), {}, async (url, options) => {
    assert.equal(String(url), "https://andrade-energy-api-vda.onrender.com/api/auth/session");
    assert.equal(options.method, "GET"); assert.equal(options.headers.get("Authorization"), `Bearer ${token}`);
    return Response.json({ usuario: { id: "synthetic" } });
  });
  assert.ok(response.headers.get("Set-Cookie"));
  assert.equal((await response.json()).token, "cookie-session");
});
test("sessão inválida elimina cookie e não migra token recusado", async () => {
  const response = await proxyApi(request("/api/auth/session", "POST", { body: JSON.stringify({ legacyToken: token }) }), {}, async () => Response.json({ message: "Expirada" }, { status: 401 }));
  assert.equal(response.status, 401); assert.ok(response.headers.get("Set-Cookie").includes("Max-Age=0"));
});
test("logout limpa cookie mesmo em falha de rede", async () => {
  const response = await proxyApi(request("/api/auth/logout", "POST", { headers: { Cookie: `__Secure-andrade_web_session=${token}` } }), {}, async () => { throw Error("network"); });
  assert.equal(response.status, 502); assert.ok(response.headers.get("Set-Cookie").includes("Max-Age=0"));
});
test("preserva idempotência financeira e chave da adesão pública", async () => {
  await proxyApi(request("/api/comercial/adesao/checkout", "POST", { headers: { "Idempotency-Key": "synthetic-operation", "X-Adesao-Chave": "synthetic-key" }, body: "{}" }), {}, async (_url, options) => {
    assert.equal(options.headers.get("Idempotency-Key"), "synthetic-operation");
    assert.equal(options.headers.get("X-Adesao-Chave"), "synthetic-key");
    return Response.json({});
  });
});
