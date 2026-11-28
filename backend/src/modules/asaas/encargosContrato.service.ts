import pdf from "pdf-parse";
import { supabase } from "../../config/supabase";
import { contratoLiberaUnidade } from "../contratos/acessoContrato.policy";
import { encargosDoTextoAssinado } from "./encargosContrato.policy";
import { asaasRequest } from "./asaas.client";

type EncargosBoleto = ReturnType<typeof encargosDoTextoAssinado>;

function encargosConferem(payment: any, esperados: EncargosBoleto) {
  return payment?.interest?.value === esperados.interest.value
    && payment?.fine?.value === esperados.fine.value
    && payment?.fine?.type === esperados.fine.type;
}

export async function garantirEncargosNaEmissao(payment: any, esperados: EncargosBoleto) {
  if (!payment?.id) throw new Error("O Asaas não retornou o identificador da cobrança.");
  if (encargosConferem(payment, esperados)) return payment;

  const caminho = `/payments/${encodeURIComponent(payment.id)}`;
  const atual = await asaasRequest<any>(caminho);
  if (encargosConferem(atual, esperados)) return atual;
  if (atual.status === "PENDING") {
    await asaasRequest(caminho, { method: "PUT", body: JSON.stringify(esperados) });
    const corrigido = await asaasRequest<any>(caminho);
    if (encargosConferem(corrigido, esperados)) return corrigido;
  }
  throw new Error("O Asaas não confirmou os juros e a multa do contrato. A cobrança não foi disponibilizada pelo portal.");
}

export async function configurarEncargosDoBoleto(payment: any, unidadeId: string, empresaId: string) {
  if (!payment?.id || !["PENDING", "OVERDUE"].includes(String(payment.status).toUpperCase())) {
    throw new Error("Somente cobranças pendentes ou vencidas podem ter seus encargos configurados.");
  }
  const encargos = await encargosDoContratoDaUc(unidadeId, empresaId);
  // Nunca enviar valor/vencimento aqui: os encargos pertencem ao mesmo título.
  return asaasRequest<any>(`/payments/${encodeURIComponent(payment.id)}`, { method: "PUT", body: JSON.stringify(encargos) });
}

export async function encargosDoContratoDaUc(unidadeId: string, empresaId: string) {
  const { data, error } = await supabase.from("contratos")
    .select("id,status,unidade_consumidora_id,aceite_cliente_em,contrato_assinado_url,contrato_gerado_url,dados_documento,vigencia_fim")
    .eq("unidade_consumidora_id", unidadeId).eq("empresa_id", empresaId);
  if (error) throw error;
  const assinados = (data ?? []).filter(contrato => contratoLiberaUnidade(contrato));
  if (assinados.length !== 1) throw new Error("Não foi possível identificar um único contrato assinado para configurar os encargos desta UC.");
  const contrato = assinados[0];
  const caminho = String(contrato.contrato_assinado_url || (contrato.aceite_cliente_em ? contrato.contrato_gerado_url : "") || "");
  // Apenas objetos do bucket privado; não faz requisições a URLs externas.
  if (!caminho || /^https?:/i.test(caminho)) throw new Error("O documento assinado precisa estar disponível para conferir os encargos.");
  const documento = await supabase.storage.from("contratos").download(caminho);
  if (documento.error || !documento.data) throw new Error("Não foi possível conferir os encargos no contrato assinado.");
  if (documento.data.size > 10 * 1024 * 1024) throw new Error("O contrato excede o limite de conferência automática dos encargos.");
  const resultado = await pdf(Buffer.from(await documento.data.arrayBuffer()));
  return encargosDoTextoAssinado(resultado.text);
}
