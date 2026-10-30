import test from "node:test";
import assert from "node:assert/strict";
import { transcribeAudio } from "./transcription";

test("transcrição usa português e chave apenas no servidor", async () => {
  const request = (async (url, options) => {
    assert.equal(url, "https://api.groq.com/openai/v1/audio/transcriptions");
    const form = options?.body as FormData;
    assert.equal(form.get("language"), "pt");
    assert.equal(form.get("model"), "whisper-large-v3-turbo");
    assert.ok(form.get("file") instanceof Blob);
    return new Response(JSON.stringify({ text: " Você está me ouvindo? " }));
  }) as typeof fetch;
  assert.equal(await transcribeAudio(Buffer.from("teste"), "audio/mp4", "chave-teste", request), "Você está me ouvindo?");
});
test("quota não expõe resposta do provedor", async () => {
  await assert.rejects(transcribeAudio(Buffer.from("teste"), "audio/mp4", "chave-teste", (async () => new Response("segredo", { status: 429 })) as typeof fetch), /TRANSCRIPTION_QUOTA/);
});
