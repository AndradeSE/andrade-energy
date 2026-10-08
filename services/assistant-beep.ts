import { createAudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";

// Tom curto gerado no aparelho: sem download, fornecedor ou dados pessoais.
export function activationTone(soft = false) {
  const sampleRate = 16000, samples = soft ? 4160 : 2240;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const label = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
  label(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); label(8, "WAVE"); label(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  label(36, "data"); view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    if (soft) {
      const time = i / sampleRate;
      const second = time >= 0.12;
      const local = second ? time - 0.12 : time;
      const duration = second ? 0.14 : 0.11;
      const envelope = Math.max(0, Math.min(1, local / 0.012, (duration - local) / 0.045));
      view.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * (second ? 880 : 660) * local) * 6000 * envelope), true);
      continue;
    }
    const fade = Math.min(1, i / 160, (samples - 1 - i) / 160);
    view.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * 880 * i / sampleRate) * 8000 * fade), true);
  }
  return bytes;
}

export async function playActivationBeep(soft = false) {
  try {
    const file = new File(Paths.cache, soft ? "assistant-activation-soft-v2.wav" : "assistant-activation-v1.wav");
    if (!file.exists) file.write(activationTone(soft));
    const player = createAudioPlayer({ uri: file.uri });
    await new Promise<void>(resolve => {
      let finished = false;
      const finish = () => { if (finished) return; finished = true; clearTimeout(timer); subscription.remove(); player.release(); resolve(); };
      const subscription = player.addListener("playbackStatusUpdate", status => { if (status.didJustFinish) finish(); });
      const timer = setTimeout(finish, 1000);
      try { player.play(); } catch { finish(); }
    });
  } catch { /* Falha do bip não impede a conversa. Respeita o volume do aparelho. */ }
}
