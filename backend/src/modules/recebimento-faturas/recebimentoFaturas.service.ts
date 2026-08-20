import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { supabase } from "../../config/supabase";
import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import { armazenarDocumentosDaFatura } from "../faturas/documentosFatura.service";
import { processarFatura } from "../faturas/processarFatura.service";

const PROVEDOR = "RESEND";
const TOLERANCIA_ASSINATURA_SEGUNDOS = 5 * 60;
const TENTATIVAS_MAXIMAS = 3;

type UsuarioAutenticado = {
  id?: string | number;
  perfil?: string;
  cpf?: string;
  cliente_id?: string | null;
};

type EventoResend = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    attachments?: Array<{ id?: string; filename?: string; content_type?: string; size?: number }>;
  };
};

type AnexoResend = {
  id?: string;
  filename?: string;
  content_type?: string;
  size?: number;
  download_url?: string;
};

function normalizarCpf(valor?: string | null) {
  return String(valor ?? "").replace(/\D/g, "");
}

function normalizarNumero(valor?: string | null) {
  return String(valor ?? "").replace(/\D/g, "");
}

function dominioRecebimento() {
  return String(process.env.INBOUND_EMAIL_DOMAIN ?? "").trim().toLowerCase();
}

function limiteArquivo() {
  const valor = Number(process.env.INBOUND_EMAIL_MAX_BYTES ?? 10 * 1024 * 1024);
  return Number.isFinite(valor) && valor > 0 ? valor : 10 * 1024 * 1024;
}

function chaveApiResend() {
  return process.env.RESEND_INBOUND_API_KEY ?? process.env.RESEND_API_KEY ?? "";
}

function enderecoRecebimento(token?: string | null) {
  const dominio = dominioRecebimento();
  if (!token || !dominio) return null;
  return `fatura-${token}@${dominio}`;
}

function gerarToken() {
  return randomBytes(18).toString("base64url");
}

function clienteDaUnidade(unidade: any) {
  return Array.isArray(unidade?.clientes) ? unidade.clientes[0] : unidade?.clientes;
}

function usuarioPodeAcessarUnidade(unidade: any, usuario: UsuarioAutenticado) {
  const perfil = String(usuario?.perfil ?? "").toUpperCase();
  if (perfil === "ADMIN" || perfil === "GESTOR") return true;
  if (perfil !== "LEITURA") return false;
  if (usuario?.cliente_id && usuario.cliente_id === unidade?.cliente_id) return true;

  const cpfUsuario = normalizarCpf(usuario?.cpf);
  const cpfCliente = normalizarCpf(clienteDaUnidade(unidade)?.cpf);
  return cpfUsuario.length >= 9 && cpfCliente.length >= 9 && cpfUsuario.slice(0, 9) === cpfCliente.slice(0, 9);
}

async function buscarUnidadeAutorizada(unidadeId: string, usuario: UsuarioAutenticado) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, cliente_id, status, recebimento_email_token, recebimento_email_ativo, recebimento_email_ativado_em, recebimento_email_ultimo_em, recebimento_email_status, recebimento_email_erro, clientes(id, cpf)")
    .eq("id", unidadeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Unidade consumidora não encontrada.");
  if (!usuarioPodeAcessarUnidade(data, usuario)) throw new Error("Você não tem acesso a esta unidade consumidora.");
  return data;
}

async function obterUltimoRecebimento(unidadeId: string) {
  const { data, error } = await supabase
    .from("recebimentos_faturas_email")
    .select("status, recebido_em, processado_em, erro, fatura_id")
    .eq("unidade_consumidora_id", unidadeId)
    .order("recebido_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

function serializarStatus(unidade: any, ultimo: any) {
  const dominio = dominioRecebimento();
  return {
    configurado: Boolean(dominio),
    dominio,
    ativo: Boolean(unidade.recebimento_email_ativo),
    endereco: enderecoRecebimento(unidade.recebimento_email_token),
    ativadoEm: unidade.recebimento_email_ativado_em ?? null,
    ultimoRecebimentoEm: unidade.recebimento_email_ultimo_em ?? ultimo?.recebido_em ?? null,
    status: unidade.recebimento_email_status ?? ultimo?.status ?? "NAO_CONFIGURADO",
    erro: unidade.recebimento_email_erro ?? ultimo?.erro ?? null,
    faturaId: ultimo?.fatura_id ?? null,
  };
}

export async function obterRecebimentoFaturas(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const ultimo = await obterUltimoRecebimento(unidade.id);
  return serializarStatus(unidade, ultimo);
}

async function salvarTokenDaUnidade(unidade: any, sobrescreverToken: boolean) {
  const dominio = dominioRecebimento();
  if (!dominio) throw new Error("O recebimento automático ainda não foi configurado pela Andrade Energy.");

  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const token = !sobrescreverToken && unidade.recebimento_email_token
      ? unidade.recebimento_email_token
      : gerarToken();
    const { data, error } = await supabase
      .from("unidades_consumidoras")
      .update({
        recebimento_email_token: token,
        recebimento_email_ativo: true,
        recebimento_email_ativado_em: new Date().toISOString(),
        recebimento_email_status: "AGUARDANDO_FATURA",
        recebimento_email_erro: null,
      })
      .eq("id", unidade.id)
      .select("id, recebimento_email_token, recebimento_email_ativo, recebimento_email_ativado_em, recebimento_email_ultimo_em, recebimento_email_status, recebimento_email_erro")
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw error;
  }

  throw new Error("Não foi possível gerar um endereço exclusivo. Tente novamente.");
}

export async function ativarRecebimentoFaturas(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const atualizada = await salvarTokenDaUnidade(unidade, false);
  const ultimo = await obterUltimoRecebimento(unidade.id);
  return serializarStatus(atualizada, ultimo);
}

export async function regenerarEnderecoRecebimento(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const atualizada = await salvarTokenDaUnidade(unidade, true);
  const ultimo = await obterUltimoRecebimento(unidade.id);
  return serializarStatus(atualizada, ultimo);
}

export async function desativarRecebimentoFaturas(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .update({
      recebimento_email_ativo: false,
      recebimento_email_status: "DESATIVADO",
      recebimento_email_erro: null,
    })
    .eq("id", unidade.id)
    .select("id, recebimento_email_token, recebimento_email_ativo, recebimento_email_ativado_em, recebimento_email_ultimo_em, recebimento_email_status, recebimento_email_erro")
    .single();
  if (error) throw error;
  const ultimo = await obterUltimoRecebimento(unidade.id);
  return serializarStatus(data, ultimo);
}

function headerUnico(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function verificarWebhookResend(corpo: Buffer, cabecalhos: Record<string, string | string[] | undefined>) {
  const segredo = String(process.env.RESEND_WEBHOOK_SECRET ?? "").trim();
  if (!segredo) throw new Error("Recebimento automático não configurado.");

  const id = headerUnico(cabecalhos["svix-id"]);
  const timestampTexto = headerUnico(cabecalhos["svix-timestamp"]);
  const assinatura = headerUnico(cabecalhos["svix-signature"]);
  const timestamp = Number(timestampTexto);
  if (!id || !assinatura || !Number.isFinite(timestamp)) throw new Error("Assinatura do webhook incompleta.");
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > TOLERANCIA_ASSINATURA_SEGUNDOS) {
    throw new Error("Webhook expirado.");
  }

  const chave = Buffer.from(segredo.replace(/^whsec_/, ""), "base64");
  const mensagem = Buffer.from(`${id}.${timestamp}.${corpo.toString("utf8")}`, "utf8");
  const esperada = createHmac("sha256", chave).update(mensagem).digest("base64");
  const assinaturas = assinatura.split(" ").map((item) => item.trim().replace(/^v1,/, "")).filter(Boolean);
  const valida = assinaturas.some((item) => {
    const recebida = Buffer.from(item, "base64");
    const esperadaBuffer = Buffer.from(esperada, "base64");
    return recebida.length === esperadaBuffer.length && timingSafeEqual(recebida, esperadaBuffer);
  });
  if (!valida) throw new Error("Assinatura do webhook inválida.");
}

function encontrarDestinatario(evento: EventoResend) {
  const dominio = dominioRecebimento();
  if (!dominio) return null;
  const sufixo = `@${dominio}`;
  for (const valor of evento.data?.to ?? []) {
    const endereco = String(valor ?? "").trim().toLowerCase();
    if (!endereco.endsWith(sufixo)) continue;
    const local = endereco.slice(0, -sufixo.length);
    const encontrado = /^fatura-([a-zA-Z0-9_-]{16,})$/.exec(local);
    if (encontrado) return { endereco, token: encontrado[1] };
  }
  return null;
}

async function registrarEventoRecebido(evento: EventoResend, eventoId?: string) {
  const emailId = String(evento.data?.email_id ?? "").trim();
  if (!emailId) throw new Error("E-mail recebido sem identificador.");

  const alvo = encontrarDestinatario(evento);
  let unidade: any = null;
  if (alvo?.token) {
    const { data, error } = await supabase
      .from("unidades_consumidoras")
      .select("id, recebimento_email_ativo, status")
      .eq("recebimento_email_token", alvo.token)
      .maybeSingle();
    if (error) throw error;
    if (data?.recebimento_email_ativo && data.status === "ATIVA") unidade = data;
  }

  const status = unidade ? "PENDENTE" : "IGNORADO";
  const destinatario = alvo?.endereco ?? String(evento.data?.to?.[0] ?? "desconhecido").toLowerCase();
  const registro = {
    provedor: PROVEDOR,
    provedor_email_id: emailId,
    provedor_evento_id: eventoId ?? null,
    unidade_consumidora_id: unidade?.id ?? null,
    destinatario,
    remetente: String(evento.data?.from ?? "").slice(0, 500) || null,
    assunto: String(evento.data?.subject ?? "").slice(0, 500) || null,
    payload: evento.data ?? {},
    status,
    tentativas: 0,
    proxima_tentativa_em: new Date().toISOString(),
    erro: unidade ? null : "Endereço de recebimento inativo ou não reconhecido.",
  };

  const { data, error } = await supabase
    .from("recebimentos_faturas_email")
    .upsert(registro, { onConflict: "provedor,provedor_email_id", ignoreDuplicates: true })
    .select("id, status")
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: existente, error: erroExistente } = await supabase
    .from("recebimentos_faturas_email")
    .select("id, status")
    .eq("provedor", PROVEDOR)
    .eq("provedor_email_id", emailId)
    .maybeSingle();
  if (erroExistente) throw erroExistente;
  return existente;
}

export async function receberWebhookResend(evento: EventoResend, eventoId?: string) {
  if (evento.type !== "email.received") return { aceito: true, processar: false };
  const registro = await registrarEventoRecebido(evento, eventoId);
  if (registro?.status === "PENDENTE") void processarFilaDeRecebimentosFaturas();
  return { aceito: true, processar: registro?.status === "PENDENTE" };
}

async function buscarAnexosResend(emailId: string) {
  const chave = chaveApiResend();
  if (!chave) throw new Error("Chave do Resend não configurada.");
  const resposta = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`, {
    headers: { Authorization: `Bearer ${chave}`, "User-Agent": "Andrade-Energy/1.0" },
  });
  if (!resposta.ok) throw new Error(`Não foi possível obter os anexos recebidos (${resposta.status}).`);
  const corpo = await resposta.json() as { data?: AnexoResend[] } | AnexoResend[];
  return Array.isArray(corpo) ? corpo : corpo.data ?? [];
}

function escolherPdf(anexos: AnexoResend[]) {
  return anexos.find((anexo) => {
    const nome = String(anexo.filename ?? "").toLowerCase();
    return anexo.content_type === "application/pdf" || nome.endsWith(".pdf");
  });
}

async function baixarPdf(anexo: AnexoResend) {
  if (!anexo.download_url) throw new Error("O anexo recebido não possui link de download.");
  if (Number(anexo.size ?? 0) > limiteArquivo()) throw new Error("O PDF recebido excede o limite de 10 MB.");
  const resposta = await fetch(anexo.download_url);
  if (!resposta.ok) throw new Error(`Não foi possível baixar o PDF recebido (${resposta.status}).`);
  const arquivo = Buffer.from(await resposta.arrayBuffer());
  if (arquivo.length > limiteArquivo()) throw new Error("O PDF recebido excede o limite de 10 MB.");
  if (arquivo.subarray(0, 1024).indexOf(Buffer.from("%PDF")) < 0) throw new Error("O anexo não é um PDF válido.");
  return arquivo;
}

async function atualizarUnidadeRecebimento(unidadeId: string, dados: Record<string, unknown>) {
  const { error } = await supabase.from("unidades_consumidoras").update(dados).eq("id", unidadeId);
  if (error) throw error;
}

async function processarRegistro(registro: any) {
  const { data: assumido, error: erroAssumir } = await supabase
    .from("recebimentos_faturas_email")
    .update({ status: "PROCESSANDO", updated_at: new Date().toISOString(), erro: null })
    .eq("id", registro.id)
    .eq("status", "PENDENTE")
    .select("*")
    .maybeSingle();
  if (erroAssumir) throw erroAssumir;
  if (!assumido) return;

  try {
    if (!assumido.unidade_consumidora_id) {
      await supabase.from("recebimentos_faturas_email").update({ status: "IGNORADO", processado_em: new Date().toISOString(), updated_at: new Date().toISOString(), erro: "Unidade consumidora não encontrada." }).eq("id", assumido.id);
      return;
    }

    const anexos = await buscarAnexosResend(assumido.provedor_email_id);
    const anexo = escolherPdf(anexos);
    if (!anexo) throw new Error("Nenhum PDF foi encontrado no e-mail recebido.");
    const arquivo = await baixarPdf(anexo);
    const hash = createHash("sha256").update(arquivo).digest("hex");

    const { data: duplicado, error: erroDuplicado } = await supabase
      .from("recebimentos_faturas_email")
      .select("id, fatura_id")
      .eq("unidade_consumidora_id", assumido.unidade_consumidora_id)
      .eq("arquivo_hash", hash)
      .neq("id", assumido.id)
      .maybeSingle();
    if (erroDuplicado) throw erroDuplicado;
    if (duplicado) {
      await supabase.from("recebimentos_faturas_email").update({ status: "IGNORADO", arquivo_nome: anexo.filename ?? "fatura.pdf", arquivo_hash: hash, fatura_id: duplicado.fatura_id ?? null, erro: "Este PDF já foi recebido anteriormente.", processado_em: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", assumido.id);
      return;
    }

    const pasta = await mkdtemp(path.join(os.tmpdir(), "andrade-fatura-email-"));
    const caminho = path.join(pasta, "conta.pdf");
    try {
      await writeFile(caminho, arquivo);
      const dados = interpretarFatura(await extrairTextoPDF(caminho));
      const { data: unidade, error: erroUnidade } = await supabase
        .from("unidades_consumidoras")
        .select("id, numero")
        .eq("id", assumido.unidade_consumidora_id)
        .maybeSingle();
      if (erroUnidade) throw erroUnidade;
      if (!unidade || normalizarNumero(dados.uc) !== normalizarNumero(unidade.numero)) {
        throw new Error("O número da UC do PDF não corresponde ao endereço de recebimento.");
      }

      const resultado = await processarFatura(dados, {
        status: "RASCUNHO",
        criarCobranca: false,
        registrarCreditos: false,
      });
      if (resultado?.clienteNaoEncontrado) throw new Error("A UC recebida ainda não está vinculada a um cliente.");
      if (resultado?.jaProcessada) {
        await supabase.from("recebimentos_faturas_email").update({ status: "IGNORADO", arquivo_nome: anexo.filename ?? "fatura.pdf", arquivo_hash: hash, fatura_id: resultado.fatura?.id ?? null, erro: "Esta competência já foi faturada.", processado_em: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", assumido.id);
        return;
      }

      const documentos = await armazenarDocumentosDaFatura(resultado, caminho);
      const agora = new Date().toISOString();
      await supabase.from("recebimentos_faturas_email").update({
        status: "PROCESSADO",
        arquivo_nome: anexo.filename ?? "fatura.pdf",
        arquivo_hash: hash,
        caminho_pdf: documentos.cemig,
        fatura_id: resultado.id,
        erro: null,
        processado_em: agora,
        updated_at: agora,
      }).eq("id", assumido.id);
      await atualizarUnidadeRecebimento(assumido.unidade_consumidora_id, {
        recebimento_email_ultimo_em: agora,
        recebimento_email_status: "AGUARDANDO_CONFERENCIA",
        recebimento_email_erro: null,
      });
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  } catch (erro: any) {
    const tentativas = Number(assumido.tentativas ?? 0) + 1;
    const definitivo = tentativas >= TENTATIVAS_MAXIMAS;
    const mensagem = String(erro?.message ?? "Não foi possível processar o e-mail.").slice(0, 500);
    const agora = new Date();
    await supabase.from("recebimentos_faturas_email").update({
      status: definitivo ? "ERRO" : "PENDENTE",
      tentativas,
      proxima_tentativa_em: new Date(agora.getTime() + Math.min(60, 2 ** tentativas) * 60_000).toISOString(),
      erro: mensagem,
      updated_at: agora.toISOString(),
    }).eq("id", assumido.id);
    if (assumido.unidade_consumidora_id && definitivo) {
      await atualizarUnidadeRecebimento(assumido.unidade_consumidora_id, {
        recebimento_email_status: "ERRO",
        recebimento_email_erro: mensagem,
      });
    }
  }
}

export async function processarFilaDeRecebimentosFaturas() {
  if (!chaveApiResend()) return { processados: 0 };
  const { data, error } = await supabase
    .from("recebimentos_faturas_email")
    .select("*")
    .eq("status", "PENDENTE")
    .lte("proxima_tentativa_em", new Date().toISOString())
    .order("created_at")
    .limit(10);
  if (error) throw error;
  for (const item of data ?? []) await processarRegistro(item);
  return { processados: data?.length ?? 0 };
}
