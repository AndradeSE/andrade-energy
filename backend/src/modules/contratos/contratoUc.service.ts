import { antecipacaoContratada } from "./vencimentoFatura.policy";
import { supabase } from "../../config/supabase";
import { contratoLiberaUnidade, ucEncerradaParaFaturamento } from "./acessoContrato.policy";

async function contratosDaUc(unidadeId: string, empresaId?: string) {
  let consulta = supabase
    .from("contratos")
    .select("id,unidade_consumidora_id,status,aceite_cliente_em,contrato_assinado_url,dados_documento,configuracao_uc_snapshot,vigencia_fim")
    .eq("unidade_consumidora_id", unidadeId);
  if (empresaId) consulta = consulta.eq("empresa_id", empresaId);
  const { data, error } = await consulta;
  if (error) throw error;
  return data ?? [];
}

export async function ucPossuiContratoAssinado(unidadeId: string, empresaId?: string) {
  return (await contratosDaUc(unidadeId, empresaId)).some(contrato => contratoLiberaUnidade(contrato));
}

export async function ucPossuiContratoEncerrado(unidadeId: string, empresaId: string) {
  return ucEncerradaParaFaturamento(await contratosDaUc(unidadeId, empresaId));
}

export async function exigirContratoAssinadoDaUc(unidadeId: string, empresaId?: string) {
  const contratos = await contratosDaUc(unidadeId, empresaId);
  if (ucEncerradaParaFaturamento(contratos)) {
    throw new Error("O contrato desta UC está encerrado. Novas faturas e cobranças estão bloqueadas.");
  }
  if (!contratos.some(contrato => contratoLiberaUnidade(contrato))) {
    throw new Error("A UC aguarda a assinatura do contrato. O faturamento e a geração de valores permanecem bloqueados até a assinatura.");
  }
}

export async function antecipacaoVencimentoDaUc(unidadeId: string, empresaId: string, hoje: string, rascunhoCriadoEm?: string) {
  const contratos = await contratosDaUc(unidadeId, empresaId);
  const dias = antecipacaoContratada(contratos, hoje);
  if (dias === 3 && rascunhoCriadoEm && contratos.some(contrato =>
    contratoLiberaUnidade(contrato, hoje) && contrato.aceite_cliente_em
    && Date.parse(contrato.aceite_cliente_em) > Date.parse(rascunhoCriadoEm)
  )) throw new Error("O contrato mudou após a criação deste rascunho. Reimporte a fatura da concessionária para conferir o novo vencimento antes de confirmar.");
  return dias;
}
