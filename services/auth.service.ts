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

export type FaturaCadastro = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

export async function criarContaConsumidorComFatura(payload: {
  convite: string;
  cpf: string;
  senha: string;
  fatura: FaturaCadastro;
}) {
  const formData = new FormData();
  formData.append("convite", payload.convite);
  formData.append("cpf", payload.cpf);
  formData.append("senha", payload.senha);
  formData.append("fatura", {
    uri: payload.fatura.uri,
    name: payload.fatura.name || "fatura-cemig.pdf",
    type: payload.fatura.mimeType || "application/pdf",
  } as any);

  const { data } = await api.post("/auth/cadastro-consumidor", formData, {
    timeout: 120_000,
  });
  return data as { message: string; status: string; emailEnviado: boolean };
}

export async function verificarEmailDeCadastro(token: string) {
  const { data } = await api.post("/auth/verificar-email", { token });
  return data as { message: string; status: string };
}

export async function reenviarVerificacaoDeCadastro(email: string) {
  const { data } = await api.post("/auth/reenviar-verificacao-email", { email });
  return data as { message: string; emailEnviado: boolean };
}
