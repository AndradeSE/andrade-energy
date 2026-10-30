import { createHash } from "node:crypto";
import { criptografarDado, descriptografarDado } from "../../utils/sensitiveData";

export type ContextoPix = "carteira" | "comercial";
const duracao = 5 * 60_000;
const identidade = (usuario: any, segredo: string) => createHash("sha256").update(JSON.stringify([
  usuario.id, usuario.empresa_id ?? null, usuario.senha, segredo,
])).digest("hex");

// Capacidade limitada ao cadastro Pix: nunca aceita nos endpoints de transferência.
export function emitirAutorizacaoPix(usuario: any, segredo: string, passo: number, contexto: ContextoPix, agora = Date.now()) {
  return criptografarDado(JSON.stringify({ finalidade: "cadastrar-pix", contexto,
    identidade: identidade(usuario, segredo), passo, emitido: agora, expira: agora + duracao }));
}

export function verificarAutorizacaoPix(token: string, usuario: any, segredo: string, contexto: ContextoPix, agora = Date.now()): number {
  try {
    if (!token.startsWith("v1.") || token.length > 4096) throw new Error();
    const dados = JSON.parse(descriptografarDado(token));
    if (dados.finalidade !== "cadastrar-pix" || dados.contexto !== contexto ||
        dados.identidade !== identidade(usuario, segredo) ||
        !Number.isSafeInteger(dados.passo) || dados.passo < 0 ||
        !Number.isSafeInteger(dados.emitido) || !Number.isSafeInteger(dados.expira) ||
        dados.emitido > agora || dados.expira !== dados.emitido + duracao || agora >= dados.expira) throw new Error();
    return dados.passo;
  } catch {
    throw new Error("Autorização Pix expirada ou inválida. Confirme um novo código do autenticador.");
  }
}
