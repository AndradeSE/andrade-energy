import { PublicClientApplication } from "@azure/msal-node";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SCOPES = ["https://graph.microsoft.com/Mail.Send"];
const CACHE_PATH = path.resolve(process.cwd(), ".microsoft-token-cache.json");

type Anexo = { filename: string; content: string };

async function obterToken() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) return null;

  const app = new PublicClientApplication({
    auth: {
      clientId,
      authority: "https://login.microsoftonline.com/consumers",
    },
  });

  try {
    const cache = await readFile(CACHE_PATH, "utf8");
    app.getTokenCache().deserialize(cache);
  } catch {
    return null;
  }

  const conta = (await app.getTokenCache().getAllAccounts())[0];
  if (!conta) return null;
  const resultado = await app.acquireTokenSilent({ account: conta, scopes: SCOPES });
  return resultado.accessToken;
}

export async function microsoftEmailConfigurado() {
  if (!process.env.MICROSOFT_CLIENT_ID) return false;
  try {
    await readFile(CACHE_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function enviarEmailMicrosoft(input: {
  destinatario: string;
  assunto: string;
  html: string;
  anexos: Anexo[];
}) {
  const token = await obterToken();
  if (!token) return false;

  const resposta = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: input.assunto,
        body: { contentType: "HTML", content: input.html },
        toRecipients: [{ emailAddress: { address: input.destinatario } }],
        attachments: input.anexos.map((anexo) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: anexo.filename,
          contentType: "application/pdf",
          contentBytes: anexo.content,
        })),
      },
      saveToSentItems: true,
    }),
  });
  if (!resposta.ok) throw new Error(`Falha no envio pelo Hotmail (${resposta.status}).`);
  return true;
}

