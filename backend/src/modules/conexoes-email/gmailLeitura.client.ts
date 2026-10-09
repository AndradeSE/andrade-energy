export type ParteGmail = {
  partId?: string;
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; data?: string; size?: number };
  parts?: ParteGmail[];
};

export function anexosPdfGmail(parte?: ParteGmail): ParteGmail[] {
  if (!parte) return [];
  const pdf = parte.mimeType === "application/pdf" || /\.pdf$/i.test(parte.filename ?? "");
  return [
    ...(pdf && (parte.body?.attachmentId || parte.body?.data) ? [parte] : []),
    ...(parte.parts ?? []).flatMap(anexosPdfGmail),
  ];
}

export async function consultarGmail<T>(token: string, caminho: string): Promise<T> {
  const resposta = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${caminho}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000),
  });
  if (!resposta.ok) {
    const detalhe = await resposta.json().catch(() => null) as any;
    const motivos = [detalhe?.error?.status, ...(detalhe?.error?.details ?? []).map((item: any) => item?.reason)];
    const codigo = motivos.includes("SERVICE_DISABLED") ? "GMAIL_API_DESATIVADA" : "GMAIL_HTTP_" + resposta.status;
    const erro = new Error(`Não foi possível consultar o Gmail (HTTP ${resposta.status}). Verifique a autorização da conta.`);
    Object.assign(erro, { codigoGmail: codigo });
    throw erro;
  }
  return resposta.json() as Promise<T>;
}

export async function listarMensagensFaturaGmail(token: string, desde: Date) {
  const query = new URLSearchParams({
    q: `from:fatura@cemig.com.br has:attachment after:${Math.floor(desde.getTime() / 1000)}`,
    maxResults: "100",
  });
  const mensagens: Array<{ id: string }> = [];
  // A janela é relida: a fila persistida, e não um cursor em memória, impede duplicação.
  do {
    const pagina = await consultarGmail<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(token, `messages?${query}`);
    mensagens.push(...pagina.messages ?? []);
    if (!pagina.nextPageToken) break;
    query.set("pageToken", pagina.nextPageToken);
  } while (true);
  return mensagens;
}

export async function baixarAnexoGmail(token: string, mensagemId: string, anexoId: string, parteId: string, limite: number) {
  const mensagem = await consultarGmail<{ payload?: ParteGmail }>(token, `messages/${encodeURIComponent(mensagemId)}?format=full`);
  const parte = anexosPdfGmail(mensagem.payload).find(p => anexoId
    ? p.body?.attachmentId === anexoId : p.partId === parteId);
  if (!parte) throw new Error("O PDF não está mais disponível no Gmail.");
  if (Number(parte.body?.size ?? 0) > limite) throw new Error("O PDF recebido excede o limite de 10 MB.");
  const corpo = parte.body?.attachmentId
    ? await consultarGmail<{ data?: string }>(token, `messages/${encodeURIComponent(mensagemId)}/attachments/${encodeURIComponent(parte.body.attachmentId)}`)
    : parte.body;
  if (!corpo?.data) throw new Error("O Gmail não retornou o conteúdo do PDF.");
  const arquivo = Buffer.from(corpo.data, "base64url");
  if (arquivo.length > limite || arquivo.subarray(0, 1024).indexOf(Buffer.from("%PDF")) < 0) {
    throw new Error("O anexo não é um PDF válido ou excede o limite de 10 MB.");
  }
  return arquivo;
}
