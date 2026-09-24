import {
    atualizarContrato,
    buscarContratoCliente,
    buscarContratoMaisRecenteUnidade,
    buscarRascunhoAtualUnidade,
    criarContrato,
    excluirContrato,
    salvarContratoUnidade,
    suspenderVigenciasAnteriores,
    restaurarVigencias,
} from "./contratos.repository";
import { supabase } from "../../config/supabase";
import crypto from "crypto";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { armazenarContratoAssinado, criarLinkContrato, gerarMinutaContrato, salvarDocumentoContrato } from "./documentosContrato.service";
import { obterPropostaParaConvite } from "../convites/propostaConvite.service";
import { criarNotificacaoApp } from "../notificacoes/push.service";
import { contratoAceitaSolicitacaoCancelamento, processamentoCancelamentoExpirou } from "./cancelamentoContrato.policy";

export async function obterContratoCliente(
  clienteId: string,
  empresaId: string,
) {
  return await buscarContratoCliente(clienteId, false, empresaId);
}

export async function listarContratosDaEmpresa(empresaId: string) {
  const { data, error } = await supabase.from("contratos")
    .select("*, clientes(nome), unidades_consumidoras(numero,titular)")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function criarContratoService(
  dados: any
) {
  return await criarContrato(dados);
}

export async function obterContratoDaUnidade(
  unidadeId: string,
  preferirRascunho = false,
  empresaId?: string,
  preferirRevisaoEnviada = false,
) {
  let contratoDaUnidade: any;
  if (preferirRevisaoEnviada) {
    const rascunho = await buscarRascunhoAtualUnidade(unidadeId, empresaId);
    const anteriorId = rascunho?.dados_documento?.contrato_anterior_id;
    const enviado = rascunho?.dados_documento?.envio_email_concluido === true;
    contratoDaUnidade = anteriorId && (enviado || rascunho?.dados_documento?.aceite_cliente_exigido === true)
      && (rascunho.contrato_gerado_url || rascunho.contrato_assinado_url) && !rascunho.aceite_cliente_em
      ? rascunho : null;
    if (!contratoDaUnidade) {
      let revisoesQuery = supabase.from("contratos").select("*")
        .eq("unidade_consumidora_id", unidadeId).eq("status", "ATIVO")
        .not("contrato_assinado_url", "is", null)
        .is("aceite_cliente_em", null)
        .order("updated_at", { ascending: false }).limit(10);
      if (empresaId) revisoesQuery = revisoesQuery.eq("empresa_id", empresaId);
      const { data: revisoes, error: erroRevisoes } = await revisoesQuery;
      if (erroRevisoes) throw erroRevisoes;
      contratoDaUnidade = (revisoes ?? []).find(item => item.dados_documento?.aceite_cliente_exigido === true
        && item.dados_documento?.contrato_anterior_id) ?? null;
    }
  }
  if (!contratoDaUnidade && preferirRascunho) {
    contratoDaUnidade = await buscarRascunhoAtualUnidade(unidadeId, empresaId)
      ?? await buscarContratoMaisRecenteUnidade(unidadeId, empresaId);
  } else if (!contratoDaUnidade) {
    let contratosQuery = supabase.from("contratos").select("*")
      .eq("unidade_consumidora_id", unidadeId)
      .in("status", ["ATIVO", "VIGENTE"])
      .order("updated_at", { ascending: false });
    if (empresaId) contratosQuery = contratosQuery.eq("empresa_id", empresaId);
    const { data: contratos, error } = await contratosQuery;
    if (error) throw error;
    contratoDaUnidade = (!preferirRevisaoEnviada ? (contratos ?? []).find((item) =>
      item.dados_documento?.assinatura_externa_pendente === true
    ) : null) ?? (contratos ?? []).find((item) =>
      item.aceite_cliente_em
      || item.contrato_assinado_url
      || String(item.status ?? "").toUpperCase() === "VIGENTE"
    ) ?? contratos?.[0] ?? null;
  }
  if (contratoDaUnidade) {
    const anteriorId = preferirRevisaoEnviada ? contratoDaUnidade.dados_documento?.contrato_anterior_id : null;
    if (anteriorId) {
      const { data: anterior, error: erroAnterior } = await supabase.from("contratos")
        .select("id,numero,versao,configuracao_uc_snapshot,desconto")
        .eq("id", anteriorId).eq("unidade_consumidora_id", unidadeId)
        .eq("empresa_id", contratoDaUnidade.empresa_id).maybeSingle();
      if (erroAnterior) throw erroAnterior;
      return anexarLinksDoContrato({ ...contratoDaUnidade, revisao_anterior: anterior ?? null });
    }
    return anexarLinksDoContrato(contratoDaUnidade);
  }

  // Compatibilidade para contratos antigos, criados antes do vínculo por UC.
  let unidadeQuery = supabase
    .from("unidades_consumidoras")
    .select("cliente_id")
    .eq("id", unidadeId);
  if (empresaId) unidadeQuery = unidadeQuery.eq("empresa_id", empresaId);
  const { data: unidade, error } = await unidadeQuery.maybeSingle();
  if (error) throw error;
  const contratoLegado = unidade?.cliente_id ? await buscarContratoCliente(unidade.cliente_id, true, empresaId) : null;
  return contratoLegado ? anexarLinksDoContrato(contratoLegado) : null;
}

async function anexarLinksDoContrato(contrato: any) {
  const [contratoGeradoUrl, contratoAssinadoUrl, arquivoPdfUrl] = await Promise.all([
    criarLinkContrato(contrato.contrato_gerado_url),
    criarLinkContrato(contrato.contrato_assinado_url),
    criarLinkContrato(contrato.arquivo_pdf),
  ]);
  const documentoAceitoUrl = contratoAssinadoUrl
    ?? (contrato.aceite_cliente_em ? contratoGeradoUrl ?? arquivoPdfUrl : null);
  return {
    ...contrato,
    contrato_gerado_url: contratoGeradoUrl ?? arquivoPdfUrl,
    contrato_assinado_url: documentoAceitoUrl,
    arquivo_pdf: arquivoPdfUrl,
  };
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
    .select("id, empresa_id, numero, cliente_id, usina_id, desconto_percentual, modalidade_faturamento, tipo_gd, percentual_rateio, percentual_repasse_disponibilidade, fatura_somente_andrade, repassar_disponibilidade_gd1, repassar_disponibilidade_gd2, repassar_diferenca_fio_b_gd2, usinas(titularidade_ucs_recebedoras)")
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
  const dadosDocumentoEntrada = dados?.dados_documento && typeof dados.dados_documento === "object" ? dados.dados_documento : {};
  const prazoAnos = Math.max(1, Number.parseInt(String(dadosDocumentoEntrada.prazo_anos ?? "10"), 10) || 10);
  let vigenciaFim = normalizarData(dados?.vigencia_fim, "A data de vencimento");
  if (vigenciaInicio) {
    const inicioData = new Date(`${vigenciaInicio}T12:00:00`);
    inicioData.setFullYear(inicioData.getFullYear() + prazoAnos);
    vigenciaFim = inicioData.toISOString().slice(0, 10);
  }
  if (vigenciaInicio && vigenciaFim && vigenciaFim < vigenciaInicio) {
    throw new Error("A data de vencimento deve ser posterior à data de início.");
  }

  const proposta = unidade.empresa_id
    ? await obterPropostaParaConvite(unidade.cliente_id, unidade.empresa_id, unidade.id)
    : null;
  const economiaMensal = proposta?.resumo?.economiaMensalEstimada ?? normalizarMoeda(dados?.economia_mensal_estimada);
  const economiaAnual = proposta?.resumo?.economiaAnualEstimada ?? economiaMensal * 12;
  const desconto = normalizarPercentual(
    normalizarNumero(dados?.desconto) || unidade.desconto_percentual || 0
  );
  const configuracaoUc = {
    usina_id: unidade.usina_id,
    modalidade_faturamento: unidade.modalidade_faturamento,
    desconto_percentual: desconto,
    tipo_gd: unidade.tipo_gd,
    percentual_rateio: unidade.percentual_rateio,
    percentual_repasse_disponibilidade: unidade.percentual_repasse_disponibilidade,
    fatura_somente_andrade: unidade.fatura_somente_andrade,
    repassar_disponibilidade_gd1: unidade.repassar_disponibilidade_gd1,
    repassar_disponibilidade_gd2: unidade.repassar_disponibilidade_gd2,
    repassar_diferenca_fio_b_gd2: unidade.repassar_diferenca_fio_b_gd2,
    titularidade_ucs: String((Array.isArray(unidade.usinas) ? unidade.usinas[0] : unidade.usinas as any)?.titularidade_ucs_recebedoras ?? "GERADOR").toUpperCase(),
  };

  return await salvarContratoUnidade(unidade.id, {
    empresa_id: unidade.empresa_id,
    cliente_id: unidade.cliente_id,
    usina_id: unidade.usina_id,
    unidade_consumidora_id: unidade.id,
    numero,
    // Rascunho só passa a VIGENTE pelo aceite eletrônico ou pela validação
    // explícita de um PDF assinado.
    status: "ATIVO",
    desconto,
    termo_adesao: normalizarNumero(dados?.termo_adesao) || null,
    unidades_consumidoras: 1,
    data_assinatura: normalizarData(dados?.data_assinatura, "A data de assinatura"),
    vigencia_inicio: vigenciaInicio,
    vigencia_fim: vigenciaFim,
    economia_mensal_estimada: economiaMensal,
    economia_anual_estimada: economiaAnual,
    observacoes: normalizarNumero(dados?.observacoes) || null,
    dados_documento: { ...dadosDocumentoEntrada, prazo_anos: prazoAnos, titularidade_ucs: configuracaoUc.titularidade_ucs, configuracao_uc: configuracaoUc },
    configuracao_uc_snapshot: configuracaoUc,
    revisao_configuracao_pendente: false,
    // Dados alterados exigem nova minuta. Não enviar nem assinar PDF anterior.
    contrato_gerado_url: null,
    gerado_em: null,
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
  const contrato = await buscarRascunhoAtualUnidade(unidadeId) ?? await buscarContratoMaisRecenteUnidade(unidadeId);
  if (!contrato?.id) throw new Error("Gere ou salve a minuta antes de vincular o contrato assinado.");
  return salvarPdfAssinadoPendente(contrato, unidadeId, arquivo.path);
}

function pdfExternoAguardandoRevisao(contrato: any) {
  return Boolean(
    contrato?.contrato_assinado_url
    && contrato?.dados_documento?.assinatura_externa_pendente === true
    && !contrato?.dados_documento?.assinatura_externa_validada_em,
  );
}

async function salvarPdfAssinadoPendente(contrato: any, unidadeId: string, arquivoTemporario: string) {
  if (contrato.aceite_cliente_em) {
    throw new Error("Este contrato já foi assinado no aplicativo e não pode receber outro documento.");
  }
  const substituindo = Boolean(contrato.contrato_assinado_url);
  if (substituindo && !pdfExternoAguardandoRevisao(contrato)) {
    throw new Error("Este PDF já foi validado. Para alterá-lo, crie uma nova revisão contratual.");
  }

  const agora = new Date().toISOString();
  const caminho = await armazenarContratoAssinado(unidadeId, contrato.id, arquivoTemporario);
  const dadosDocumento = {
    ...(contrato.dados_documento ?? {}),
    assinatura_externa_pendente: true,
    assinatura_externa_enviada_em: agora,
    assinatura_externa_validada_em: null,
    assinatura_externa_validada_por: null,
    assinatura_externa_validacao: null,
    assinatura_externa_reenvios: Number(contrato.dados_documento?.assinatura_externa_reenvios ?? 0) + (substituindo ? 1 : 0),
  };

  let atualizacao = supabase
    .from("contratos")
    .update({
      contrato_assinado_url: caminho,
      assinado_em: agora,
      status: contrato.dados_documento?.contrato_anterior_id ? "RASCUNHO" : "ATIVO",
      dados_documento: dadosDocumento,
    })
    .eq("id", contrato.id)
    .is("aceite_cliente_em", null);
  atualizacao = substituindo
    ? atualizacao.eq("contrato_assinado_url", contrato.contrato_assinado_url)
    : atualizacao.is("contrato_assinado_url", null);
  const { data, error } = await atualizacao.select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("O PDF foi alterado durante o envio. Reabra o contrato e tente novamente.");

  // Uma revisão não interrompe o contrato anterior enquanto o cliente decide.
  if (!contrato.dados_documento?.contrato_anterior_id) {
    const { error: erroBloqueio } = await supabase
      .from("unidades_consumidoras")
      .update({ status: "PENDENTE_CONTRATO" })
      .eq("id", unidadeId)
      .eq("empresa_id", contrato.empresa_id);
    if (erroBloqueio) throw erroBloqueio;
  }

  return anexarLinksDoContrato(data);
}

async function obterContratoDoClienteParaAceite(contratoId: string, usuario: any) {
  const { data: contrato, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("id", contratoId)
    .maybeSingle();
  if (error) throw error;
  if (!contrato) {
    throw new Error("Contrato não encontrado para esta conta.");
  }

  // O perfil global pode ser GESTOR quando a mesma pessoa também administra
  // uma geradora. A titularidade é o vínculo LEITURA desta empresa e cliente.
  const { data: vinculoTitular, error: erroVinculo } = await supabase
    .from("empresa_usuarios")
    .select("id")
    .eq("usuario_id", usuario.id)
    .eq("empresa_id", contrato.empresa_id)
    .eq("cliente_id", contrato.cliente_id)
    .eq("papel", "LEITURA")
    .eq("ativo", true)
    .maybeSingle();
  if (erroVinculo) throw erroVinculo;
  if (!vinculoTitular) throw new Error("Somente o titular da conta pode assinar este contrato.");
  return contrato;
}

const hashAssinatura = (valor: string) => crypto.createHash("sha256").update(valor).digest("hex");

async function identidadeDocumentoParaAssinatura(contrato: any) {
  const aceiteExterno = contrato.dados_documento?.aceite_cliente_exigido === true
    && Boolean(contrato.contrato_assinado_url && contrato.dados_documento?.assinatura_externa_validada_em);
  if (contrato.aceite_cliente_em || (contrato.contrato_assinado_url && !aceiteExterno)) throw new Error("Este contrato já possui uma assinatura registrada.");
  if (["CANCELADO", "SUBSTITUIDO", "VENCIDO"].includes(String(contrato.status).toUpperCase())) throw new Error("Este contrato não está disponível para assinatura.");
  if (contrato.dados_documento?.contrato_anterior_id && !aceiteExterno && contrato.dados_documento?.envio_email_concluido !== true) {
    throw new Error("A revisão ainda não foi enviada ao cliente.");
  }
  const caminho = String(aceiteExterno ? contrato.contrato_assinado_url : contrato.contrato_gerado_url ?? "");
  if (!caminho || /^https?:/i.test(caminho)) throw new Error("Gere a minuta no sistema antes de solicitar a assinatura.");
  const { data: pdf, error } = await supabase.storage.from("contratos").download(caminho);
  if (error || !pdf) throw new Error("Não foi possível verificar o PDF do contrato.");
  const documentoHash = crypto.createHash("sha256").update(Buffer.from(await pdf.arrayBuffer())).digest("hex");
  const versaoHash = hashAssinatura(JSON.stringify({ documentoHash, id: contrato.id, dados: contrato.dados_documento, configuracao: contrato.configuracao_uc_snapshot, inicio: contrato.vigencia_inicio, fim: contrato.vigencia_fim }));
  return { documentoHash, versaoHash };
}

export async function solicitarCodigoAssinaturaService(contratoId: string, usuario: any) {
  const contrato = await obterContratoDoClienteParaAceite(contratoId, usuario);
  const revisao = Boolean(contrato.dados_documento?.contrato_anterior_id);
  const aceiteExterno = contrato.dados_documento?.aceite_cliente_exigido === true;
  const email = String(usuario?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Sua conta não possui um e-mail válido para confirmar a assinatura.");
  if (!contrato.contrato_gerado_url && !contrato.arquivo_pdf && !contrato.contrato_assinado_url) throw new Error("O documento precisa estar disponível antes da confirmação.");

  const codigo = String(crypto.randomInt(100000, 1000000));
  const identidade = await identidadeDocumentoParaAssinatura(contrato);
  const expiraEm = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await supabase.from("contratos_codigos_assinatura").upsert({
    contrato_id: contratoId,
    usuario_id: usuario.id,
    codigo_hash: hashAssinatura(`${codigo}:${identidade.versaoHash}:${usuario.id}`),
    expira_em: expiraEm,
    tentativas: 0,
    criado_em: new Date().toISOString(),
  }, { onConflict: "contrato_id" });
  if (error) throw error;

  const enviado = await enviarEmailTransacional({
    empresaId: contrato.empresa_id,
    destinatario: email,
    assunto: aceiteExterno ? "Código para aceitar seu contrato assinado" : revisao ? "Código para concordar com a revisão contratual" : "Código para assinar seu contrato",
    html: `<div style="font-family:Arial,sans-serif;color:#153b30"><h2>${aceiteExterno ? "Confirmação do aceite do contrato assinado" : revisao ? "Confirmação da revisão contratual" : "Confirmação da assinatura"}</h2><p>Use o código abaixo para ${aceiteExterno ? "aceitar o contrato já assinado" : revisao ? "concordar com a nova versão do contrato" : "confirmar a assinatura do contrato"} <strong>${String(contrato.numero ?? "").replace(/[<>]/g, "")}</strong>:</p><div style="font-size:30px;font-weight:800;letter-spacing:8px;margin:24px 0">${codigo}</div><p>O código expira em 10 minutos. Se você não iniciou esta ação, ignore este e-mail.</p></div>`,
  });
  if (!enviado) throw new Error("Não foi possível enviar o código de assinatura. Tente novamente.");
  return { enviado: true, emailMascarado: email.replace(/^(.{2}).*(@.*)$/, "$1***$2"), expiraEm };
}

/** Registra assinatura desenhada, código confirmado e evidências técnicas do aceite. */
export async function registrarAceiteEletronicoService(contratoId: string, usuario: any, dados: any, evidencias: { ip?: string; userAgent?: string }) {
  const contrato = await obterContratoDoClienteParaAceite(contratoId, usuario);
  const codigo = String(dados?.codigo ?? "").replace(/\D/g, "");
  const assinatura = Array.isArray(dados?.assinatura) ? dados.assinatura : [];
  const anteriorId = String(contrato.dados_documento?.contrato_anterior_id ?? "");
  const aceiteExterno = contrato.dados_documento?.aceite_cliente_exigido === true
    && Boolean(contrato.contrato_assinado_url && contrato.dados_documento?.assinatura_externa_validada_em);
  const aceiteRevisao = dados?.aceiteRevisao === true && (Boolean(anteriorId) || aceiteExterno);
  if (codigo.length !== 6) throw new Error("Informe o código de seis dígitos enviado ao seu e-mail.");
  if (!aceiteRevisao && (!assinatura.length || JSON.stringify(assinatura).length < 80)) throw new Error("Faça sua assinatura no campo indicado.");
  if (aceiteRevisao && anteriorId) {
    const { data: anterior, error: erroAnterior } = await supabase.from("contratos")
      .select("id,aceite_cliente_em,contrato_assinado_url,status")
      .eq("id", anteriorId).eq("unidade_consumidora_id", contrato.unidade_consumidora_id)
      .eq("cliente_id", contrato.cliente_id)
      .eq("empresa_id", contrato.empresa_id).maybeSingle();
    if (erroAnterior) throw erroAnterior;
    if (!anterior || (!anterior.aceite_cliente_em && !anterior.contrato_assinado_url)) {
      throw new Error("O contrato anterior assinado não foi encontrado. Esta revisão exige assinatura completa.");
    }
  }

  const { data: confirmacao, error: erroCodigo } = await supabase
    .from("contratos_codigos_assinatura")
    .select("*")
    .eq("contrato_id", contratoId)
    .eq("usuario_id", usuario.id)
    .maybeSingle();
  if (erroCodigo) throw erroCodigo;
  if (!confirmacao || new Date(confirmacao.expira_em).getTime() < Date.now()) throw new Error("O código expirou. Solicite um novo código.");
  if (confirmacao.tentativas >= 5) throw new Error("Limite de tentativas atingido. Solicite um novo código.");
  // Reserva a tentativa com comparação de versão para impedir que chamadas
  // paralelas contornem o limite ou usem um código que acaba de ser substituído.
  const { data: tentativa, error: erroTentativa } = await supabase.from("contratos_codigos_assinatura")
    .update({ tentativas: confirmacao.tentativas + 1 })
    .eq("contrato_id", contratoId).eq("usuario_id", usuario.id)
    .eq("codigo_hash", confirmacao.codigo_hash).eq("tentativas", confirmacao.tentativas)
    .select("contrato_id").maybeSingle();
  if (erroTentativa) throw erroTentativa;
  if (!tentativa) throw new Error("Já existe uma confirmação em andamento ou um novo código. Tente novamente.");
  const identidade = await identidadeDocumentoParaAssinatura(contrato);
  if (confirmacao.codigo_hash !== hashAssinatura(`${codigo}:${identidade.versaoHash}:${usuario.id}`)) {
    throw new Error("Código incorreto ou documento atualizado. Confira a minuta e solicite um novo código.");
  }

  const assinaturaSerializada = aceiteRevisao
    ? `ACEITE_DOCUMENTO:${contratoId}:${anteriorId}:${usuario.id}:${identidade.documentoHash}`
    : JSON.stringify(assinatura);
  const documentoHash = identidade.documentoHash;
  const agora = new Date().toISOString();
  const anteriores = await suspenderVigenciasAnteriores(contrato.unidade_consumidora_id, contratoId);
  let atualizacaoAceite = supabase.from("contratos").update({
      aceite_cliente_em: agora,
      aceite_cliente_usuario_id: usuario.id,
      aceite_cliente_ip: evidencias.ip ?? null,
      aceite_cliente_user_agent: evidencias.userAgent ?? null,
      assinatura_cliente_tracos: assinatura,
      assinatura_cliente_hash: hashAssinatura(assinaturaSerializada),
      documento_hash: documentoHash,
      codigo_assinatura_confirmado_em: agora,
      ...(aceiteRevisao ? { dados_documento: { ...contrato.dados_documento, aceite_revisao_tipo: "CONSENTIMENTO_CODIGO_EMAIL", aceite_revisao_anterior_id: anteriorId || null, aceite_revisao_em: agora } } : {}),
      status: "VIGENTE",
    })
    .eq("id", contratoId)
    .is("aceite_cliente_em", null)
    .eq("status", contrato.status)
    .eq("dados_documento", JSON.stringify(contrato.dados_documento));
  atualizacaoAceite = contrato.contrato_assinado_url
    ? atualizacaoAceite.eq("contrato_assinado_url", contrato.contrato_assinado_url)
    : atualizacaoAceite.is("contrato_assinado_url", null);
  atualizacaoAceite = contrato.contrato_gerado_url
    ? atualizacaoAceite.eq("contrato_gerado_url", contrato.contrato_gerado_url)
    : atualizacaoAceite.is("contrato_gerado_url", null);
  const { data, error } = await atualizacaoAceite.select()
    .single();
  if (error) {
    await restaurarVigencias(anteriores);
    throw error;
  }
  const { error: erroAtivacao } = await supabase
    .from("unidades_consumidoras")
    .update({ status: "ATIVA" })
    .eq("id", contrato.unidade_consumidora_id)
    .eq("empresa_id", contrato.empresa_id);
  if (erroAtivacao) throw erroAtivacao;
  await supabase.from("contratos_codigos_assinatura").delete().eq("contrato_id", contratoId).eq("codigo_hash", confirmacao.codigo_hash);
  return anexarLinksDoContrato(data);
}

/** Permite ao titular anexar o PDF que ele assinou externamente no GOV.BR. */
export async function importarContratoAssinadoPeloClienteService(contratoId: string, usuario: any, arquivo?: Express.Multer.File) {
  if (!arquivo) throw new Error("Selecione o PDF assinado.");
  if (arquivo.mimetype && arquivo.mimetype !== "application/pdf") throw new Error("Envie um arquivo PDF.");
  const contrato = await obterContratoDoClienteParaAceite(contratoId, usuario);
  if (!contrato.unidade_consumidora_id) throw new Error("Este contrato não está vinculado a uma unidade consumidora.");
  return salvarPdfAssinadoPendente(contrato, contrato.unidade_consumidora_id, arquivo.path);
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
  const { data: faturaExistente, error: erroFaturaExistente } = await supabase.from("faturas")
    .select("*").eq("contrato_encerramento_id", id).maybeSingle();
  if (erroFaturaExistente) throw erroFaturaExistente;
  if (String(contrato.status ?? "").toUpperCase() === "CANCELADO") {
    if (faturaExistente && faturaExistente.status !== "ABERTA") {
      const ativada = await supabase.from("faturas").update({ status: "ABERTA" }).eq("id", faturaExistente.id).select().single();
      if (ativada.error) throw ativada.error;
      return { contrato, faturaEncerramento: ativada.data };
    }
    return { contrato, faturaEncerramento: faturaExistente ?? null };
  }
  if (!contratoAceitaSolicitacaoCancelamento(contrato.status)) {
    throw new Error("O contrato não está ativo para cancelamento.");
  }
  const [{ data: cliente, error: erroCliente }, { data: unidade, error: erroUnidade }] = await Promise.all([
    supabase.from("clientes").select("id, modalidade_faturamento, desconto_percentual, usina_id").eq("id", contrato.cliente_id).single(),
    contrato.unidade_consumidora_id
      ? supabase.from("unidades_consumidoras").select("id, numero, modalidade_faturamento, desconto_percentual, usina_id").eq("id", contrato.unidade_consumidora_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (erroCliente) throw erroCliente;
  if (erroUnidade) throw erroUnidade;

  let faturaEncerramento: any = faturaExistente ?? null;
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
    if (!faturaEncerramento && saldo > 0 && ultima) {
      const tarifa = Number(ultima.tarifa_cheia ?? 0);
      const desconto = Number(unidade?.desconto_percentual ?? contrato.desconto ?? cliente.desconto_percentual ?? ultima.desconto_percentual ?? 0);
      const valor = saldo * tarifa * (1 - desconto / 100);
      const referencia = `ENCERRAMENTO-${new Date().toISOString().slice(0, 7).replace("-", "/")}`;
      const { data, error } = await supabase.from("faturas").insert({ cliente_id: cliente.id, usina_id: ultima.usina_id ?? unidade?.usina_id ?? cliente.usina_id, unidade_consumidora_id: contrato.unidade_consumidora_id ?? ultima.unidade_consumidora_id ?? null, contrato_encerramento_id: id, numero_instalacao: ultima.numero_instalacao ?? unidade?.numero, referencia, vencimento: new Date().toISOString().slice(0, 10), consumo: saldo, consumo_kwh: saldo, energia_compensada: saldo, tarifa_cheia: tarifa, desconto_percentual: desconto, desconto_contratado_percentual: desconto, modalidade_faturamento: "COMPENSACAO", base_calculo_kwh: saldo, tarifa_andrade: tarifa * (1 - desconto / 100), valor_energia_cheia: saldo * tarifa, valor_andrade: valor, valor_usina: valor, valor_cemig: 0, valor_total_unificado: valor, valor_total: valor, economia_real: saldo * tarifa - valor, distribuidora: ultima.distribuidora, status: "RASCUNHO" }).select().single();
      if (error?.code === "23505") {
        const recuperada = await supabase.from("faturas").select("*").eq("contrato_encerramento_id", id).single();
        if (recuperada.error) throw recuperada.error;
        faturaEncerramento = recuperada.data;
      } else if (error) throw error;
      else faturaEncerramento = data;
    }
  }
  const contratoAtualizado = await atualizarContrato(id, { status: "CANCELADO" });
  if (faturaEncerramento && faturaEncerramento.status !== "ABERTA") {
    const ativada = await supabase.from("faturas").update({ status: "ABERTA" }).eq("id", faturaEncerramento.id).select().single();
    if (ativada.error) throw ativada.error;
    faturaEncerramento = ativada.data;
  }
  return { contrato: contratoAtualizado, faturaEncerramento };
}

const escaparHtml = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[caractere]!));

export async function solicitarCancelamentoContratoService(id: string, usuario: any) {
  const { data: contrato, error } = await supabase.from("contratos")
    .select("id,numero,empresa_id,cliente_id,unidade_consumidora_id,status,clientes(nome,email),unidades_consumidoras(numero)")
    .eq("id", id).single();
  if (error || !contrato) throw error ?? new Error("Contrato não encontrado.");
  if (!contratoAceitaSolicitacaoCancelamento(contrato.status)) {
    throw new Error("Somente contratos ativos podem receber uma solicitação de cancelamento.");
  }

  const cliente: any = Array.isArray(contrato.clientes) ? contrato.clientes[0] : contrato.clientes;
  const unidade: any = Array.isArray(contrato.unidades_consumidoras) ? contrato.unidades_consumidoras[0] : contrato.unidades_consumidoras;
  const { data: existente, error: erroExistente } = await supabase.from("solicitacoes_cancelamento_contrato")
    .select("id,status,solicitado_em,notificado_em").eq("contrato_id", id).in("status", ["PENDENTE", "PROCESSANDO"]).maybeSingle();
  if (erroExistente) throw erroExistente;
  let solicitacao = existente;
  if (!solicitacao) {
    const criada = await supabase.from("solicitacoes_cancelamento_contrato").insert({
      contrato_id: id,
      empresa_id: contrato.empresa_id,
      cliente_id: contrato.cliente_id,
      solicitado_por: usuario?.id ?? null,
    }).select().single();
    if (criada.error?.code === "23505") {
      const recuperada = await supabase.from("solicitacoes_cancelamento_contrato")
        .select("id,status,solicitado_em,notificado_em").eq("contrato_id", id).in("status", ["PENDENTE", "PROCESSANDO"]).single();
      if (recuperada.error) throw recuperada.error;
      solicitacao = recuperada.data;
    } else {
      if (criada.error) throw criada.error;
      solicitacao = criada.data;
    }
  }
  if (!solicitacao) throw new Error("Não foi possível registrar a solicitação de cancelamento.");

  if (solicitacao.notificado_em) {
    return { solicitacao, message: "A solicitação de cancelamento já foi enviada e aguarda análise do gerador." };
  }

  const { data: vinculos, error: erroVinculos } = await supabase.from("empresa_usuarios")
    .select("usuario_id,papel,permissoes,usuarios!empresa_usuarios_usuario_id_fkey(id,nome,email)")
    .eq("empresa_id", contrato.empresa_id).eq("ativo", true)
    .in("papel", ["ADMIN_EMPRESA", "GESTOR", "COLABORADOR_GERADOR"]);
  if (erroVinculos) throw erroVinculos;

  const destinatarios = (vinculos ?? []).filter((vinculo: any) =>
    vinculo.papel !== "COLABORADOR_GERADOR" || vinculo.permissoes?.contratos !== false,
  );
  const identificacao = contrato.numero ?? contrato.id;
  const uc = unidade?.numero ? `UC ${unidade.numero}` : "UC não identificada";
  await Promise.all(destinatarios.map(async (vinculo: any) => {
    const membro = Array.isArray(vinculo.usuarios) ? vinculo.usuarios[0] : vinculo.usuarios;
    await criarNotificacaoApp({
      usuario_id: vinculo.usuario_id,
      empresa_id: contrato.empresa_id,
      tipo: "SOLICITACAO_CANCELAMENTO_CONTRATO",
      titulo: "Cliente solicitou cancelamento",
      detalhe: `${cliente?.nome ?? "O cliente"} solicitou o cancelamento do contrato ${identificacao}, ${uc}. Analise a solicitação antes de encerrar o vínculo.`,
      rota: `/contratos/${contrato.id}`,
      chave_dedupe: `cancelamento:${solicitacao.id}:${vinculo.usuario_id}`,
    });
    if (membro?.email) await enviarEmailTransacional({
      empresaId: contrato.empresa_id,
      destinatario: membro.email,
      assunto: `Solicitação formal de cancelamento — contrato ${identificacao}`,
      html: `<div style="max-width:620px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#252925;line-height:1.6"><h2 style="color:#39804a">Solicitação de cancelamento de contrato</h2><p>Olá, <strong>${escaparHtml(membro.nome ?? "responsável")}</strong>.</p><p>O cliente <strong>${escaparHtml(cliente?.nome ?? "não identificado")}</strong> registrou uma solicitação de cancelamento.</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Contrato</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${escaparHtml(identificacao)}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Unidade</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${escaparHtml(uc)}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Solicitado em</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr></table><p>Esta comunicação registra apenas a solicitação. O contrato não foi cancelado automaticamente e deve ser analisado conforme as condições contratuais.</p></div>`,
    }).catch(() => false);
  }));

  const { error: erroNotificado } = await supabase.from("solicitacoes_cancelamento_contrato")
    .update({ notificado_em: new Date().toISOString() }).eq("id", solicitacao.id).is("notificado_em", null);
  if (erroNotificado) throw erroNotificado;

  return { solicitacao, message: "Solicitação enviada ao gerador e à equipe responsável." };
}

export async function obterSolicitacaoCancelamentoService(id: string, empresaId: string) {
  const { data: contrato, error } = await supabase.from("contratos")
    .select("id,numero,status,cliente_id,unidade_consumidora_id,clientes(nome,email),unidades_consumidoras(numero,titular)")
    .eq("id", id).eq("empresa_id", empresaId).maybeSingle();
  if (error || !contrato) throw error ?? new Error("Contrato não encontrado nesta empresa.");
  const { data: solicitacao, error: erroSolicitacao } = await supabase.from("solicitacoes_cancelamento_contrato")
    .select("*").eq("contrato_id", id).eq("empresa_id", empresaId).order("solicitado_em", { ascending: false }).limit(1).maybeSingle();
  if (erroSolicitacao) throw erroSolicitacao;
  return { contrato, solicitacao };
}

export async function concluirSolicitacaoCancelamentoService(id: string, empresaId: string, usuario: any, decisao: string, observacao?: string) {
  const acao = String(decisao ?? "").toUpperCase();
  if (!['CANCELAR', 'RECUSAR'].includes(acao)) throw new Error("Escolha cancelar o contrato ou recusar a solicitação.");
  const { data: solicitacao, error } = await supabase.from("solicitacoes_cancelamento_contrato")
    .select("id,status,cliente_id,solicitado_por,processamento_iniciado_em").eq("contrato_id", id).eq("empresa_id", empresaId).in("status", ["PENDENTE", "PROCESSANDO"]).maybeSingle();
  if (error) throw error;
  if (!solicitacao) throw new Error("Não existe solicitação pendente para este contrato.");
  if (solicitacao.status === "PROCESSANDO" && !processamentoCancelamentoExpirou(solicitacao.processamento_iniciado_em)) {
    throw new Error("Esta solicitação já está sendo processada. Aguarde alguns instantes.");
  }

  const processamentoToken = crypto.randomUUID();
  const inicio = new Date().toISOString();
  let claim = supabase.from("solicitacoes_cancelamento_contrato").update({
    status: "PROCESSANDO", processamento_token: processamentoToken, processamento_iniciado_em: inicio,
  }).eq("id", solicitacao.id).eq("empresa_id", empresaId).eq("status", solicitacao.status);
  if (solicitacao.status === "PROCESSANDO" && solicitacao.processamento_iniciado_em) {
    claim = claim.eq("processamento_iniciado_em", solicitacao.processamento_iniciado_em);
  }
  const { data: reservada, error: erroReserva } = await claim.select("id").maybeSingle();
  if (erroReserva) throw erroReserva;
  if (!reservada) throw new Error("Esta solicitação já está sendo processada.");

  try {
    const resultado = acao === 'CANCELAR' ? await cancelarContratoService(id) : null;
    const novoStatus = acao === 'CANCELAR' ? 'APROVADA' : 'RECUSADA';
    const { data: concluida, error: erroAtualizacao } = await supabase.from("solicitacoes_cancelamento_contrato").update({
      status: novoStatus,
      analisado_por: usuario?.id ?? null,
      analisado_em: new Date().toISOString(),
      observacao: String(observacao ?? "").trim() || null,
      processamento_token: null,
      processamento_iniciado_em: null,
    }).eq("id", solicitacao.id).eq("empresa_id", empresaId).eq("processamento_token", processamentoToken).select("id").maybeSingle();
    if (erroAtualizacao) throw erroAtualizacao;
    if (!concluida) throw new Error("A conclusão perdeu a reserva de processamento.");

    if (solicitacao.solicitado_por) {
      await criarNotificacaoApp({
        usuario_id: solicitacao.solicitado_por,
        empresa_id: empresaId,
        tipo: "CANCELAMENTO_CONTRATO_CONCLUIDO",
        titulo: acao === "CANCELAR" ? "Contrato cancelado" : "Cancelamento não aprovado",
        detalhe: acao === "CANCELAR" ? "Sua solicitação foi aprovada e o contrato foi encerrado." : "Sua solicitação foi analisada e o contrato permanece ativo.",
        rota: "/contrato",
        chave_dedupe: `cancelamento-resultado:${solicitacao.id}`,
      }).catch((erroNotificacao) => console.error("Falha ao notificar resultado do cancelamento", erroNotificacao));
    }
    return { sucesso: true, status: novoStatus, contrato: resultado?.contrato ?? null, faturaEncerramento: resultado?.faturaEncerramento ?? null };
  } catch (erro) {
    await supabase.from("solicitacoes_cancelamento_contrato").update({
      status: "PENDENTE", processamento_token: null, processamento_iniciado_em: null,
    }).eq("id", solicitacao.id).eq("processamento_token", processamentoToken);
    throw erro;
  }
}
