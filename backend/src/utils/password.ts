import argon2 from "argon2";

export const senhaEstaProtegida = (valor: unknown) => String(valor ?? "").startsWith("$argon2");

export async function protegerSenha(senha: string) {
  return argon2.hash(senha, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
}

export async function conferirSenha(senha: string, armazenada: unknown) {
  const valor = String(armazenada ?? "");
  if (!valor) return false;
  if (!senhaEstaProtegida(valor)) return valor === senha;
  try { return await argon2.verify(valor, senha); } catch { return false; }
}
