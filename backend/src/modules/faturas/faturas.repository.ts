import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";

type ListarFaturasFiltro = {
  clienteId?: string;
  uc?: string;
  empresaId?: string;
};

export async function listarFaturas(
  filtro?: ListarFaturasFiltro
) {
  let query = supabase
    .from("faturas")
    .select("*, clientes(nome), cobrancas(status,pago_em)")
    .eq("empresa_id", filtro?.empresaId ?? EMPRESA_ANDRADE_ID)
    .order("referencia", {
      ascending: false,
    });

  if (filtro?.clienteId) {
    query = query.eq(
      "cliente_id",
      filtro.clienteId
    );
  }

  if (filtro?.uc) {
    query = query.eq(
      "numero_instalacao",
      filtro.uc
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

export async function buscarFatura(
  numeroInstalacao: string,
  referencia: string
) {
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq(
      "numero_instalacao",
      numeroInstalacao
    )
    .eq("referencia", referencia)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function inserirFatura(
  fatura: any
) {
  let { data, error } = await supabase
    .from("faturas")
    .insert(fatura)
    .select()
    .single();

  // Compatibilidade com bancos que ainda não receberam a coluna opcional.
  // A ausência da próxima leitura não pode impedir a emissão da fatura.
  if (error?.code === "PGRST204" && String(error.message).includes("proxima_leitura")) {
    const payloadCompativel = { ...fatura };
    delete payloadCompativel.proxima_leitura;
    const segundaTentativa = await supabase
      .from("faturas")
      .insert(payloadCompativel)
      .select()
      .single();
    data = segundaTentativa.data;
    error = segundaTentativa.error;
  }

  if (error) throw error;

  return data;
}

export async function buscarFaturaPorId(id: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("faturas")
    .select("*, clientes(id,nome,cpf,endereco,email,whatsapp), unidades_consumidoras(id,numero,titular,cpf_titular,endereco,distribuidora)")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function excluirFaturaPorId(id: string, empresaId = EMPRESA_ANDRADE_ID) {
  for (const tabela of ["notificacoes_fatura", "cobrancas", "creditos"]) {
    const { error } = await supabase.from(tabela).delete().eq("fatura_id", id).eq("empresa_id", empresaId);
    if (error && error.code !== "42P01") throw error;
  }
  const { error } = await supabase.from("faturas").delete().eq("id", id).eq("empresa_id", empresaId);
  if (error) throw error;
}
