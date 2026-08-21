import {
    atualizarContrato,
    buscarContratoCliente,
    buscarContratoMaisRecenteUnidade,
    criarContrato,
    excluirContrato,
    salvarContratoUnidade,
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

export async function obterContratoDaUnidade(
  unidadeId: string
) {
  const contratoDaUnidade = await buscarContratoMaisRecenteUnidade(unidadeId);
  if (contratoDaUnidade) return contratoDaUnidade;

  // Compatibilidade para contratos antigos, criados antes do vínculo por UC.
  const { data: unidade, error } = await supabase
    .from("unidades_consumidoras")
    .select("cliente_id")
    .eq("id", unidadeId)
    .maybeSingle();
  if (error) throw error;
  return unidade?.cliente_id ? await buscarContratoCliente(unidade.cliente_id, true) : null;
}

function normalizarNumero(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizarPercentual(valor: unknown) {
  const numero = Number(String(valor ?? "").replace(",", "."));
  if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
    throw new Error("Informe um desconto entre 0% e 100%.");
  }
  return numero;
}

function normalizarStatus(valor: unknown) {
  const status = String(valor ?? "ATIVO").trim().toUpperCase();
  if (!["ATIVO", "VIGENTE", "VENCIDO", "CANCELADO"].includes(status)) {
    throw new Error("Informe um status de contrato válido.");
  }
  return status;
}

function normalizarMoeda(valor: unknown) {
  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || valor < 0) throw new Error("Informe uma economia estimada válida.");
    return valor;
  }

  const original = String(valor ?? "").trim();
  const texto = original.includes(",")
    ? original.replace(/\./g, "").replace(",", ".")
    : original;
  if (!texto) return 0;
  const numero = Number(texto);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error("Informe uma economia estimada válida.");
  }
  return numero;
}

function normalizarData(valor: unknown, rotulo: string) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;

  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  const iso = brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : texto;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`${rotulo} deve estar no formato DD/MM/AAAA.`);
  }

  const data = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) {
    throw new Error(`${rotulo} é inválida.`);
  }
  return iso;
}

/** O contrato é individual da UC, mantendo cliente e usina para compatibilidade. */
export async function salvarContratoDaUnidadeService(
  unidadeId: string,
  dados: any
) {
  const { data: unidade, error: erroUnidade } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, cliente_id, usina_id, desconto_percentual")
    .eq("id", unidadeId)
    .maybeSingle();

  if (erroUnidade) throw erroUnidade;
  if (!unidade?.cliente_id) throw new Error("Esta unidade não está vinculada a um cliente.");
  if (!unidade.usina_id) throw new Error("Aloque a UC em uma usina antes de cadastrar o contrato.");

  const numero = normalizarNumero(dados?.numero);
  if (!numero) throw new Error("Informe o número do contrato.");

  const vigenciaInicio = normalizarData(dados?.vigencia_inicio, "A data de início");
  const vigenciaFim = normalizarData(dados?.vigencia_fim, "A data de vencimento");
  if (vigenciaInicio && vigenciaFim && vigenciaFim < vigenciaInicio) {
    throw new Error("A data de vencimento deve ser posterior à data de início.");
  }

  const economiaMensal = normalizarMoeda(dados?.economia_mensal_estimada);
  const desconto = normalizarPercentual(
    normalizarNumero(dados?.desconto) || unidade.desconto_percentual || 0
  );

  return await salvarContratoUnidade(unidade.id, {
    cliente_id: unidade.cliente_id,
    usina_id: unidade.usina_id,
    unidade_consumidora_id: unidade.id,
    numero,
    status: normalizarStatus(dados?.status),
    desconto,
    termo_adesao: normalizarNumero(dados?.termo_adesao) || null,
    unidades_consumidoras: 1,
    data_assinatura: normalizarData(dados?.data_assinatura, "A data de assinatura"),
    vigencia_inicio: vigenciaInicio,
    vigencia_fim: vigenciaFim,
    economia_mensal_estimada: economiaMensal,
    economia_anual_estimada: normalizarMoeda(dados?.economia_anual_estimada) || economiaMensal * 12,
    observacoes: normalizarNumero(dados?.observacoes) || null,
  });
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
  const [{ data: cliente, error: erroCliente }, { data: unidade, error: erroUnidade }] = await Promise.all([
    supabase.from("clientes").select("id, modalidade_faturamento, desconto_percentual, usina_id").eq("id", contrato.cliente_id).single(),
    contrato.unidade_consumidora_id
      ? supabase.from("unidades_consumidoras").select("id, numero, modalidade_faturamento, desconto_percentual, usina_id").eq("id", contrato.unidade_consumidora_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (erroCliente) throw erroCliente;
  if (erroUnidade) throw erroUnidade;

  let faturaEncerramento: any = null;
  const modalidade = String(unidade?.modalidade_faturamento ?? cliente.modalidade_faturamento ?? "").toUpperCase();
  if (modalidade === "COMPENSACAO") {
    let ultimaQuery = supabase
      .from("faturas")
      .select("id, numero_instalacao, unidade_consumidora_id, usina_id, tarifa_cheia, desconto_percentual, distribuidora")
      .eq("cliente_id", cliente.id)
      .order("vencimento", { ascending: false })
      .limit(1);

    if (contrato.unidade_consumidora_id) {
      ultimaQuery = ultimaQuery.eq("unidade_consumidora_id", contrato.unidade_consumidora_id);
    }
    const { data: ultima, error: erroUltima } = await ultimaQuery.maybeSingle();
    if (erroUltima) throw erroUltima;

    // Créditos não têm UC própria. Para contratos por UC, usamos somente o
    // crédito vinculado à última fatura daquela UC, evitando cobrar outra UC.
    let creditoQuery = supabase
      .from("creditos")
      .select("saldo_atual, saldo")
      .eq("cliente_id", cliente.id)
      .order("competencia", { ascending: false })
      .limit(1);
    if (contrato.unidade_consumidora_id) {
      if (!ultima?.id) creditoQuery = creditoQuery.eq("fatura_id", "__sem_fatura_da_uc__");
      else creditoQuery = creditoQuery.eq("fatura_id", ultima.id);
    }
    const { data: credito, error: erroCredito } = await creditoQuery.maybeSingle();
    if (erroCredito) throw erroCredito;

    const saldo = Math.max(0, Number(credito?.saldo_atual ?? credito?.saldo ?? 0));
    if (saldo > 0 && ultima) {
      const tarifa = Number(ultima.tarifa_cheia ?? 0);
      const desconto = Number(unidade?.desconto_percentual ?? contrato.desconto ?? cliente.desconto_percentual ?? ultima.desconto_percentual ?? 0);
      const valor = saldo * tarifa * (1 - desconto / 100);
      const referencia = `ENCERRAMENTO-${new Date().toISOString().slice(0, 7).replace("-", "/")}`;
      const { data, error } = await supabase.from("faturas").insert({ cliente_id: cliente.id, usina_id: ultima.usina_id ?? unidade?.usina_id ?? cliente.usina_id, unidade_consumidora_id: contrato.unidade_consumidora_id ?? ultima.unidade_consumidora_id ?? null, numero_instalacao: ultima.numero_instalacao ?? unidade?.numero, referencia, vencimento: new Date().toISOString().slice(0, 10), consumo: saldo, consumo_kwh: saldo, energia_compensada: saldo, tarifa_cheia: tarifa, desconto_percentual: desconto, desconto_contratado_percentual: desconto, modalidade_faturamento: "COMPENSACAO", base_calculo_kwh: saldo, tarifa_andrade: tarifa * (1 - desconto / 100), valor_energia_cheia: saldo * tarifa, valor_andrade: valor, valor_usina: valor, valor_cemig: 0, valor_total_unificado: valor, valor_total: valor, economia_real: saldo * tarifa - valor, distribuidora: ultima.distribuidora, status: "ABERTA" }).select().single();
      if (error) throw error;
      faturaEncerramento = data;
    }
  }
  const contratoAtualizado = await atualizarContrato(id, { status: "CANCELADO" });
  return { contrato: contratoAtualizado, faturaEncerramento };
}
