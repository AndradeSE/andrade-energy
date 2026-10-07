import type { AudioStreamInterface } from "whisper.rn/realtime-transcription/types";
import type { WhisperContext } from "whisper.rn/index";
import { AssistantVoicePhrases } from "./assistant-voice-phrases";

// Captura dedicada da frase-chave: a conversa/ditado online não passam aqui.
export class AssistantLocalWake {
  private active = false;
  private epoch = 0;
  private phrases = new AssistantVoicePhrases();
  private pending?: Uint8Array;
  private draining = false;
  private task?: ReturnType<WhisperContext["transcribeData"]>;
  private captured = false;
  private lastPacket = 0;
  private watchdog?: ReturnType<typeof setInterval>;
  private stopping?: Promise<void>;

  constructor(private stream: AudioStreamInterface, private whisper: WhisperContext) {}

  async start(onSpeech: (text: string) => void, onError: (message: string) => void, valid: () => boolean) {
    await this.stop();
    if (!valid()) return;
    const epoch = ++this.epoch;
    this.active = true; this.captured = false; this.pending = undefined;
    this.phrases.reset();
    const current = () => this.active && epoch === this.epoch && valid();
    const fail = (message: string) => { if (current()) { onError(message); void this.stop(); } };
    const drain = async () => {
      if (this.draining) return;
      this.draining = true;
      try {
        while (current() && this.pending) {
          const audio = this.pending;
          this.pending = undefined;
          console.info("[AssistantWake] phrase-audio-ms", Math.round(audio.byteLength / 32));
          const task = this.whisper.transcribeData(audio.buffer as ArrayBuffer, {
            language: "pt", maxThreads: 2, temperature: 0, temperatureInc: 0, maxContext: 0,
          });
          this.task = task;
          const timeout = setTimeout(() => fail("A escuta demorou para reconhecer. Ative novamente para tentar."), 12000);
          try {
            const result = await task.promise;
            if (current() && !result.isAborted && result.result.trim()) onSpeech(result.result.trim());
          } finally {
            clearTimeout(timeout);
            if (this.task === task) this.task = undefined;
          }
        }
      } catch { fail("Não foi possível reconhecer o comando de voz. Ative novamente para tentar."); }
      finally { this.draining = false; }
    };
    try {
      await this.stream.initialize({ sampleRate: 16000, channels: 1, bitsPerSample: 16, audioSource: 1, bufferSize: 4096 });
      if (!current()) { await this.stream.release(); return; }
      // initialize() remove listeners antigos: registrar sempre depois dele.
      this.stream.onError(fail);
      this.stream.onData(packet => {
        if (!current()) return;
        this.captured = true; this.lastPacket = Date.now();
        for (const phrase of this.phrases.push(packet.data)) this.pending = phrase;
        void drain();
      });
      await this.stream.start();
      const deadline = Date.now() + 4000;
      while (current() && !this.captured && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
      if (!current()) { await this.stop(); return; }
      if (!this.captured) throw new Error("O microfone abriu, mas não entregou áudio.");
      console.info("[AssistantWake] phrase-listener-ready");
      this.watchdog = setInterval(() => {
        if (current() && Date.now() - this.lastPacket > 4000) fail("A captura do microfone foi interrompida. Ative novamente para tentar.");
      }, 1000);
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async stop() {
    if (this.stopping) return this.stopping;
    this.active = false; this.epoch++;
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = undefined; this.pending = undefined; this.phrases.reset();
    const task = this.task;
    this.stopping = (async () => {
      await this.stream.stop();
      if (task) { await task.stop(); await task.promise.catch(() => undefined); }
      await this.stream.release();
    })();
    try { await this.stopping; }
    finally { this.stopping = undefined; }
  }
}
