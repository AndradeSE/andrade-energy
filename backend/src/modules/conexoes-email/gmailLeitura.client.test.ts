import assert from "node:assert/strict";
import { test } from "node:test";
import { anexosPdfGmail, baixarAnexoGmail, consultarGmail, listarMensagensFaturaGmail } from "./gmailLeitura.client";

test("encontra PDFs em MIME aninhado e ignora imagens e partes sem conteúdo", () => {
  const pdf = { partId: "2.1", filename: "CONTA.PDF", body: { attachmentId: "pdf" } };
  assert.deepEqual(anexosPdfGmail({ parts: [
    { mimeType: "image/png", body: { attachmentId: "imagem" } },
    { mimeType: "multipart/mixed", parts: [pdf, { filename: "vazio.pdf" }] },
  ] }), [pdf]);
});

test("busca remetente oficial com anexos, inclusive mensagens lidas, e percorre páginas", async t => {
  const chamadas: URL[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    chamadas.push(new URL(url));
    return Response.json(chamadas.length === 1
      ? { messages: [{ id: "a" }], nextPageToken: "pagina2" }
      : { messages: [{ id: "b" }] });
  });
  assert.deepEqual(await listarMensagensFaturaGmail("token", new Date("2026-10-09T03:00:00Z")), [{ id: "a" }, { id: "b" }]);
  assert.match(chamadas[0].searchParams.get("q")!, /from:fatura@cemig\.com\.br has:attachment after:\d+/);
  assert.doesNotMatch(chamadas[0].searchParams.get("q")!, /is:unread/);
  assert.equal(chamadas[1].searchParams.get("pageToken"), "pagina2");
});

test("baixa PDF protegido como bytes sem exigir encaminhamento ou alterar o Gmail", async t => {
  const arquivo = Buffer.from("%PDF-1.7\nPDF protegido de teste");
  const requisicoes: any[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, opcoes: any) => {
    requisicoes.push(opcoes);
    return Response.json(url.includes("/attachments/") ? { data: arquivo.toString("base64url") }
      : { payload: { parts: [{ partId: "0.1", filename: "conta.pdf", body: { attachmentId: "anexo", size: arquivo.length } }] } });
  });
  assert.deepEqual(await baixarAnexoGmail("token", "mensagem", "anexo", "0.1", 1024), arquivo);
  assert.equal(requisicoes.length, 2);
  assert.ok(requisicoes.every(r => !r.method || r.method === "GET"));
});

test("suporta PDF inline em base64url", async t => {
  const arquivo = Buffer.from("%PDF-1.7\ninline");
  t.mock.method(globalThis, "fetch", async () => Response.json({ payload: {
    partId: "1", filename: "conta.pdf", body: { data: arquivo.toString("base64url"), size: arquivo.length },
  } }));
  assert.deepEqual(await baixarAnexoGmail("token", "m", "", "1", 1024), arquivo);
});

test("recusa arquivo grande antes de baixar o anexo", async t => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ payload: {
    filename: "conta.pdf", body: { attachmentId: "anexo", size: 2048 },
  } }));
  await assert.rejects(baixarAnexoGmail("token", "m", "anexo", "", 1024), /excede/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("recusa conteúdo que não é PDF", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ payload: {
    partId: "1", filename: "conta.pdf", body: { data: Buffer.from("<html>erro</html>").toString("base64url") },
  } }));
  await assert.rejects(baixarAnexoGmail("token", "m", "", "1", 1024), /não é um PDF/);
});

test("falha de autorização não expõe token nem resposta privada do provedor", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("dados privados", { status: 401 }));
  await assert.rejects(consultarGmail("token-secreto", "messages"), erro => {
    const mensagem = String(erro);
    return mensagem.includes("401") && !mensagem.includes("token-secreto") && !mensagem.includes("dados privados");
  });
});

test("usa a parte MIME estável quando o Gmail renova o identificador do anexo", async t => {
  const arquivo = Buffer.from("%PDF-1.7\nconta");
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    urls.push(url);
    return Response.json(url.includes("/attachments/") ? { data: arquivo.toString("base64url") }
      : { payload: { parts: [{ partId: "1", filename: "conta.pdf", body: { attachmentId: "atual", size: arquivo.length } }] } });
  });
  assert.deepEqual(await baixarAnexoGmail("token", "m", "anterior", "1", 1024), arquivo);
  assert.ok(urls[1].endsWith("/attachments/atual"));
});
