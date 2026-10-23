import assert from "node:assert/strict";
import test from "node:test";
import { assistantAvailable } from "./availability";

test("produção exige ativação explícita e Preview mantém disponibilidade", () => {
  assert.equal(assistantAvailable({ APP_ENV: "production" }), false);
  assert.equal(assistantAvailable({ APP_ENV: "production", ASSISTANT_ENABLED: "1" }), true);
  assert.equal(assistantAvailable({ APP_ENV: "preview" }), true);
  assert.equal(assistantAvailable({ ASSISTANT_ENABLED: "false" }), false);
});
