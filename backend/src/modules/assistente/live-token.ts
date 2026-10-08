import { GoogleGenAI, Modality } from "@google/genai";

export async function createLiveToken(apiKey: string, model: string) {
  // liveConnectConstraints is an SDK option, not the wire-level REST field.
  // The official SDK maps it to bidiGenerateContentSetup and maps AUDIO
  // to generationConfig, keeping the token restricted without exposing the key.
  const client = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta", timeout: 6000 } });
  return client.authTokens.create({ config: {
    uses: 1,
    expireTime: new Date(Date.now() + 10 * 60_000).toISOString(),
    newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
    liveConnectConstraints: { model, config: { responseModalities: [Modality.AUDIO] } },
  } });
}
