import { Directory, File, Paths } from "expo-file-system";
import { createDownloadResumable, getInfoAsync } from "expo-file-system/legacy";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

// Quantização de Qwen3-0.6B publicada por bartowski, derivada do modelo Apache-2.0.
// O arquivo é opcional, não é incluído no APK e só é baixado por ação explícita.
const MODEL_NAME = "Qwen_Qwen3-0.6B-Q4_K_M.gguf";
const MODEL_URL = "https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF/resolve/9e43cb1438c9523e11af66d6b4b2a424a1aa0e39/Qwen_Qwen3-0.6B-Q4_K_M.gguf";
const MODEL_SHA256 = "9acfc1e001311f34b4252001b626f2e466d592a42065f66571bff3790d4e1b14";
// Calculado sobre o arquivo do commit acima, após confirmar seu SHA-256.
// getInfoAsync calcula MD5 nativamente, sem bloquear a thread JavaScript.
const MODEL_MD5 = "c2eb98e4a2d6ff396fa064b28a012a06";
const MODEL_BYTES = 484_220_320;
const MIN_MODEL_BYTES = 400_000_000;
const MODEL_DIR = new Directory(Paths.document, "assistente-local");
let activeDownload: ReturnType<typeof createDownloadResumable> | null = null;
let cancelRequested = false;
type InstallPhase = "parado" | "conectando" | "baixando" | "verificando" | "pronto" | "erro";
export type ModelInstallState = { phase: InstallPhase; progress: number | null; downloadedBytes: number; message?: string; active: boolean };
let installState: ModelInstallState = { phase: "parado", progress: null, downloadedBytes: 0, active: false };
let activeInstall: Promise<void> | null = null;
const installListeners = new Set<(state: ModelInstallState) => void>();

function reportInstall(phase: InstallPhase, progress: number | null = null, downloadedBytes = 0, message?: string) {
  installState = { phase, progress, downloadedBytes, message, active: phase === "conectando" || phase === "baixando" || phase === "verificando" };
  installListeners.forEach(listener => listener(installState));
}

export function subscribeModelInstall(listener: (state: ModelInstallState) => void) {
  installListeners.add(listener);
  listener(installState);
  return () => { installListeners.delete(listener); };
}

type ChatTurn = { role: "user" | "assistant"; content: string };
type LlamaContext = Awaited<ReturnType<typeof import("llama.rn")["initLlama"]>>;
let context: LlamaContext | undefined;

function modelFile() { return new File(MODEL_DIR, MODEL_NAME); }
function markerFile() { return new File(MODEL_DIR, `${MODEL_NAME}.sha256`); }

export function isModelInstalled() {
  const model = modelFile();
  const marker = markerFile();
  return model.exists && model.size >= MIN_MODEL_BYTES && marker.exists && marker.textSync().trim() === MODEL_SHA256;
}

export async function verifyLocalFileSha256(file: File, expectedHash: string, minimumBytes: number, onProgress?: (progress: number) => void) {
  if (!file.exists || file.size < minimumBytes) throw new Error("Download incompleto.");
  const hash = sha256.create();
  const handle = file.open();
  let reportedPercent = -1;
  try {
    const size = handle.size;
    if (!size) throw new Error("Arquivo do modelo vazio.");
    while ((handle.offset ?? 0) < size) {
      const chunk = handle.readBytes(Math.min(131_072, size - (handle.offset ?? 0)));
      if (chunk.length === 0) throw new Error("Leitura incompleta do modelo.");
      hash.update(chunk);
      // Ceda a thread após cada bloco: o hash em JS não pode travar a navegação.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      const percent = Math.floor(((handle.offset ?? 0) / size) * 100);
      if (percent !== reportedPercent) {
        reportedPercent = percent;
        onProgress?.(percent / 100);
      }
    }
  } finally {
    handle.close();
  }
  if (bytesToHex(hash.digest()) !== expectedHash) throw new Error("O arquivo recebido não passou na verificação de integridade.");
  onProgress?.(1);
}

export async function cancelModelDownload() {
  cancelRequested = true;
  if (activeDownload) {
    try { await activeDownload.cancelAsync(); } catch { /* A transferência pode já ter terminado. */ }
  }
}

async function performInstallLocalModel() {
  if (isModelInstalled()) return;
  if (Paths.availableDiskSpace < 1_200_000_000) throw new Error("Libere pelo menos 1,2 GB de espaço para instalar o modelo.");
  cancelRequested = false;
  MODEL_DIR.create({ idempotent: true, intermediates: true });
  const temporary = new File(MODEL_DIR, `${MODEL_NAME}.download`);
  const marker = markerFile();
  try {
    const prontoParaVerificar = temporary.exists && temporary.size === MODEL_BYTES;
    if (temporary.exists && !prontoParaVerificar) temporary.delete();
    reportInstall(prontoParaVerificar ? "verificando" : "conectando", null);
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    if (cancelRequested) throw new Error("Download cancelado.");
    if (!prontoParaVerificar) {
      let lastReportAt = 0;
      let lastReportedPercent = -1;
      const download = createDownloadResumable(MODEL_URL, temporary.uri, {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (cancelRequested) return;
        const progress = Math.min(1, totalBytesWritten / (totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : MODEL_BYTES));
        const percent = Math.floor(progress * 100);
        const now = Date.now();
        if (percent !== lastReportedPercent && (lastReportedPercent < 0 || now - lastReportAt >= 250 || percent === 100)) {
          lastReportedPercent = percent;
          lastReportAt = now;
          reportInstall("baixando", progress, totalBytesWritten);
        }
      });
      activeDownload = download;
      if (cancelRequested) throw new Error("Download cancelado.");
      const result = await download.downloadAsync();
      activeDownload = null;
      if (cancelRequested) throw new Error("Download cancelado.");
      if (!result || result.status < 200 || result.status >= 300) throw new Error("Não foi possível baixar o modelo local.");
      reportInstall("verificando", null, temporary.size);
    }
    try {
      const info = await getInfoAsync(temporary.uri, { md5: true });
      if (!info.exists || info.isDirectory || info.size !== MODEL_BYTES || info.md5?.toLowerCase() !== MODEL_MD5) {
        throw new Error("O arquivo recebido não passou na verificação de integridade.");
      }
    } catch (error) {
      if (temporary.exists) temporary.delete();
      throw error;
    }
    const previous = modelFile();
    if (previous.exists) previous.delete();
    if (marker.exists) marker.delete();
    temporary.move(previous);
    marker.write(MODEL_SHA256);
  } catch (error) {
    // Preserve o download completo quando a verificação é interrompida.
    if (temporary.exists && temporary.size !== MODEL_BYTES) temporary.delete();
    throw cancelRequested ? new Error("Download cancelado.") : error;
  } finally {
    activeDownload = null;
    cancelRequested = false;
  }
}

export function installLocalModel(): Promise<void> {
  if (activeInstall) return activeInstall;
  activeInstall = performInstallLocalModel()
    .then(() => { reportInstall("pronto", 1, MODEL_BYTES); })
    .catch((error: unknown) => {
      reportInstall("erro", null, 0, error instanceof Error ? error.message : "Não foi possível instalar o modelo.");
      throw error;
    })
    .finally(() => { activeInstall = null; });
  return activeInstall;
}

export async function answerWithLocalModel(turns: ChatTurn[], validatedContext?: string) {
  if (!isModelInstalled()) throw new Error("Instale o modelo local antes de conversar livremente.");
  if (!context) {
    const { initLlama } = await import("llama.rn");
    context = await initLlama({ model: modelFile().uri, n_ctx: 2048, n_gpu_layers: 0 });
  }
  const recent = turns.slice(-6).map(turn => ({ role: turn.role, content: turn.content.slice(0, 600) }));
  const result = await context.completion({
    messages: [
      { role: "system", content: `Você é a assistente local da Andrade Energy. Trate cada cliente com cordialidade, paciência e respeito. Fale em português do Brasil, usando linguagem clara e breve, sem culpar a pessoa por erros. Interprete pequenos erros de ortografia pelo contexto, sem corrigir o usuário. Se houver mais de uma interpretação plausível ou faltar informação essencial, faça uma única pergunta curta para esclarecer antes de responder. Responda à pergunta antes de sugerir passos. Admita quando não souber e nunca prometa que uma ação foi concluída sem confirmação. Sobre o aplicativo, use somente estas informações verificadas: ${validatedContext || "nenhuma informação específica disponível"}. Nunca invente saldo, cobranças, dados pessoais, valores ou status de serviços. Você não executa ações nem consulta dados atuais; explique como a pessoa pode conferir no aplicativo.` },
      ...recent,
    ],
    enable_thinking: false,
    n_predict: 160,
    temperature: 0.35,
  });
  const answer = result.text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return answer || "Não consegui formular uma resposta. Tente perguntar de outro jeito.";
}

export async function releaseLocalModel() {
  if (!context) return;
  await context.release();
  context = undefined;
}
