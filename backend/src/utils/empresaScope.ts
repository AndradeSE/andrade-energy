import { supabase } from "../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../config/empresa";

export function empresaIdDaRequisicao(req: any) {
  return String(req?.empresaId ?? req?.usuario?.empresa_id ?? EMPRESA_ANDRADE_ID);
}

export function incluirEmpresa<T extends Record<string, unknown>>(dados: T, empresaId: string) {
  return { ...dados, empresa_id: empresaId };
}

export async function garantirRegistroDaEmpresa(tabela: string, id: string, empresaId: string) {
  const { data, error } = await supabase.from(tabela).select("id").eq("id", id).eq("empresa_id", empresaId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const erro: any = new Error("Registro não encontrado para esta empresa.");
    erro.status = 404;
    throw erro;
  }
}
