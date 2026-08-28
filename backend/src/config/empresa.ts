export const EMPRESA_ANDRADE_ID = "00000000-0000-4000-8000-000000000001";

export function empresaIdDoUsuario(usuario: any) {
  return String(usuario?.empresa_id ?? EMPRESA_ANDRADE_ID);
}

export const IDENTIDADE_ANDRADE = {
  id: EMPRESA_ANDRADE_ID,
  slug: "andrade-energy",
  nome: "Andrade Energy",
  logo_url: null,
  cor_primaria: "#087A46",
  cor_secundaria: "#F7D75C",
  empresa_proprietaria: true,
  identidade_personalizada: true,
};
