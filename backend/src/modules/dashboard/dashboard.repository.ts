import { supabase } from "../../config/supabase";

export async function buscarDashboard(clienteId: string) {

  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .select("id,nome,uc,distribuidora")
    .eq("id", clienteId)
    .single();

  console.log("CLIENTE:", cliente);
  console.log("ERRO CLIENTE:", erroCliente);

  const { data: ultimaFatura, error: erroFatura } = await supabase
    .from("faturas")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("referencia", { ascending: false })
    .limit(1)
    .single();

  console.log("ÚLTIMA FATURA:", ultimaFatura);
  console.log("ERRO FATURA:", erroFatura);

  const { data: historico, error: erroHistorico } = await supabase
    .from("historico_consumo")
    .select("*")
    .eq("fatura_id", ultimaFatura?.id)
    .order("competencia");

  console.log("HISTÓRICO:", historico);
  console.log("ERRO HISTÓRICO:", erroHistorico);

  return {
    cliente,
    ultimaFatura,
    historico,
  };
}