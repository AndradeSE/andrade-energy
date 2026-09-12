import { supabase } from "../../config/supabase";
import { IDENTIDADE_ANDRADE, empresaIdDoUsuario, usuarioEhSuperAdministradorAndrade } from "../../config/empresa";
import { auditar } from "../../utils/audit";

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

const emailOpcional = (valor: unknown) => {
  const email = String(valor ?? "").replace(/\s/g, "").toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) throw new Error("Informe um e-mail válido.");
  return email || null;
};

export async function obterEmpresaAtual(usuario: any) {
  const empresaId = empresaIdDoUsuario(usuario);
  const { data, error } = await supabase.from("empresas").select("*").eq("id", empresaId).eq("ativo", true).maybeSingle();
  if (error) throw error;
  const base = data ?? IDENTIDADE_ANDRADE;
  const perfil = String(usuario?.perfil).toUpperCase();
  let geradorId = perfil === "GESTOR" ? String(usuario.id) : "";

  // O consumidor herda a identidade do gerador que o cadastrou. Assim a
  // marca acompanha toda a jornada mesmo quando ambos pertencem à empresa
  // Andrade padrão no isolamento de dados.
  if (perfil === "CONSUMIDOR" && usuario?.cliente_id) {
    const { data: vinculo, error: erroVinculo } = await supabase
      .from("solicitacoes_cadastro_clientes")
      .select("gestor_id")
      .eq("cliente_id", usuario.cliente_id)
      .not("gestor_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erroVinculo) throw erroVinculo;
    geradorId = String(vinculo?.gestor_id ?? "");
  }

  if (!geradorId) return base;
  const { data: identidade, error: erroIdentidade } = await supabase.from("identidades_geradores").select("*").eq("gerador_id", geradorId).eq("ativo", true).maybeSingle();
  if (erroIdentidade) throw erroIdentidade;
  return identidade ? { ...base, ...identidade, id: base.id, slug: base.slug, identidade_personalizada: true, identidade_gerador: true, tecnologia_andrade_energy: true } : base;
}

async function assinaturaPermiteIdentidade(geradorId: string) {
  const { data, error } = await supabase.from("assinaturas_geradores").select("id,status").eq("gerador_id", geradorId).in("status", ["ATIVA", "TESTE"]).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function obterMinhaIdentidade(usuario: any) {
  if (String(usuario?.perfil).toUpperCase() !== "GESTOR") throw new Error("A identidade própria está disponível para contas geradoras.");
  const assinatura = await assinaturaPermiteIdentidade(String(usuario.id));
  const { data, error } = await supabase.from("identidades_geradores").select("*").eq("gerador_id", usuario.id).maybeSingle();
  if (error) throw error;
  return { identidade: data, liberada: Boolean(assinatura), assinaturaStatus: assinatura?.status ?? null, padrao: IDENTIDADE_ANDRADE };
}

export async function salvarMinhaIdentidade(input: any, usuario: any) {
  if (String(usuario?.perfil).toUpperCase() !== "GESTOR") throw new Error("A identidade própria está disponível para contas geradoras.");
  if (!(await assinaturaPermiteIdentidade(String(usuario.id)))) throw new Error("Ative sua assinatura ou período de teste para personalizar a identidade.");
  const nome = String(input?.nome ?? "").trim();
  if (!nome) throw new Error("Informe o nome comercial.");
  const payload = {
    gerador_id: usuario.id,
    nome,
    logo_url: String(input?.logoUrl ?? "").trim() || null,
    cor_primaria: corValida(input?.corPrimaria, IDENTIDADE_ANDRADE.cor_primaria),
    cor_secundaria: corValida(input?.corSecundaria, IDENTIDADE_ANDRADE.cor_secundaria),
    email_suporte: emailOpcional(input?.emailSuporte),
    telefone_suporte: String(input?.telefoneSuporte ?? "").replace(/\D/g, "") || null,
    dominio: String(input?.dominio ?? "").trim().toLowerCase() || null,
    ativo: input?.ativo !== false,
    atualizado_em: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("identidades_geradores").upsert(payload, { onConflict: "gerador_id" }).select("*").single();
  if (error) throw error;
  return { ...data, identidade_personalizada: true, identidade_gerador: true, tecnologia_andrade_energy: true };
}

export async function listarEmpresas(usuario: any) {
  if (!usuarioEhSuperAdministradorAndrade(usuario)) throw new Error("Acesso exclusivo da administração Andrade Energy.");
  const { data, error } = await supabase.from("empresas").select("*").order("empresa_proprietaria", { ascending: false }).order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function criarEmpresa(input: any, usuario: any) {
  if (!usuarioEhSuperAdministradorAndrade(usuario)) {
    throw new Error("Somente a administração Andrade Energy pode cadastrar empresas parceiras.");
  }
  const nome = String(input?.nome ?? "").trim();
  if (!nome) throw new Error("Informe o nome da empresa.");
  const payload = {
    slug: slugValido(input?.slug ?? nome),
    nome,
    razao_social: String(input?.razaoSocial ?? "").trim() || null,
    documento: String(input?.documento ?? "").replace(/\D/g, "") || null,
    email_suporte: emailOpcional(input?.emailSuporte),
    telefone_suporte: String(input?.telefoneSuporte ?? "").replace(/\D/g, "") || null,
    dominio: String(input?.dominio ?? "").trim().toLowerCase() || null,
    logo_url: String(input?.logoUrl ?? "").trim() || null,
    cor_primaria: corValida(input?.corPrimaria, IDENTIDADE_ANDRADE.cor_primaria),
    cor_secundaria: corValida(input?.corSecundaria, IDENTIDADE_ANDRADE.cor_secundaria),
    identidade_personalizada: Boolean(input?.identidadePersonalizada),
    nome_remetente: String(input?.nomeRemetente ?? nome).trim(),
    email_remetente: emailOpcional(input?.emailRemetente),
    email_resposta: emailOpcional(input?.emailResposta ?? input?.emailSuporte),
    dominio_email_verificado: false,
    empresa_proprietaria: false,
    ativo: true,
  };
  const { data, error } = await supabase.from("empresas").insert(payload).select("*").single();
  if (error?.code === "23505") throw new Error("Já existe uma empresa com esse identificador.");
  if (error) throw error;
  const { error: vinculoError } = await supabase.from("empresa_usuarios").upsert({
    empresa_id: data.id,
    usuario_id: usuario.id,
    papel: "ADMIN_EMPRESA",
    principal: false,
    ativo: true,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "empresa_id,usuario_id" });
  if (vinculoError) throw vinculoError;
  await auditar({ empresaId: data.id, usuarioId: usuario.id, acao: "EMPRESA_CRIADA", recurso: "empresas", recursoId: data.id, detalhes: { nome: data.nome, slug: data.slug } });
  return data;
}

export async function atualizarEmpresa(id: string, input: any, usuario: any) {
  if (!usuarioEhSuperAdministradorAndrade(usuario)) {
    throw new Error("Somente a administração Andrade Energy pode alterar empresas parceiras.");
  }
  const payload: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (input?.nome !== undefined) payload.nome = String(input.nome).trim();
  if (input?.razaoSocial !== undefined) payload.razao_social = String(input.razaoSocial).trim() || null;
  if (input?.documento !== undefined) payload.documento = String(input.documento).replace(/\D/g, "") || null;
  if (input?.emailSuporte !== undefined) payload.email_suporte = emailOpcional(input.emailSuporte);
  if (input?.telefoneSuporte !== undefined) payload.telefone_suporte = String(input.telefoneSuporte).replace(/\D/g, "") || null;
  if (input?.dominio !== undefined) payload.dominio = String(input.dominio).trim().toLowerCase() || null;
  if (input?.logoUrl !== undefined) payload.logo_url = String(input.logoUrl).trim() || null;
  if (input?.corPrimaria !== undefined) payload.cor_primaria = corValida(input.corPrimaria, IDENTIDADE_ANDRADE.cor_primaria);
  if (input?.corSecundaria !== undefined) payload.cor_secundaria = corValida(input.corSecundaria, IDENTIDADE_ANDRADE.cor_secundaria);
  if (input?.identidadePersonalizada !== undefined) payload.identidade_personalizada = Boolean(input.identidadePersonalizada);
  if (input?.nomeRemetente !== undefined) payload.nome_remetente = String(input.nomeRemetente).trim() || null;
  if (input?.emailRemetente !== undefined) payload.email_remetente = emailOpcional(input.emailRemetente);
  if (input?.emailResposta !== undefined) payload.email_resposta = emailOpcional(input.emailResposta);
  if (input?.dominioEmailVerificado !== undefined) payload.dominio_email_verificado = Boolean(input.dominioEmailVerificado);
  if (input?.ativo !== undefined) payload.ativo = Boolean(input.ativo);
  const { data, error } = await supabase.from("empresas").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await auditar({ empresaId: id, usuarioId: usuario.id, acao: "EMPRESA_ATUALIZADA", recurso: "empresas", recursoId: id, detalhes: { campos: Object.keys(payload).filter((campo) => campo !== "atualizado_em") } });
  return data;
}

export async function listarMinhasEmpresas(usuario: any) {
  const { data, error } = await supabase
    .from("empresa_usuarios")
    .select("papel,principal,cliente_id,empresas(*)")
    .eq("usuario_id", usuario.id)
    .eq("ativo", true);
  if (error) throw error;
  return (data ?? []).map((item: any) => ({ ...item.empresas, papel: item.papel, principal: item.principal }))
    .filter((item: any) => item.ativo !== false)
    .sort((a: any, b: any) => Number(b.principal) - Number(a.principal) || String(a.nome).localeCompare(String(b.nome)));
}

export async function selecionarEmpresaAtiva(empresaId: string, usuario: any, sessaoId: string) {
  const { data: vinculo, error } = await supabase.from("empresa_usuarios")
    .select("empresa_id,cliente_id,papel,empresas(id,nome,ativo)")
    .eq("usuario_id", usuario.id).eq("empresa_id", empresaId).eq("ativo", true).maybeSingle();
  if (error) throw error;
  const empresa = Array.isArray(vinculo?.empresas) ? vinculo.empresas[0] : vinculo?.empresas;
  if (!vinculo || !empresa || empresa.ativo === false) throw new Error("Você não possui acesso a esta empresa.");
  const { error: sessaoError } = await supabase.from("sessoes_usuarios").update({ empresa_ativa_id: empresaId }).eq("id", sessaoId).eq("usuario_id", usuario.id).is("revogada_em", null);
  if (sessaoError) throw sessaoError;
  await auditar({ empresaId, usuarioId: usuario.id, acao: "EMPRESA_ATIVA_ALTERADA", recurso: "sessoes_usuarios", recursoId: sessaoId, detalhes: { empresaAnteriorId: empresaIdDoUsuario(usuario), empresaNovaId: empresaId } });
  return { empresaId, clienteId: vinculo.cliente_id ?? null, papel: vinculo.papel, empresa };
}
