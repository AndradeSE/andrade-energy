import {
  buscarUsuario,
  listarUsuarios,
  login,
} from "./auth.repository";

export async function autenticar(
  email: string,
  senha: string
) {
  const usuario = await login(email, senha);

  if (!usuario) {
    throw new Error("E-mail ou senha inválidos.");
  }

  return {
    token: "MVP_TOKEN",
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      cliente_id: usuario.cliente_id,
      usina_id: usuario.usina_id,
    },
  };
}

export {
  buscarUsuario,
  listarUsuarios
};

