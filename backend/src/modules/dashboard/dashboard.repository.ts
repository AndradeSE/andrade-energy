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

  // A concessionária pertence à UC, não ao cadastro geral do cliente. Esse
  // acesso direto também evita ambiguidades quando o consumidor possui mais
  // de uma unidade vinculada.
  let unidadeQuery = supabase
    .from("unidades_consumidoras")
    .select("numero,distribuidora")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId);
  if (uc) unidadeQuery = unidadeQuery.eq("numero", uc);
  const { data: unidade, error: erroUnidade } = await unidadeQuery
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUnidade) throw erroUnidade;

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
        custo_disponibilidade,
        custo_disponibilidade_repassado,
        valor_absorvido_disponibilidade,
        diferenca_fio_b_repassada,
        valor_absorvido_fio_b,
        valor_iluminacao_publica,
        valor_bandeira,
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
    uc: unidade?.numero ?? uc ?? cliente.uc,
    distribuidora: unidade?.distribuidora ?? cliente.distribuidora,
    creditos:
      Number(credito?.saldo_atual ?? 0),
    faturas: faturas ?? [],
  };
}
