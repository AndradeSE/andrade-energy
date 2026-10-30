import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { obterPropostaParaConvite } from "../modules/convites/propostaConvite.service";

async function main() {
  const clienteId = process.argv[2];
  const empresaId = process.argv[3];
  if (!clienteId || !empresaId) throw new Error("Informe clienteId e empresaId.");
  const proposta = await obterPropostaParaConvite(clienteId, empresaId);
  if (!proposta) throw new Error("Cliente sem dados suficientes para gerar a proposta.");
  const diretorio = resolve(process.cwd(), "output", "pdf");
  await mkdir(diretorio, { recursive: true });
  const destino = resolve(diretorio, "previa-proposta-comercial.pdf");
  await writeFile(destino, proposta.content);
  console.log(destino);
}

void main();
