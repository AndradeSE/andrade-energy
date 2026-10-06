// Preview-only caller; credentials and SSML never leave the server logs.
let unavailableUntil = 0;
const xml = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));

export async function azureVoice(text: string): Promise<string | undefined> {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (!key || !region || !/^[a-z0-9]{2,30}$/.test(region) || process.env.AZURE_SPEECH_TIER !== "F0" || Date.now() < unavailableUntil) return undefined;
  if (!text.trim() || text.length > 1600) return undefined;
  try {
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "AndradeEnergyPreview" },
      body: `<speak version="1.0" xml:lang="pt-BR"><voice name="pt-BR-FranciscaNeural">${xml(text)}</voice></speak>`,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn("Azure voice unavailable, provider status:", response.status);
      if (response.status === 429 || response.status >= 500) unavailableUntil = Date.now() + 60_000;
      return undefined;
    }
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length < 44 || data.length > 6_000_000 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") return undefined;
    return data.toString("base64");
  } catch {
    console.warn("Azure voice failed");
    return undefined;
  }
}
