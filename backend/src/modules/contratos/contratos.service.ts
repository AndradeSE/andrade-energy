import {
    atualizarContrato,
    buscarContratoCliente,
    criarContrato,
    excluirContrato,
} from "./contratos.repository";
import { supabase } from "../../config/supabase";

export async function obterContratoCliente(
  clienteId: string
) {
  return await buscarContratoCliente(clienteId);
}

export async function criarContratoService(
  dados: any
) {
  return await criarContrato(dados);
}

export async function atualizarContratoService(
  id: string,
  dados: any
) {
  return await atualizarContrato(id, dados);
}

export async function excluirContratoService(
  id: string
) {
  await excluirContrato(id);

  return {
    sucesso: true,
  };
}

export async function cancelarContratoService(id: string) {
  const { data: contrato, error: erroContrato } = await supabase.from("contratos").select("*").eq("id", id).single();
  if (erroContrato) throw erroContrato;
  const { data: cliente, error: erroCliente } = await supabase.from("clientes").select("id, modalidade_faturamento, desconto_percentual, usina_id").eq("id", contrato.cliente_id).single();
  if (erroCliente) throw erroCliente;
  let faturaEncerramento: any = null;
  if (String(cliente.modalidade_faturamento ?? "").toUpperCase() === "COMPENSACAO") {
    const [{ data: credito }, { data: ultima }] = await Promise.all([
      supabase.from("creditos").select("saldo_atual, saldo").eq("cliente_id", cliente.id).order("competencia", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("faturas").select("numero_instalacao, usina_id, tarifa_cheia, desconto_percentual, distribuidora").eq("cliente_id", cliente.id).order("vencimento", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const saldo = Math.max(0, Number(credito?.saldo_atual ?? credito?.saldo ?? 0));
    if (saldo > 0 && ultima) {
      const tarifa = Number(ultima.tarifa_cheia ?? 0);
      const desconto = Number(cliente.desconto_percentual ?? ultima.desconto_percentual ?? 0);
      const valor = saldo * tarifa * (1 - desconto / 100);
      const referencia = `ENCERRAMENTO-${new Date().toISOString().slice(0, 7).replace("-", "/")}`;
      const { data, error } = await supabase.from("faturas").insert({ cliente_id: cliente.id, usina_id: ultima.usina_id ?? cliente.usina_id, numero_instalacao: ultima.numero_instalacao, referencia, vencimento: new Date().toISOString().slice(0, 10), consumo: saldo, consumo_kwh: saldo, energia_compensada: saldo, tarifa_cheia: tarifa, desconto_percentual: desconto, desconto_contratado_percentual: desconto, modalidade_faturamento: "COMPENSACAO", base_calculo_kwh: saldo, tarifa_andrade: tarifa * (1 - desconto / 100), valor_energia_cheia: saldo * tarifa, valor_andrade: valor, valor_usina: valor, valor_cemig: 0, valor_total_unificado: valor, valor_total: valor, economia_real: saldo * tarifa - valor, distribuidora: ultima.distribuidora, status: "ABERTA" }).select().single();
      if (error) throw error;
      faturaEncerramento = data;
    }
  }
  const contratoAtualizado = await atualizarContrato(id, { status: "CANCELADO" });
  return { contrato: contratoAtualizado, faturaEncerramento };
}
