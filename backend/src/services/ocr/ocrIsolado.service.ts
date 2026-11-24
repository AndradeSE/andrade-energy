import { Worker } from "node:worker_threads";
import { extrairTextoPDF } from "./ocr.service";

/** O parser pode prender o event loop; um timer no mesmo processo não basta. */
export function extrairTextoPdfIsolado(caminho: string, senha?: string): Promise<string> {
  // Netlify bundles the reader into the function and applies its own execution deadline.
  // Keep the isolated worker on the persistent server.
  if (process.env.API_RUNTIME === "serverless") return extrairTextoPDF(caminho, senha);
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require('node:worker_threads');
      require(workerData.modulo).extrairTextoPDF(workerData.caminho, workerData.senha)
        .then(texto => parentPort.postMessage({ texto }))
        .catch(() => parentPort.postMessage({ erro: 'Não foi possível ler o PDF. Confira o arquivo e, se protegido, a senha.' }));
    `, { eval: true, workerData: { modulo: require.resolve("./ocr.service"), caminho, senha } });
    let concluido = false;
    const finalizar = (erro?: Error, texto?: string) => {
      if (concluido) return;
      concluido = true;
      clearTimeout(timer);
      void worker.terminate();
      if (erro) reject(erro); else resolve(texto ?? "");
    };
    const timer = setTimeout(() => finalizar(new Error("Leitura do PDF excedeu 30 segundos.")), 30_000);
    worker.once("message", (resultado) => finalizar(resultado.erro ? new Error(resultado.erro) : undefined, resultado.texto));
    worker.once("error", () => finalizar(new Error("Falha no processo de leitura do PDF.")));
    worker.once("exit", () => finalizar(new Error("Leitura do PDF interrompida.")));
  });
}
