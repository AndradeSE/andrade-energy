import { supabase } from "../../config/supabase";
import { asaasRequest } from "../asaas/asaas.client";
import { encargosDoContratoDaUc } from "../asaas/encargosContrato.service";
import { hojeNoBrasil } from "../contratos/desligamentoContrato.policy";

type Taxas = { interest?: { value?: number }; fine?: { value?: number; type?: string } };
type CobrancaAsaas = Taxas & { status?: string; deleted?: boolean; billingType?: string; dueDate?: string; value?: number; originalValue?: number };

export async function consultarEncargosBoleto(id: string, empresaId: string) {
  const { data: fatura, error } = await supabase.from("faturas")
    .select("id,unidade_consumidora_id,referencia,status,vencimento,valor_total,valor_total_unificado,cobrancas(status,pago_em)")
    .eq("id", id).eq("empresa_id", empresaId).maybeSingle();
  if (error) throw error;
  if (!fatura || !["ABERTA", "VENCIDA"].includes(fatura.status) ||
    fatura.cobrancas?.some((c: { pago_em?: string; status: string }) => c.pago_em || ["PAGO", "PAGA", "QUITADA", "RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "CANCELADA", "CANCELADO", "DELETED", "REFUNDED"].includes(c.status))) {
    return { disponivel: false, motivo: "A fatura não consta como vencida e em aberto." };
  }
  const cobranca = await supabase.from("asaas_cobrancas").select("asaas_payment_id,status")
    .eq("empresa_id", empresaId).eq("fatura_id", id);
  if (cobranca.error) throw cobranca.error;
  const ativas = (cobranca.data ?? []).filter(c => ["PENDING", "OVERDUE"].includes(c.status));
  if (ativas.length !== 1 || !ativas[0].asaas_payment_id) {
    return { disponivel: false, motivo: "Não encontrei um único boleto ativo do Asaas para essa fatura." };
  }
  const remote = await asaasRequest<CobrancaAsaas>(`/payments/${encodeURIComponent(ativas[0].asaas_payment_id)}`);
  if (remote.deleted || !["PENDING", "OVERDUE"].includes(remote.status ?? "") || !["BOLETO", "UNDEFINED"].includes(remote.billingType ?? "")) {
    return { disponivel: false, motivo: "A cobrança do Asaas já foi encerrada ou não é um boleto em aberto." };
  }
  const hoje = hojeNoBrasil();
  const vencimento = remote.dueDate ?? fatura.vencimento;
  const dias = (Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${vencimento}T12:00:00Z`)) / 86400000;
  const principal = Number(remote.originalValue ?? remote.value ?? fatura.valor_total_unificado ?? fatura.valor_total);
  if (!Number.isInteger(dias) || dias < 1 || !Number.isFinite(principal) || principal <= 0) {
    return { disponivel: false, motivo: "O vencimento ou o valor original do boleto não pôde ser confirmado." };
  }
  const temTaxas = typeof remote.interest?.value === "number" && typeof remote.fine?.value === "number";
  const taxas = temTaxas ? remote : fatura.unidade_consumidora_id
    ? await encargosDoContratoDaUc(fatura.unidade_consumidora_id, empresaId)
    : undefined;
  const percentual = taxas?.interest?.value;
  const multaConfigurada = taxas?.fine?.value;
  if (typeof percentual !== "number" || typeof multaConfigurada !== "number" ||
    !Number.isFinite(percentual) || !Number.isFinite(multaConfigurada) || percentual < 0 || multaConfigurada < 0 ||
    (multaConfigurada > 0 && !["FIXED", "PERCENTAGE"].includes(taxas?.fine?.type ?? ""))) {
    return { disponivel: false, motivo: "As taxas desse boleto ainda não foram confirmadas." };
  }
  const centavos = Math.round(principal * 100);
  const juros = Math.round(centavos * percentual * dias / 3000);
  const multa = Math.round(taxas?.fine?.type === "FIXED" ? multaConfigurada * 100 : centavos * multaConfigurada / 100);
  return { disponivel: true, fonte: temTaxas ? "Asaas" : "contrato assinado", referencia: fatura.referencia,
    dias, dataCalculo: hoje, principal: centavos / 100, juros: juros / 100, multa: multa / 100,
    total: (centavos + juros + multa) / 100 };
}
