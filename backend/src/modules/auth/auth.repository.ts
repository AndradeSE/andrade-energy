import { supabase } from "../../config/supabase";

export async function login(email: string, senha: string, tipo?: "CONSUMIDOR" | "GERADOR") {
  let consulta = supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .eq("senha", senha)
    .eq("ativo", true);

  consulta = tipo === "CONSUMIDOR"
    ? consulta.eq("perfil", "LEITURA")
    : tipo === "GERADOR"
      ? consulta.in("perfil", ["GESTOR", "ADMIN"])
      : consulta;

  const { data, error } = await consulta.limit(1).maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

export async function buscarUsuario(id: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listarUsuarios() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("nome");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function vincularClientePorCpf(usuario: any) {
  const cpf = String(usuario?.cpf ?? "").replace(/\D/g, "");
  if (cpf.length !== 11) return usuario?.cliente_id ?? null;

  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .select("id")
    .eq("cpf", cpf)
    .limit(1)
    .maybeSingle();

  if (clienteError) throw clienteError;
  if (!cliente) return null;

  if (usuario.cliente_id !== cliente.id) {
    const { error } = await supabase
      .from("usuarios")
      .update({ cliente_id: cliente.id, cpf })
      .eq("id", usuario.id);
    if (error) throw error;
  }

  return cliente.id;
}

export async function criarConta(input: { nome: string; cpf: string; email: string; senha: string; tipo: "CONSUMIDOR" | "GERADOR"; convite?: string }) {
  const cpf = input.cpf.replace(/\D/g, "");
  const email = input.email.trim().toLowerCase();
  const perfil = input.tipo === "GERADOR" ? "GESTOR" : "LEITURA";
  const { data: emailNoMesmoPerfil } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .eq("perfil", perfil)
    .limit(1);
  if (emailNoMesmoPerfil?.length) throw new Error("Já existe uma conta deste perfil com este e-mail.");

  const { data: cpfNoMesmoPerfil } = await supabase
    .from("usuarios")
    .select("id")
    .eq("cpf", cpf)
    .eq("perfil", perfil)
    .limit(1);
  if (cpfNoMesmoPerfil?.length) throw new Error("Já existe uma conta deste perfil com este CPF.");

  const { data, error } = await supabase
    .from("usuarios")
    .insert({ nome: input.nome.trim(), cpf, email, senha: input.senha, perfil, ativo: true })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
