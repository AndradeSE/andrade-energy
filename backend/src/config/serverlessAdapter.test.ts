import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServerlessHandler } from "./serverlessAdapter";

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
