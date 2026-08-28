import { supabase } from "../../config/supabase";

export async function obterDashboardCliente(
  clienteId: string,
  uc: string | undefined,
  empresaId: string
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
      .eq("empresa_id", empresaId)
      .single();

  if (erroCliente) throw erroCliente;

  // Faturas
  let faturasQuery = supabase
      .from("faturas")
      .select(`
        id,
        referencia,
        vencimento,
        valor_total,
        valor_total_unificado,
        status,
        economia_real,
        energia_injetada,
        energia_compensada,
        valor_usina,
        valor_andrade,
        valor_cemig,
        valor_cemig_repassado,
        custo_disponibilidade_repassado,
        diferenca_fio_b_repassada,
        valor_iluminacao_publica,
        valor_impostos,
        valor_energia_cheia,
        fatura_somente_andrade
      `)
      .eq("cliente_id", clienteId)
      .eq("empresa_id", empresaId);

  if (uc) faturasQuery = faturasQuery.eq("numero_instalacao", uc);
  const { data: faturas, error: erroFaturas } = await faturasQuery;

  if (erroFaturas) throw erroFaturas;

  // Último saldo de créditos
  const { data: credito, error: erroCredito } =
    await supabase
      .from("creditos")
      .select("saldo_atual")
      .eq("cliente_id", clienteId)
      .eq("empresa_id", empresaId)
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
