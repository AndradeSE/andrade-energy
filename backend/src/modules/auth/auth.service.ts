import { buscarUsuarioPorEmail } from "./auth.repository";

export async function login(
  email: string,
  senha: string
) {
  const usuario =
    await buscarUsuarioPorEmail(email);

  if (!usuario) {
    throw new Error("Usuário não encontrado");
  }

  if (usuario.senha_hash !== senha) {
    throw new Error("Senha inválida");
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
  };
}