import { supabase } from "../../config/supabase";

export async function login(email: string, senha: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .eq("senha", senha)
    .eq("ativo", true)
    .single();

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
  const { data: emailExistente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .limit(1);
  if (emailExistente?.length) throw new Error("Já existe uma conta com este e-mail.");

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
