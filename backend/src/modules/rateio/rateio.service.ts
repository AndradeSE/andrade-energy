import { supabase } from "../../config/supabase";
import { salvarRateios } from "./rateio.repository";

export async function gerarRateio(
  fechamentoId: string,
  usinaId: string,
  energiaGerada: number
) {

  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("usina_id", usinaId);

  if (error) throw error;

  if (!clientes?.length)
    return [];

  const consumoTotal = clientes.reduce(
    (acc, cliente) =>
      acc + Number(cliente.consumo_medio || 0),
    0
  );

  const rateios = clientes.map(cliente => {

    const percentual =
      consumoTotal === 0
        ? 0
        : Number(cliente.consumo_medio) / consumoTotal;

    const energia =
      energiaGerada * percentual;

    return {

      fechamento_id: fechamentoId,

      cliente_id: cliente.id,

      percentual,

      energia,

      economia: energia * 0.18,

      valor: energia * 0.27,

    };

  });

  return salvarRateios(rateios);

}