import { PublicClientApplication } from "@azure/msal-node";
import dotenv from "dotenv";
import { writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config();

async function conectar() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("Preencha MICROSOFT_CLIENT_ID no backend/.env.");

  const app = new PublicClientApplication({
    auth: { clientId, authority: "https://login.microsoftonline.com/consumers" },
  });
  const resultado = await app.acquireTokenByDeviceCode({
    scopes: ["https://graph.microsoft.com/Mail.Send", "https://graph.microsoft.com/Mail.ReadWrite"],
    deviceCodeCallback: (resposta) => console.log(`\n${resposta.message}\n`),
  });
  if (!resultado) throw new Error("A autorização não foi concluída.");

  const destino = path.resolve(process.cwd(), ".microsoft-token-cache.json");
  await writeFile(destino, app.getTokenCache().serialize(), { encoding: "utf8", mode: 0o600 });
  console.log(`Hotmail conectado com sucesso: ${resultado.account?.username ?? "conta Microsoft"}`);
}

conectar().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});

