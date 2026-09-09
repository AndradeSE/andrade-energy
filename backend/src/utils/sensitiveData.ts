import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function chave() {
  const origem = process.env.FINANCIAL_DATA_ENCRYPTION_KEY || process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!origem) throw new Error("Chave de criptografia financeira não configurada.");
  return createHash("sha256").update(origem).digest();
}

export function criptografarDado(valor: string) {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const conteudo = Buffer.concat([cifra.update(valor, "utf8"), cifra.final()]);
  return ["v1", iv.toString("base64"), cifra.getAuthTag().toString("base64"), conteudo.toString("base64")].join(".");
}

export function descriptografarDado(valor: string) {
  if (!valor.startsWith("v1.")) return valor;
  const [, iv, tag, conteudo] = valor.split(".");
  const decifra = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  decifra.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decifra.update(Buffer.from(conteudo, "base64")), decifra.final()]).toString("utf8");
}
