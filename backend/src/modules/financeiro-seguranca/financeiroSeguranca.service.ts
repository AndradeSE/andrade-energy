import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { supabase } from "../../config/supabase";
import { conferirSenha } from "../../utils/password";
import { criptografarDado, descriptografarDado } from "../../utils/sensitiveData";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(bytes: Buffer) {
  let bits = 0, value = 0, result = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { result += ALFABETO[(value >>> (bits -= 5)) & 31]; }
  }
  if (bits) result += ALFABETO[(value << (5 - bits)) & 31];
  return result;
}
function fromBase32(secret: string) {
  let bits = 0, value = 0;
  const result: number[] = [];
  for (const character of secret) {
    const digit = ALFABETO.indexOf(character);
    if (digit < 0) throw new Error("Autenticador inválido.");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) result.push((value >>> (bits -= 8)) & 255);
  }
  return Buffer.from(result);
}
function codigoNoPasso(secret: string, passo: number) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const hash = createHmac("sha1", fromBase32(secret)).update(contador).digest();
  const offset = hash[hash.length - 1] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
async function registro(usuarioId: string) {
  const { data, error } = await supabase.from("financeiro_autenticadores").select("*").eq("usuario_id", usuarioId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function autenticadorAtivo(usuarioId: string) {
  return Boolean((await registro(usuarioId))?.confirmado);
}
export async function iniciarAutenticador(usuario: any, senhaAtual: string) {
  if (!(await conferirSenha(senhaAtual, String(usuario.senha ?? "")))) throw new Error("Senha atual incorreta.");
  const atual = await registro(usuario.id);
  if (atual?.confirmado) throw new Error("Autenticador já cadastrado. Para trocar o dispositivo, contate o suporte após validação de identidade.");
  const segredo = base32(randomBytes(20));
  const { error } = await supabase.from("financeiro_autenticadores").upsert({
    usuario_id: usuario.id,
    segredo_criptografado: criptografarDado(segredo),
    confirmado: false,
    expira_em: new Date(Date.now() + 10 * 60_000).toISOString(),
    ultimo_passo: -1,
    tentativas: 0,
    bloqueado_ate: null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw error;
  const conta = encodeURIComponent(String(usuario.email ?? usuario.id));
  return { segredo, uri: `otpauth://totp/Andrade%20Energy:${conta}?secret=${segredo}&issuer=Andrade%20Energy&algorithm=SHA1&digits=6&period=30` };
}
function passoValido(segredo: string, codigo: string, ultimoPasso: number) {
  if (!/^\d{6}$/.test(codigo)) return null;
  const atual = Math.floor(Date.now() / 30_000);
  for (const passo of [atual - 1, atual, atual + 1]) {
    if (passo <= ultimoPasso) continue;
    const esperado = Buffer.from(codigoNoPasso(segredo, passo));
    if (timingSafeEqual(Buffer.from(codigo), esperado)) return passo;
  }
  return null;
}
async function conferirCodigo(usuarioId: string, codigo: string, confirmacao: boolean, somenteValidar = false) {
  const atual = await registro(usuarioId);
  if (!atual || Boolean(atual.confirmado) === confirmacao) throw new Error(confirmacao ? "Inicie o cadastro do autenticador." : "Cadastre o aplicativo autenticador antes de operar o Pix.");
  if (confirmacao && (!atual.expira_em || new Date(atual.expira_em).getTime() < Date.now())) throw new Error("O cadastro expirou. Inicie novamente.");
  if (atual.bloqueado_ate && new Date(atual.bloqueado_ate).getTime() > Date.now()) throw new Error("Muitas tentativas. Aguarde 15 minutos.");
  const passo = passoValido(descriptografarDado(atual.segredo_criptografado), String(codigo ?? "").trim(), Number(atual.ultimo_passo));
  if (passo === null) {
    const tentativas = Number(atual.tentativas ?? 0) + 1;
    const { error } = await supabase.from("financeiro_autenticadores").update({ tentativas: tentativas >= 5 ? 0 : tentativas, bloqueado_ate: tentativas >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null }).eq("usuario_id", usuarioId).eq("tentativas", atual.tentativas);
    if (error) throw error;
    throw new Error("Código inválido ou já utilizado.");
  }
  if (somenteValidar) return;
  const { data, error } = await supabase.from("financeiro_autenticadores").update({ confirmado: true, expira_em: null, ultimo_passo: passo, tentativas: 0, bloqueado_ate: null, atualizado_em: new Date().toISOString() }).eq("usuario_id", usuarioId).eq("ultimo_passo", atual.ultimo_passo).eq("tentativas", atual.tentativas).select("usuario_id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Código já utilizado. Aguarde o próximo código e tente novamente.");
}
export async function confirmarAutenticador(usuarioId: string, codigo: string) { await conferirCodigo(usuarioId, codigo, true); return { ativo: true }; }
export async function exigirCodigoFinanceiro(usuarioId: string, codigo: string) { await conferirCodigo(usuarioId, codigo, false); }
export async function confirmarSenhaFinanceira(usuario: any, senhaAtual: string) {
  if (!(await conferirSenha(senhaAtual, String(usuario.senha ?? "")))) throw new Error("Senha atual incorreta.");
  return { confirmado: true };
}
export async function validarCodigoFinanceiro(usuario: any, senhaAtual: string, codigo: string) {
  await confirmarSenhaFinanceira(usuario, senhaAtual);
  await conferirCodigo(usuario.id, codigo, false, true);
  return { confirmado: true };
}
