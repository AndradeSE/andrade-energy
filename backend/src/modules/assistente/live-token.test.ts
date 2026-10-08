import { test } from "node:test";
import assert from "node:assert/strict";
import { createLiveToken } from "./live-token";

test("SDK serializes a single-use audio-only Live token using REST setup fields", async () => {
  const originalFetch = globalThis.fetch;
  let body: any;
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    assert.match(request.url, /\/v1beta\/auth_tokens$/);
    body = await request.json();
    return new Response(JSON.stringify({ name: "auth_tokens/test-only" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const token = await createLiveToken("test-key-not-a-secret", "gemini-3.8-live");
    assert.equal(token.name, "auth_tokens/test-only");
    assert.equal(body.uses, 1);
    assert.equal(body.liveConnectConstraints, undefined);
    assert.equal(body.bidiGenerateContentSetup.model, "models/gemini-3.8-live");
    assert.deepEqual(body.bidiGenerateContentSetup.generationConfig.responseModalities, ["AUDIO"]);
    assert.ok(Date.parse(body.expireTime) > Date.parse(body.newSessionExpireTime));
    assert.ok(!JSON.stringify(body).includes("test-key-not-a-secret"));
  } finally { globalThis.fetch = originalFetch; }
});
