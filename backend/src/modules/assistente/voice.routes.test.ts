import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_VOICE_LINES } from "./voice-lines";

test("a voz externa só recebe frases públicas fixas", () => {
  assert.deepEqual(Object.keys(PUBLIC_VOICE_LINES).sort(), ["retry", "welcome"]);
  for (const line of Object.values(PUBLIC_VOICE_LINES)) {
    assert.ok(line.length < 150);
    assert.doesNotMatch(line, /\bCPF\b|\bCNPJ\b|\bfatura\b|\bR\$/i);
  }
});
