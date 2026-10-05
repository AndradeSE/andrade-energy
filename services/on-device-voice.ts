import { Directory, File, Paths } from "expo-file-system";
import { requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { verifyLocalFileSha256 } from "./on-device-model";

const VOICE_DIR = new Directory(Paths.document, "assistente-local", "voz");
const VOICE_MODEL = {
  name: "ggml-tiny-q5_1.bin",
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/fb5ed9369c26eaf08392504d8446da431e0fffb9/ggml-tiny-q5_1.bin",
  sha256: "818710568da3ca15689e31a743197b520007872ff9576237bda97bd1b469c3d7",
  minBytes: 30_000_000,
};
const VAD_MODEL = {
  name: "ggml-silero-v6.2.0.bin",
  url: "https://huggingface.co/ggml-org/whisper-vad/resolve/9ffd54a1e1ee413ddf265af9913beaf518d1639b/ggml-silero-v6.2.0.bin",
  sha256: "2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987",
  minBytes: 800_000,
};
type Artifact = typeof VOICE_MODEL;
type VoiceSession = {
  transcriber: InstanceType<typeof import("whisper.rn/realtime-transcription/")["RealtimeTranscriber"]>;
  whisper: Awaited<ReturnType<typeof import("whisper.rn/index")["initWhisper"]>>;
  vad: Awaited<ReturnType<typeof import("whisper.rn/index")["initWhisperVad"]>>;
};
let session: VoiceSession | undefined;

function verified(artifact: Artifact) {
  const file = new File(VOICE_DIR, artifact.name);
  const marker = new File(VOICE_DIR, `${artifact.name}.sha256`);
  return file.exists && file.size >= artifact.minBytes && marker.exists && marker.textSync().trim() === artifact.sha256;
}

export function isVoiceInstalled() { return verified(VOICE_MODEL) && verified(VAD_MODEL); }

async function installArtifact(artifact: Artifact, onProgress?: (progress: number) => void) {
  if (verified(artifact)) return;
  const temporary = new File(VOICE_DIR, `${artifact.name}.download`);
  const destination = new File(VOICE_DIR, artifact.name);
  const marker = new File(VOICE_DIR, `${artifact.name}.sha256`);
  try {
    if (temporary.exists) temporary.delete();
    await File.downloadFileAsync(artifact.url, temporary);
    await verifyLocalFileSha256(temporary, artifact.sha256, artifact.minBytes, onProgress);
    if (destination.exists) destination.delete();
    if (marker.exists) marker.delete();
    temporary.move(destination);
    marker.write(artifact.sha256);
  } catch (error) {
    if (temporary.exists) temporary.delete();
    throw error;
  }
}

export async function installVoiceModels(onProgress?: (stage: string, progress?: number) => void) {
  if (isVoiceInstalled()) return;
  if (Paths.availableDiskSpace < 80_000_000) throw new Error("Libere pelo menos 80 MB para instalar a voz offline.");
  VOICE_DIR.create({ idempotent: true, intermediates: true });
  onProgress?.("Baixando reconhecimento de voz");
  await installArtifact(VOICE_MODEL, progress => onProgress?.("Verificando voz", progress));
  onProgress?.("Baixando detector de fala");
  await installArtifact(VAD_MODEL, progress => onProgress?.("Verificando detector", progress));
}

export async function startContinuousListening(onSpeech: (text: string) => void, onError: (error: string) => void) {
  if (!isVoiceInstalled()) throw new Error("Instale os arquivos de voz antes de começar.");
  const permission = await requestRecordingPermissionsAsync();
  if (!permission.granted) throw new Error("O microfone não foi autorizado.");
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  if (!session) {
    const [{ initWhisper, initWhisperVad }, { RealtimeTranscriber, RingBufferVad }, { AudioPcmStreamAdapter }] = await Promise.all([
      import("whisper.rn/index"), import("whisper.rn/realtime-transcription/"), import("whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter"),
    ]);
    const whisper = await initWhisper({ filePath: new File(VOICE_DIR, VOICE_MODEL.name).uri });
    const vad = await initWhisperVad({ filePath: new File(VOICE_DIR, VAD_MODEL.name).uri, useGpu: false });
    const transcriber = new RealtimeTranscriber(
      { whisperContext: whisper, vadContext: new RingBufferVad(vad), audioStream: new AudioPcmStreamAdapter() },
      { audioSliceSec: 20, audioMinSec: 1, maxSlicesInMemory: 3, transcribeOptions: { language: "pt" } },
      { onSliceTranscriptionStabilized: (text: string) => { if (text.trim()) onSpeech(text.trim()); }, onError },
    );
    session = { transcriber, whisper, vad };
  }
  await session.transcriber.start();
}

export async function pauseContinuousListening() {
  if (session) await session.transcriber.stop();
}

export async function stopContinuousListening() {
  if (!session) return;
  const current = session;
  session = undefined;
  await current.transcriber.stop();
  await current.whisper.release();
  await current.vad.release();
  await setAudioModeAsync({ allowsRecording: false });
}
