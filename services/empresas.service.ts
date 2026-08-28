import api from "../config/api";

export type IdentidadeEmpresa = {
  id: string;
  slug: string;
  nome: string;
  razao_social?: string | null;
  documento?: string | null;
  dominio?: string | null;
  logo_url?: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  email_suporte?: string | null;
  telefone_suporte?: string | null;
  ativo?: boolean;
  empresa_proprietaria: boolean;
  identidade_personalizada: boolean;
};

export async function obterEmpresaAtual() {
  const { data } = await api.get<IdentidadeEmpresa>("/empresas/atual");
  return data;
}

export type NovaEmpresa = {
  nome: string;
  slug?: string;
  razaoSocial?: string;
  documento?: string;
  emailSuporte?: string;
  telefoneSuporte?: string;
  dominio?: string;
  logoUrl?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  identidadePersonalizada?: boolean;
};

export async function listarEmpresas() {
  const { data } = await api.get<IdentidadeEmpresa[]>("/empresas");
  return data;
}

export async function criarEmpresa(input: NovaEmpresa) {
  const { data } = await api.post<IdentidadeEmpresa>("/empresas", input);
  return data;
}

export async function atualizarEmpresa(id: string, input: Partial<NovaEmpresa> & { ativo?: boolean }) {
  const { data } = await api.patch<IdentidadeEmpresa>(`/empresas/${id}`, input);
  return data;
}
