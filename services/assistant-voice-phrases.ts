// Segmentação PCM16 mono/16 kHz em memória. Nenhum áudio é salvo ou enviado.
const FRAME_BYTES = 640; // 20 ms
const PRE_ROLL_FRAMES = 15;
const END_SILENCE_FRAMES = 25; // 500 ms: fecha "Andrade" sem aguardar silêncio excessivo.
const MAX_PHRASE_FRAMES = 250;

function join(frames: Uint8Array[]) {
  const result = new Uint8Array(frames.reduce((sum, frame) => sum + frame.length, 0));
  let offset = 0;
  for (const frame of frames) { result.set(frame, offset); offset += frame.length; }
  return result;
}

export class AssistantVoicePhrases {
  constructor(private endSilenceFrames = END_SILENCE_FRAMES, private maxPhraseFrames = MAX_PHRASE_FRAMES) {}
  private remainder = new Uint8Array(0);
  private preRoll: Uint8Array[] = [];
  private phrase: Uint8Array[] = [];
  private voicedFrames = 0;
  private silenceFrames = 0;
  private noise = 0.001;

  get bufferedBytes() { return this.remainder.length + (this.preRoll.length + this.phrase.length) * FRAME_BYTES; }

  reset() {
    this.remainder = new Uint8Array(0);
    this.preRoll = []; this.phrase = [];
    this.voicedFrames = 0; this.silenceFrames = 0; this.noise = 0.001;
  }

  push(chunk: Uint8Array): Uint8Array[] {
    const input = join([this.remainder, chunk]);
    const completed: Uint8Array[] = [];
    let offset = 0;
    for (; offset + FRAME_BYTES <= input.length; offset += FRAME_BYTES) {
      const frame = input.slice(offset, offset + FRAME_BYTES);
      const pcm = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
      let square = 0;
      for (let i = 0; i < frame.length; i += 2) {
        const value = pcm.getInt16(i, true) / 32768;
        square += value * value;
      }
      const rms = Math.sqrt(square / (frame.length / 2));
      const voiced = rms >= Math.max(0.006, this.noise * 3);
      if (!voiced && !this.phrase.length) this.noise = this.noise * 0.95 + rms * 0.05;
      if (!this.phrase.length) {
        if (!voiced) {
          this.preRoll.push(frame);
          if (this.preRoll.length > PRE_ROLL_FRAMES) this.preRoll.shift();
          continue;
        }
        this.phrase = this.preRoll;
        this.preRoll = [];
      }
      this.phrase.push(frame);
      if (voiced) { this.voicedFrames++; this.silenceFrames = 0; }
      else this.silenceFrames++;
      if (this.silenceFrames >= this.endSilenceFrames || this.phrase.length >= this.maxPhraseFrames) {
        // Estalos e silêncio não devem acionar o modelo de linguagem.
        if (this.voicedFrames >= 10) completed.push(join(this.phrase));
        // Short wake windows overlap by one second when noise prevents a
        // silence boundary, preserving a keyword crossing the window edge.
        const overlap = this.silenceFrames < this.endSilenceFrames && this.maxPhraseFrames < MAX_PHRASE_FRAMES ? 50 : PRE_ROLL_FRAMES;
        this.preRoll = this.phrase.slice(-overlap);
        this.phrase = []; this.voicedFrames = 0; this.silenceFrames = 0;
      }
    }
    this.remainder = input.slice(offset);
    return completed;
  }
}
