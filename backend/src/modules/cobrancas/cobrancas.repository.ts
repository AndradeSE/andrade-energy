import { supabase } from "../../config/supabase";

export async function criarCobranca({
  clienteId,
  faturaId,
  valor,
  vencimento,
}: {
  clienteId: string;
  faturaId: string;
  valor: number;
  vencimento: string;
}) {

  const { error } = await supabase
    .from("cobrancas")
    .insert({
      cliente_id: clienteId,
      fatura_id: faturaId,
      valor,
      vencimento,
      status: "ABERTA",
    });

  if (error) throw error;

}

export async function listarCobrancasPendentes() {

  const { data, error } = await supabase
    .from("cobrancas")
    .select(`
      *,
      clientes (
        nome,
        telefone
      ),
      faturas (
        referencia
      )
    `)
    .neq("status", "PAGA")
    .order("vencimento");

  if (error) throw error;

  return data ?? [];

}