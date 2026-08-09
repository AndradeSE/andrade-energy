import { supabase } from "../../config/supabase";

export async function buscarDashboard(clienteId: string) {
  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .select("id,nome,uc,distribuidora")
    .eq("id", clienteId)
    .maybeSingle();

  console.log("CLIENTE:", cliente);
  console.log("ERRO CLIENTE:", erroCliente);

  const { data: ultimaFatura, error: erroFatura } = await supabase
    .from("faturas")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("referencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("ÚLTIMA FATURA:", ultimaFatura);
  console.log("ERRO FATURA:", erroFatura);

  let historico = [];

  if (ultimaFatura?.id) {
    const { data, error } = await supabase
      .from("historico_consumo")
      .select("*")
      .eq("fatura_id", ultimaFatura.id)
      .order("competencia");

    historico = data ?? [];

    console.log("HISTÓRICO:", historico);
    console.log("ERRO HISTÓRICO:", error);
  }

  return {
    cliente,
    ultimaFatura,
    historico,
  };
}