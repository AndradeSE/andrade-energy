// PCM16 mono: apenas verifica energia; não guarda nem transmite amostras.
export function hasAssistantVoiceEnergy(audio: Uint8Array) {
  if (audio.byteLength < 2) return false;
  const pcm = new DataView(audio.buffer, audio.byteOffset, audio.byteLength);
  let squared = 0;
  const samples = Math.floor(audio.byteLength / 2);
  for (let i = 0; i < samples; i++) {
    const value = pcm.getInt16(i * 2, true) / 32768;
    squared += value * value;
  }
  return Math.sqrt(squared / samples) >= 0.003;
}
