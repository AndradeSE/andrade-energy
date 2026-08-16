import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import { importarFaturaGeradora } from "../usinas/usinas.service";
import { listarUsinas } from "../usinas/usinas.repository";
import { microsoftEmailConfigurado, obterTokenMicrosoft } from "./microsoftEmail.service";

type Mensagem = { id: string; subject?: string };
type AnexoGraph = { name?: string; contentType?: string; contentBytes?: string; "@odata.type"?: string };

async function graph<T>(token: string, rota: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`https://graph.microsoft.com/v1.0${rota}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!resposta.ok) throw new Error(`Falha ao consultar a caixa de e-mail (${resposta.status}).`);
  return resposta.status === 204 ? (undefined as T) : resposta.json() as Promise<T>;
}

export async function processarContasDeEnergiaRecebidas() {
  if (!(await microsoftEmailConfigurado())) return { processadas: 0 };
  const token = await obterTokenMicrosoft();
  if (!token) return { processadas: 0 };
  const filtro = encodeURIComponent("isRead eq false and hasAttachments eq true");
  const caixa = await graph<{ value: Mensagem[] }>(token, `/me/mailFolders/inbox/messages?$filter=${filtro}&$select=id,subject&$top=20`);
  const usinas = await listarUsinas();
  let processadas = 0;

  for (const mensagem of caixa.value ?? []) {
    const anexos = await graph<{ value: AnexoGraph[] }>(token, `/me/messages/${mensagem.id}/attachments`);
    let producaoImportada = false;
    for (const anexo of anexos.value ?? []) {
      const pdf = anexo["@odata.type"] === "#microsoft.graph.fileAttachment"
        && (anexo.contentType === "application/pdf" || anexo.name?.toLowerCase().endsWith(".pdf"));
      if (!pdf || !anexo.contentBytes) continue;
      const pasta = await mkdtemp(path.join(os.tmpdir(), "andrade-producao-"));
      const arquivo = path.join(pasta, "conta.pdf");
      try {
        await writeFile(arquivo, Buffer.from(anexo.contentBytes, "base64"));
        const dados = interpretarFatura(await extrairTextoPDF(arquivo));
        const uc = String(dados.uc ?? "").replace(/\D/g, "");
        const usina = usinas.find((item: any) => String(item.numero_instalacao ?? "").replace(/\D/g, "") === uc);
        if (!usina) continue;
        await importarFaturaGeradora(usina.id, arquivo);
        producaoImportada = true;
        processadas += 1;
      } finally {
        await rm(pasta, { recursive: true, force: true });
      }
    }
    if (producaoImportada) {
      await graph(token, `/me/messages/${mensagem.id}`, { method: "PATCH", body: JSON.stringify({ isRead: true }) });
    }
  }
  return { processadas };
}
