import api from "../config/api";

export type PerfilUsuario = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string;
  telefone: string | null;
  perfil: string;
};
export async function login(
  email: string,
  senha: string,
  tipo: "CONSUMIDOR" | "GERADOR"
) {
  const { data } = await api.post(
    "/auth/login",
    {
      email,
      senha,
      tipo,
    }
  );

  return data;
}

export async function me() {
  const { data } = await api.get(
    "/auth/me"
  );

  return (data.usuario ?? data) as PerfilUsuario;
}

export async function atualizarMeuPerfil(payload: Pick<PerfilUsuario, "nome" | "email" | "telefone">) {
  const { data } = await api.put("/auth/me", payload);
  return (data.usuario ?? data) as PerfilUsuario;
}

export async function alterarMinhaSenha(payload: { senhaAtual: string; novaSenha: string }) {
  const { data } = await api.post("/auth/me/senha", payload);
  return data;
}

export async function excluirMinhaConta(senhaAtual: string) {
  const { data } = await api.delete("/auth/me", { data: { senhaAtual } });
  return data;
}

export async function criarConta(payload: { nome: string; cpf: string; email: string; senha: string; tipo: "CONSUMIDOR" | "GERADOR"; convite?: string }) {
  const { data } = await api.post("/auth/cadastro", payload);
  return data;
}
