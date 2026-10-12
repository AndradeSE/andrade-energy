// PCM16 mono: apenas verifica energia; não guarda nem transmite amostras.
export function assistantPcm16ToFloat32(audio: ArrayBuffer) {
  const pcm = new DataView(audio);
  const output = new Float32Array(Math.floor(audio.byteLength / 2));
  for (let i = 0; i < output.length; i++) output[i] = pcm.getInt16(i * 2, true) / 32768;
  return output.buffer;
}
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
