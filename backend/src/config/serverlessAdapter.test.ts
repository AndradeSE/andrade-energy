import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServerlessHandler, normalizeNetlifyEvent } from "./serverlessAdapter";

test("Netlify address is normalized without trusting a forged forwarding chain", async () => {
  const app = express();
  app.set("trust proxy", 1);
  app.get("/ip", (req, res) => res.json({ ip: req.ip }));
  const incoming = { ...event("/ip"), headers: {
    "x-nf-client-connection-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.8",
  } };
  const normalized = normalizeNetlifyEvent(incoming);
  const response = await createServerlessHandler(app)(normalized!, {});
  assert.equal(JSON.parse(response.body).ip, "203.0.113.9");
  assert.equal(normalizeNetlifyEvent({ headers: {} }), null);
  assert.equal(normalizeNetlifyEvent({ headers: { "x-nf-client-connection-ip": "invalid" } }), null);
});

const event = (path: string, body: string | null = null, encoded = false) => ({
  httpMethod: body === null ? "GET" : "POST", path,
  headers: { "content-type": "application/json" },
  body, isBase64Encoded: encoded,
  requestContext: { identity: { sourceIp: "127.0.0.1" } },
  queryStringParameters: null,
});

test("Lambda health transport uses no database", async () => {
  const app = express();
  app.get("/health", (_, res) => res.json({ apiReady: false }));
  const response = await createServerlessHandler(app)(event("/health"), {});
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { apiReady: false });
});

test("webhook raw bytes survive base64 transport unchanged", async () => {
  const app = express();
  app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
    res.json({ raw: req.body.toString("base64") });
  });
  const raw = Buffer.from('{ "message": "ação", "value": 1 }\n');
  const response = await createServerlessHandler(app)(event("/webhook", raw.toString("base64"), true), {});
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).raw, raw.toString("base64"));
});

test("PDF responses remain binary", async () => {
  const app = express();
  const pdf = Buffer.from("%PDF-1.4\ntransport-test");
  app.get("/document", (_, res) => res.type("application/pdf").send(pdf));
  const response = await createServerlessHandler(app)(event("/document"), {});
  assert.equal(response.isBase64Encoded, true);
  assert.deepEqual(Buffer.from(response.body, "base64"), pdf);
});
