import { supabase } from "../../config/supabase";
import { contratoLiberaUnidade } from "./acessoContrato.policy";

export async function ucPossuiContratoAssinado(unidadeId: string, empresaId?: string) {
  let consulta = supabase
    .from("contratos")
    .select("id,unidade_consumidora_id,status,aceite_cliente_em,contrato_assinado_url,dados_documento,vigencia_fim")
    .eq("unidade_consumidora_id", unidadeId);
  if (empresaId) consulta = consulta.eq("empresa_id", empresaId);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []).some(contrato => contratoLiberaUnidade(contrato));
}

export async function exigirContratoAssinadoDaUc(unidadeId: string, empresaId?: string) {
  if (!(await ucPossuiContratoAssinado(unidadeId, empresaId))) {
    throw new Error("A UC aguarda a assinatura do contrato. O faturamento e a geração de valores permanecem bloqueados até a assinatura.");
  }
}
