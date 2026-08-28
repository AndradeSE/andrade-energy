import api from "../config/api";

export type IdentidadeEmpresa = {
  id: string;
  slug: string;
  nome: string;
  razao_social?: string | null;
  logo_url?: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  email_suporte?: string | null;
  telefone_suporte?: string | null;
  empresa_proprietaria: boolean;
  identidade_personalizada: boolean;
};

export async function obterEmpresaAtual() {
  const { data } = await api.get<IdentidadeEmpresa>("/empresas/atual");
  return data;
}

