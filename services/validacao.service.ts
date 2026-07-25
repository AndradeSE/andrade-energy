import { supabase } from "../supabase";
import { FaturaExtraida } from "../types/FaturaExtraida";

export interface ValidacaoResultado {
  valido: boolean;
  erros: string[];
}

export async function validarFatura(
  dados: FaturaExtraida
): Promise<ValidacaoResultado> {

  const erros: string[] = [];

  // Cliente

  const { data: cliente } =
    await supabase
      .from("clientes")
      .select("id, uc")
      .eq("uc", dados.uc)
      .maybeSingle();

  if (!cliente) {

    erros.push(
      "Cliente não encontrado."
    );

  }

  // Competência duplicada

  const { data: existente } =
    await supabase
      .from("faturas")
      .select("id")
      .eq("numero_instalacao", dados.uc)
      .eq("referencia", dados.referencia)
      .maybeSingle();

  if (existente) {

    erros.push(
      "Já existe uma fatura dessa competência."
    );

  }

  // Valor

  if (dados.valorTotal <= 0) {

    erros.push(
      "Valor da fatura inválido."
    );

  }

  // Consumo

  if (dados.consumo <= 0) {

    erros.push(
      "Consumo inválido."
    );

  }

  return {

    valido: erros.length === 0,

    erros,

  };

}