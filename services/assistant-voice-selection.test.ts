import { strict as assert } from "node:assert";
import { test } from "node:test";
import { choosePortugueseVoices } from "./assistant-voice-selection";

test("prefers a natural Brazilian voice and retains an offline fallback", () => {
  assert.deepEqual(choosePortugueseVoices([
    { identifier: "en-us-network", language: "en-US", name: "English", quality: "Enhanced" },
    { identifier: "pt-br-offline", language: "pt-BR", name: "Local", quality: "Default" },
    { identifier: "pt-br-neural-network", language: "pt_BR", name: "Natural", quality: "Enhanced" },
  ]), { preferred: "pt-br-neural-network", fallback: "pt-br-offline" });
});

test("falls back to the system voice when no Brazilian voice is listed", () => {
  assert.deepEqual(choosePortugueseVoices([]), { preferred: undefined, fallback: undefined });
});
