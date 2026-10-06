import { Directory, File, Paths } from "expo-file-system";
import { createDownloadResumable, getInfoAsync } from "expo-file-system/legacy";
import { requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";

const VOICE_DIR = new Directory(Paths.document, "assistente-local", "voz");
const VOICE_MODEL = {
  name: "ggml-tiny-q5_1.bin",
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/fb5ed9369c26eaf08392504d8446da431e0fffb9/ggml-tiny-q5_1.bin",
  sha256: "818710568da3ca15689e31a743197b520007872ff9576237bda97bd1b469c3d7",
  md5: "531c3bec8666a67ed7f0c0779c58fd61",
  bytes: 32_152_673,
  minBytes: 30_000_000,
};
const VAD_MODEL = {
  name: "ggml-silero-v6.2.0.bin",
  url: "https://huggingface.co/ggml-org/whisper-vad/resolve/9ffd54a1e1ee413ddf265af9913beaf518d1639b/ggml-silero-v6.2.0.bin",
  sha256: "2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987",
  md5: "ee99234b74067018b10d324cc8dc8119",
  bytes: 885_098,
  minBytes: 800_000,
};
type Artifact = typeof VOICE_MODEL;
type VoiceSession = {
  transcriber: InstanceType<typeof import("whisper.rn/realtime-transcription/")["RealtimeTranscriber"]>;
  whisper: Awaited<ReturnType<typeof import("whisper.rn/index")["initWhisper"]>>;
  vad: Awaited<ReturnType<typeof import("whisper.rn/index")["initWhisperVad"]>>;
};
let session: VoiceSession | undefined;
let preparingSession: Promise<VoiceSession> | undefined;
let pendingSpeechTimer: ReturnType<typeof setTimeout> | undefined;
let lastDictationCandidate = "";

function clearPendingSpeech() {
  if (pendingSpeechTimer) clearTimeout(pendingSpeechTimer);
  pendingSpeechTimer = undefined;
}

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
    const arquivoCompleto = temporary.exists && temporary.size === artifact.bytes;
    if (temporary.exists && !arquivoCompleto) temporary.delete();
    if (!arquivoCompleto) {
      const download = createDownloadResumable(artifact.url, temporary.uri, {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        onProgress?.(Math.min(1, totalBytesWritten / (totalBytesExpectedToWrite || artifact.bytes)));
      });
      const result = await download.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300) throw new Error("Não foi possível baixar o reconhecimento de voz.");
    }
    // Os MD5s foram calculados sobre arquivos cujo SHA-256 publicado foi confirmado.
    const info = await getInfoAsync(temporary.uri, { md5: true });
    if (!info.exists || info.isDirectory || info.size !== artifact.bytes || info.md5?.toLowerCase() !== artifact.md5) {
      throw new Error("O arquivo de voz não passou na verificação de integridade.");
    }
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
  onProgress?.("Baixando reconhecimento de voz", 0);
  await installArtifact(VOICE_MODEL, progress => onProgress?.("Baixando reconhecimento de voz", progress));
  onProgress?.("Baixando detector de fala", 0);
  await installArtifact(VAD_MODEL, progress => onProgress?.("Baixando detector de fala", progress));
  onProgress?.("Arquivos de voz prontos", 1);
}

export async function prepareVoiceRecognition() {
  if (session) return;
  if (!isVoiceInstalled()) return;
  if (!preparingSession) preparingSession = (async () => {
    const [{ initWhisper, initWhisperVad }, { RealtimeTranscriber, RingBufferVad }, { AudioPcmStreamAdapter }] = await Promise.all([
      import("whisper.rn/index"), import("whisper.rn/realtime-transcription/"), import("whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter"),
    ]);
    const whisper = await initWhisper({ filePath: new File(VOICE_DIR, VOICE_MODEL.name).uri });
    const vad = await initWhisperVad({ filePath: new File(VOICE_DIR, VAD_MODEL.name).uri, useGpu: false });
    const transcriber = new RealtimeTranscriber(
      { whisperContext: whisper, vadContext: new RingBufferVad(vad), audioStream: new AudioPcmStreamAdapter() },
      { audioSliceSec: 8, audioMinSec: 0.6, maxSlicesInMemory: 3, transcribeOptions: { language: "pt" } },
      {},
    );
    return { transcriber, whisper, vad };
  })();
  try { session = await preparingSession; }
  finally { preparingSession = undefined; }
}

export async function startContinuousListening(onSpeech: (text: string) => void, onError: (error: string) => void, autoSubmit = false, onActivity?: (speaking: boolean) => void) {
  if (!isVoiceInstalled()) throw new Error("Instale os arquivos de voz antes de começar.");
  await prepareVoiceRecognition();
  const permission = await requestRecordingPermissionsAsync();
  if (!permission.granted) throw new Error("O microfone não foi autorizado.");
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  clearPendingSpeech();
  if (!autoSubmit) lastDictationCandidate = "";
  let submitted = false;
  const emit = (text: string) => {
    const spoken = text.trim();
    if (!spoken || (autoSubmit && submitted)) return;
    clearPendingSpeech();
    if (autoSubmit) submitted = true;
    onSpeech(spoken);
  };
  const callbacks = {
    onSliceTranscriptionStabilized: emit,
    onTranscribe: (event: { type: string; data?: { result?: string } }) => {
      if (event.type !== "transcribe" || !event.data?.result?.trim()) return;
      const candidate = event.data.result.trim();
      if (!autoSubmit) { lastDictationCandidate = candidate; return; }
      if (submitted) return;
      clearPendingSpeech();
      pendingSpeechTimer = setTimeout(() => emit(candidate), 1200);
    },
    onError,
    onVad: (event: { type: string }) => {
      if (event.type === "speech_start" || event.type === "speech_continue") onActivity?.(true);
      else if (event.type === "speech_end" || event.type === "silence") onActivity?.(false);
    },
  };
  const prepared = session;
  if (!prepared) throw new Error("O reconhecimento de voz não iniciou.");
  prepared.transcriber.updateCallbacks(callbacks);
  await prepared.transcriber.start();
}

export async function pauseContinuousListening() {
  clearPendingSpeech();
  if (session) await session.transcriber.stop();
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
}

export async function finishDictation() {
  // stop() finaliza a gravação, força a última fatia e aguarda a transcrição pendente.
  // nextSlice() antes do stop dividia a fala e podia descartar o resultado final.
  await stopContinuousListening();
  const result = lastDictationCandidate;
  lastDictationCandidate = "";
  return result;
}

export async function stopContinuousListening() {
  clearPendingSpeech();
  if (!session) return;
  await session.transcriber.stop();
  await setAudioModeAsync({ allowsRecording: false });
}

export async function releaseVoiceRecognition() {
  await stopContinuousListening();
  if (preparingSession) await preparingSession.catch(() => undefined);
  const current = session;
  session = undefined;
  if (!current) return;
  await current.whisper.release();
  await current.vad.release();
}
