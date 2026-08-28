import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID, IDENTIDADE_ANDRADE, empresaIdDoUsuario } from "../../config/empresa";

const corValida = (valor: unknown, padrao: string) => {
  const cor = String(valor ?? padrao).trim();
  if (!/^#[0-9a-f]{6}$/i.test(cor)) throw new Error("Informe a cor no formato hexadecimal, por exemplo #087A46.");
  return cor.toUpperCase();
};

const slugValido = (valor: unknown) => {
  const slug = String(valor ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (slug.length < 3) throw new Error("Informe um identificador válido para a empresa.");
  return slug;
};

export async function obterEmpresaAtual(usuario: any) {
  const empresaId = empresaIdDoUsuario(usuario);
  const { data, error } = await supabase.from("empresas").select("*").eq("id", empresaId).eq("ativo", true).maybeSingle();
  if (error) throw error;
  return data ?? IDENTIDADE_ANDRADE;
}

export async function listarEmpresas(usuario: any) {
  if (usuario?.perfil !== "ADMIN") throw new Error("Acesso exclusivo da administração Andrade Energy.");
  const { data, error } = await supabase.from("empresas").select("*").order("empresa_proprietaria", { ascending: false }).order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function criarEmpresa(input: any, usuario: any) {
  if (usuario?.perfil !== "ADMIN" || empresaIdDoUsuario(usuario) !== EMPRESA_ANDRADE_ID) {
    throw new Error("Somente a administração Andrade Energy pode cadastrar empresas parceiras.");
  }
  const nome = String(input?.nome ?? "").trim();
  if (!nome) throw new Error("Informe o nome da empresa.");
  const payload = {
    slug: slugValido(input?.slug ?? nome),
    nome,
    razao_social: String(input?.razaoSocial ?? "").trim() || null,
    documento: String(input?.documento ?? "").replace(/\D/g, "") || null,
    email_suporte: String(input?.emailSuporte ?? "").trim().toLowerCase() || null,
    telefone_suporte: String(input?.telefoneSuporte ?? "").replace(/\D/g, "") || null,
    dominio: String(input?.dominio ?? "").trim().toLowerCase() || null,
    logo_url: String(input?.logoUrl ?? "").trim() || null,
    cor_primaria: corValida(input?.corPrimaria, IDENTIDADE_ANDRADE.cor_primaria),
    cor_secundaria: corValida(input?.corSecundaria, IDENTIDADE_ANDRADE.cor_secundaria),
    identidade_personalizada: Boolean(input?.identidadePersonalizada),
    empresa_proprietaria: false,
    ativo: true,
  };
  const { data, error } = await supabase.from("empresas").insert(payload).select("*").single();
  if (error?.code === "23505") throw new Error("Já existe uma empresa com esse identificador.");
  if (error) throw error;
  return data;
}

export async function atualizarEmpresa(id: string, input: any, usuario: any) {
  if (usuario?.perfil !== "ADMIN" || empresaIdDoUsuario(usuario) !== EMPRESA_ANDRADE_ID) {
    throw new Error("Somente a administração Andrade Energy pode alterar empresas parceiras.");
  }
  const payload: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (input?.nome !== undefined) payload.nome = String(input.nome).trim();
  if (input?.razaoSocial !== undefined) payload.razao_social = String(input.razaoSocial).trim() || null;
  if (input?.documento !== undefined) payload.documento = String(input.documento).replace(/\D/g, "") || null;
  if (input?.emailSuporte !== undefined) payload.email_suporte = String(input.emailSuporte).trim().toLowerCase() || null;
  if (input?.telefoneSuporte !== undefined) payload.telefone_suporte = String(input.telefoneSuporte).replace(/\D/g, "") || null;
  if (input?.dominio !== undefined) payload.dominio = String(input.dominio).trim().toLowerCase() || null;
  if (input?.logoUrl !== undefined) payload.logo_url = String(input.logoUrl).trim() || null;
  if (input?.corPrimaria !== undefined) payload.cor_primaria = corValida(input.corPrimaria, IDENTIDADE_ANDRADE.cor_primaria);
  if (input?.corSecundaria !== undefined) payload.cor_secundaria = corValida(input.corSecundaria, IDENTIDADE_ANDRADE.cor_secundaria);
  if (input?.identidadePersonalizada !== undefined) payload.identidade_personalizada = Boolean(input.identidadePersonalizada);
  if (input?.ativo !== undefined) payload.ativo = Boolean(input.ativo);
  const { data, error } = await supabase.from("empresas").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
