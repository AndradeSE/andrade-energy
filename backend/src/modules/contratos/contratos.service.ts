import {
    atualizarContrato,
    buscarContratoCliente,
    buscarContratoMaisRecenteUnidade,
    criarContrato,
    excluirContrato,
    salvarContratoUnidade,
} from "./contratos.repository";
import { supabase } from "../../config/supabase";
import { armazenarContratoAssinado, criarLinkContrato, gerarMinutaContrato, salvarDocumentoContrato } from "./documentosContrato.service";

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
  if (contratoDaUnidade) return anexarLinksDoContrato(contratoDaUnidade);

  // Compatibilidade para contratos antigos, criados antes do vínculo por UC.
  const { data: unidade, error } = await supabase
    .from("unidades_consumidoras")
    .select("cliente_id")
    .eq("id", unidadeId)
    .maybeSingle();
  if (error) throw error;
  const contratoLegado = unidade?.cliente_id ? await buscarContratoCliente(unidade.cliente_id, true) : null;
  return contratoLegado ? anexarLinksDoContrato(contratoLegado) : null;
}

async function anexarLinksDoContrato(contrato: any) {
  const [contratoGeradoUrl, contratoAssinadoUrl] = await Promise.all([
    criarLinkContrato(contrato.contrato_gerado_url),
    criarLinkContrato(contrato.contrato_assinado_url),
  ]);
  return { ...contrato, contrato_gerado_url: contratoGeradoUrl, contrato_assinado_url: contratoAssinadoUrl };
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
  const { data: unidadeEncontrada, error: erroUnidade } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, cliente_id, usina_id, desconto_percentual")
    .eq("id", unidadeId)
    .maybeSingle();

  if (erroUnidade) throw erroUnidade;
  if (!unidadeEncontrada) throw new Error("Unidade consumidora não encontrada.");
  const clienteIdInformado = String(dados?.clienteId ?? "").trim();
  let unidade = unidadeEncontrada;
  if (!unidade.cliente_id && clienteIdInformado) {
    const { data: cliente, error: erroCliente } = await supabase
      .from("clientes")
      .select("id")
      .eq("id", clienteIdInformado)
      .maybeSingle();
    if (erroCliente) throw erroCliente;
    if (!cliente) throw new Error("Cliente responsável não encontrado.");

    const { error: erroVinculo } = await supabase
      .from("unidades_consumidoras")
      .update({ cliente_id: cliente.id })
      .eq("id", unidade.id)
      .is("cliente_id", null);
    if (erroVinculo) throw erroVinculo;
    unidade = { ...unidade, cliente_id: cliente.id };
  }
  if (!unidade.cliente_id) throw new Error("Esta unidade não está vinculada a um cliente.");
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
    dados_documento: dados?.dados_documento && typeof dados.dados_documento === "object" ? dados.dados_documento : {},
  });
}

export async function gerarContratoDaUnidadeService(unidadeId: string, dados: any) {
  const contrato = await salvarContratoDaUnidadeService(unidadeId, dados);
  const pdf = await gerarMinutaContrato(unidadeId, contrato);
  const caminho = await salvarDocumentoContrato(`unidades/${unidadeId}/${contrato.id}/minuta-contrato.pdf`, pdf);
  const { data, error } = await supabase
    .from("contratos")
    .update({ contrato_gerado_url: caminho, gerado_em: new Date().toISOString() })
    .eq("id", contrato.id)
    .select()
    .single();
  if (error) throw error;
  return anexarLinksDoContrato(data);
}

/**
 * Anexa somente a minuta já configurada da UC ao convite. Contratos assinados
 * nunca seguem automaticamente por e-mail.
 */
export async function obterMinutaParaConvite(clienteId: string) {
  const [{ data: cliente, error: erroCliente }, { data: unidades, error: erroUnidades }] = await Promise.all([
    supabase.from("clientes").select("id,uc").eq("id", clienteId).maybeSingle(),
    supabase
      .from("unidades_consumidoras")
      .select("id,numero,status")
      .eq("cliente_id", clienteId)
      .eq("status", "ATIVA")
      .order("created_at", { ascending: true }),
  ]);
  if (erroCliente) throw erroCliente;
  if (erroUnidades) throw erroUnidades;

  const unidade = (unidades ?? []).find((item) => String(item.numero) === String(cliente?.uc)) ?? unidades?.[0];
  if (!unidade) return null;

  const contrato = await buscarContratoMaisRecenteUnidade(unidade.id);
  const dadosDocumento = contrato?.dados_documento ?? {};
  // Evita enviar uma minuta com as partes do locador incompletas.
  if (!contrato?.id || !dadosDocumento.locador_nome || !dadosDocumento.locador_documento || !dadosDocumento.locador_endereco) {
    return null;
  }

  const pdf = await gerarMinutaContrato(unidade.id, contrato);
  const caminho = await salvarDocumentoContrato(`unidades/${unidade.id}/${contrato.id}/minuta-contrato.pdf`, pdf);
  const { error: erroAtualizacao } = await supabase
    .from("contratos")
    .update({ contrato_gerado_url: caminho, gerado_em: new Date().toISOString() })
    .eq("id", contrato.id);
  if (erroAtualizacao) throw erroAtualizacao;

  return {
    filename: `minuta-contrato-uc-${String(unidade.numero).replace(/[^\dA-Za-z-]/g, "")}.pdf`,
    content: pdf,
  };
}

export async function importarContratoAssinadoDaUnidadeService(unidadeId: string, arquivo?: Express.Multer.File) {
  if (!arquivo) throw new Error("Selecione o PDF assinado.");
  if (arquivo.mimetype && arquivo.mimetype !== "application/pdf") throw new Error("Envie um arquivo PDF.");
  const contrato = await buscarContratoMaisRecenteUnidade(unidadeId);
  if (!contrato?.id) throw new Error("Gere ou salve a minuta antes de vincular o contrato assinado.");
  const caminho = await armazenarContratoAssinado(unidadeId, contrato.id, arquivo.path);
  const { data, error } = await supabase
    .from("contratos")
    .update({ contrato_assinado_url: caminho, assinado_em: new Date().toISOString(), status: "VIGENTE" })
    .eq("id", contrato.id)
    .select()
    .single();
  if (error) throw error;
  return anexarLinksDoContrato(data);
}

async function obterContratoDoClienteParaAceite(contratoId: string, usuario: any) {
  if (String(usuario?.perfil ?? "").toUpperCase() !== "LEITURA") {
    throw new Error("Somente o titular da conta pode assinar este contrato.");
  }

  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .maybeSingle();
  if (error) throw error;
  if (!contrato || !usuario?.cliente_id || contrato.cliente_id !== usuario.cliente_id) {
    throw new Error("Contrato não encontrado para esta conta.");
  }
  return contrato;
}

/** Registra o aceite no app. Não substitui um PDF assinado pelo GOV.BR/ICP-Brasil. */
export async function registrarAceiteEletronicoService(contratoId: string, usuario: any, evidencias: { ip?: string; userAgent?: string }) {
  await obterContratoDoClienteParaAceite(contratoId, usuario);
  const { data, error } = await supabase
    .from("contratos")
    .update({
      aceite_cliente_em: new Date().toISOString(),
      aceite_cliente_usuario_id: usuario.id,
      aceite_cliente_ip: evidencias.ip ?? null,
      aceite_cliente_user_agent: evidencias.userAgent ?? null,
      status: "VIGENTE",
    })
    .eq("id", contratoId)
    .select()
    .single();
  if (error) throw error;
  return anexarLinksDoContrato(data);
}

/** Permite ao titular anexar o PDF que ele assinou externamente no GOV.BR. */
export async function importarContratoAssinadoPeloClienteService(contratoId: string, usuario: any, arquivo?: Express.Multer.File) {
  if (!arquivo) throw new Error("Selecione o PDF assinado.");
  if (arquivo.mimetype && arquivo.mimetype !== "application/pdf") throw new Error("Envie um arquivo PDF.");
  const contrato = await obterContratoDoClienteParaAceite(contratoId, usuario);
  if (!contrato.unidade_consumidora_id) throw new Error("Este contrato não está vinculado a uma unidade consumidora.");
  const caminho = await armazenarContratoAssinado(contrato.unidade_consumidora_id, contrato.id, arquivo.path);
  const { data, error } = await supabase
    .from("contratos")
    .update({
      contrato_assinado_url: caminho,
      assinado_em: new Date().toISOString(),
      status: "VIGENTE",
    })
    .eq("id", contrato.id)
    .select()
    .single();
  if (error) throw error;
  return anexarLinksDoContrato(data);
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
