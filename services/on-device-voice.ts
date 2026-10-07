import { Directory, File, Paths } from "expo-file-system";
import { createDownloadResumable, getInfoAsync } from "expo-file-system/legacy";
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { assistantPcm16ToFloat32, hasAssistantVoiceEnergy } from "./assistant-audio-energy";

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
  capture: { hasAudio: boolean };
  transcriber: InstanceType<typeof import("whisper.rn/realtime-transcription/")["RealtimeTranscriber"]>;
  dictationTranscriber: InstanceType<typeof import("whisper.rn/realtime-transcription/")["RealtimeTranscriber"]>;
  whisper: Awaited<ReturnType<typeof import("whisper.rn/index")["initWhisper"]>>;
  vad: Awaited<ReturnType<typeof import("whisper.rn/index")["initWhisperVad"]>>;
};
let session: VoiceSession | undefined;
let preparingSession: Promise<VoiceSession> | undefined;
let pendingSpeechTimer: ReturnType<typeof setTimeout> | undefined;
let lastDictationCandidate = "";
let activeTranscriber: VoiceSession["transcriber"] | undefined;
let resolveDictationFlush: (() => void) | undefined;

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
    const capture = { hasAudio: false };
    class RestartableAudioStream extends AudioPcmStreamAdapter {
      private receiver?: Parameters<InstanceType<typeof AudioPcmStreamAdapter>["onData"]>[0];
      onData(callback: Parameters<InstanceType<typeof AudioPcmStreamAdapter>["onData"]>[0]) {
        this.receiver = callback;
        super.onData(data => { capture.hasAudio = true; callback(data); });
      }
      async initialize(config: Parameters<InstanceType<typeof AudioPcmStreamAdapter>["initialize"]>[0]) {
        capture.hasAudio = false;
        await super.initialize(config);
        // initialize() libera o adaptador anterior e apaga seu callback de PCM.
        if (this.receiver) this.onData(this.receiver);
      }
    }
    const whisper = await initWhisper({ filePath: new File(VOICE_DIR, VOICE_MODEL.name).uri });
    const vad = await initWhisperVad({ filePath: new File(VOICE_DIR, VAD_MODEL.name).uri, useGpu: false });
    // RealtimeTranscriber trabalha em PCM16; a API JSI do Whisper recebe Float32.
    const pcmWhisper = { transcribeData: (audio: ArrayBuffer, options: Parameters<typeof whisper.transcribeData>[1]) => whisper.transcribeData(assistantPcm16ToFloat32(audio), options) };
    const transcriber = new RealtimeTranscriber(
      { whisperContext: pcmWhisper, audioStream: new RestartableAudioStream() },
      // A frase curta não pode depender do VAD silencioso de alguns aparelhos.
      { audioSliceSec: 3, audioMinSec: 0.6, maxSlicesInMemory: 3, realtimeProcessingPauseMs: 1500, initRealtimeAfterMs: 1200, audioStreamConfig: { sampleRate: 16000, channels: 1, bitsPerSample: 16, audioSource: 1 }, transcribeOptions: { language: "pt", maxThreads: 2 } },
      {},
    );
    // Ditado por botão não depende do VAD: falas curtas podem não atingir o limiar de voz.
    const dictationTranscriber = new RealtimeTranscriber(
      { whisperContext: pcmWhisper, audioStream: new RestartableAudioStream() },
      { audioSliceSec: 30, audioMinSec: 0.4, maxSlicesInMemory: 2, realtimeProcessingPauseMs: 60_000, initRealtimeAfterMs: 60_000, transcribeOptions: { language: "pt" } },
      {},
    );
    return { transcriber, dictationTranscriber, whisper, vad, capture };
  })();
  try { session = await preparingSession; }
  finally { preparingSession = undefined; }
}

export async function startContinuousListening(onSpeech: (text: string) => void, onError: (error: string) => void, autoSubmit = false, onActivity?: (speaking: boolean) => void, shouldContinue = () => true, keepListening = false) {
  if (!isVoiceInstalled()) throw new Error("Instale os arquivos de voz antes de começar.");
  await prepareVoiceRecognition();
  if (!shouldContinue()) return;
  const existingPermission = await getRecordingPermissionsAsync();
  const permission = existingPermission.granted ? existingPermission : await requestRecordingPermissionsAsync();
  if (!permission.granted) throw new Error("O microfone não foi autorizado.");
  if (!shouldContinue()) return;
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  clearPendingSpeech();
  if (!autoSubmit) lastDictationCandidate = "";
  let submitted = false;
  const emit = (text: string) => {
    const spoken = text.trim();
    if (!shouldContinue() || !spoken || (autoSubmit && submitted && !keepListening)) return;
    clearPendingSpeech();
    if (autoSubmit) submitted = true;
    onSpeech(spoken);
  };
  const callbacks = {
    onBeginTranscribe: async (slice: { audioData: Uint8Array }) => !keepListening || (shouldContinue() && hasAssistantVoiceEnergy(slice.audioData)),
    onSliceTranscriptionStabilized: (text: string) => {
      if (!autoSubmit) {
        lastDictationCandidate = text.trim() || lastDictationCandidate;
        resolveDictationFlush?.();
        return;
      }
      emit(text);
    },
    onTranscribe: (event: { type: string; data?: { result?: string } }) => {
      if (keepListening && event.type === "transcribe") console.info("[AssistantWake] local-result", Boolean(event.data?.result?.trim()));
      if (event.type !== "transcribe" || !event.data?.result?.trim()) return;
      const candidate = event.data.result.trim();
      if (keepListening) { emit(candidate); return; }
      if (!autoSubmit) { lastDictationCandidate = candidate; return; }
      if (submitted && !keepListening) return;
      clearPendingSpeech();
      // Não envie uma hipótese parcial cedo demais. O resultado final do VAD
      // tem prioridade; a hipótese serve apenas se ele não vier.
      pendingSpeechTimer = setTimeout(() => emit(candidate), 2400);
    },
    onError,
    onVad: (event: { type: string }) => {
      if (event.type === "speech_start" || event.type === "speech_continue") onActivity?.(true);
      else if (event.type === "speech_end" || event.type === "silence") onActivity?.(false);
    },
  };
  const prepared = session;
  if (!prepared) throw new Error("O reconhecimento de voz não iniciou.");
  const transcriber = autoSubmit ? prepared.transcriber : prepared.dictationTranscriber;
  activeTranscriber = transcriber;
  transcriber.updateCallbacks(callbacks);
  await transcriber.start();
  const captureDeadline = Date.now() + 4000;
  while (!prepared.capture.hasAudio && shouldContinue() && Date.now() < captureDeadline) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!shouldContinue() || !prepared.capture.hasAudio) {
    await stopContinuousListening();
    if (shouldContinue()) throw new Error("O microfone abriu, mas não entregou áudio. A escuta foi desligada.");
  }
}

export async function pauseContinuousListening() {
  clearPendingSpeech();
  if (activeTranscriber) await activeTranscriber.stop();
  activeTranscriber = undefined;
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
}

export async function finishDictation() {
  // whisper.rn ignora transcrições quando stop() desativa a sessão. Finalize e aguarde
  // a fatia ainda com a sessão ativa, antes de desligar o microfone.
  if (activeTranscriber === session?.dictationTranscriber) {
    await new Promise<void>(async resolve => {
      const timer = setTimeout(resolve, 12_000);
      resolveDictationFlush = () => { clearTimeout(timer); resolve(); };
      try { await activeTranscriber?.nextSlice(); }
      catch { clearTimeout(timer); resolve(); }
    });
    resolveDictationFlush = undefined;
  }
  await stopContinuousListening();
  const result = lastDictationCandidate;
  lastDictationCandidate = "";
  return result;
}

export async function stopContinuousListening() {
  clearPendingSpeech();
  if (!activeTranscriber) return;
  await activeTranscriber.stop();
  activeTranscriber = undefined;
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
