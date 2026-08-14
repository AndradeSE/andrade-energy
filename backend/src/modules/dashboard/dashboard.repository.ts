import { supabase } from "../../config/supabase";

export async function obterDashboardCliente(
  clienteId: string
) {
  // Cliente
  const { data: cliente, error: erroCliente } =
    await supabase
      .from("clientes")
      .select(`
        id,
        nome,
        uc,
        distribuidora
      `)
      .eq("id", clienteId)
      .single();

  if (erroCliente) throw erroCliente;

  // Faturas
  const { data: faturas, error: erroFaturas } =
    await supabase
      .from("faturas")
      .select(`
        id,
        referencia,
        vencimento,
        valor_total,
        economia_real,
        energia_injetada,
        energia_compensada
      `)
      .eq("cliente_id", clienteId);

  if (erroFaturas) throw erroFaturas;

  // Último saldo de créditos
  const { data: credito, error: erroCredito } =
    await supabase
      .from("creditos")
      .select("saldo_atual")
      .eq("cliente_id", clienteId)
      .order("competencia", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (erroCredito) throw erroCredito;

  return {
    ...cliente,
    creditos:
      Number(credito?.saldo_atual ?? 0),
    faturas: faturas ?? [],
  };
}