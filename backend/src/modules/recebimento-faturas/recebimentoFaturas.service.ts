import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID, empresaIdDoUsuario } from "../../config/empresa";
import { extrairTextoPdfIsolado } from "../../services/ocr/ocrIsolado.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import { armazenarContaDeEnergiaDaUsina, armazenarDocumentosDaFatura } from "../faturas/documentosFatura.service";
import { processarFatura } from "../faturas/processarFatura.service";
import { confirmarFaturaRascunho, detalharFatura } from "../faturas/faturas.service";
import { enfileirarNotificacoesDaFatura } from "../faturas/notificacoesFatura.service";
import { registrarProducaoDaFaturaGeradora } from "../usinas/usinas.service";

import { buscarFatura } from "../faturas/faturas.repository";
import { obterTokenLeituraGmail } from "../conexoes-email/conexoesEmail.service";
import { baixarAnexoGmail } from "../conexoes-email/gmailLeitura.client";
import { enfileirarFaturasGmail } from "../conexoes-email/gmailImportacao.service";
import { unidadesNoEscopoRecebimento } from "./recebimentoEscopo.policy";
const PROVEDOR = "RESEND";
const TOLERANCIA_ASSINATURA_SEGUNDOS = 5 * 60;
const TENTATIVAS_MAXIMAS = 3;
const recebimentosEmExecucao = new Set<string>();

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

type EmailRecebidoResend = {
  text?: string | null;
  html?: string | null;
  subject?: string | null;
  from?: string | null;
};

function normalizarCpf(valor?: string | null) {
  return String(valor ?? "").replace(/\D/g, "");
}

function normalizarNumero(valor?: string | null) {
  return String(valor ?? "").replace(/\D/g, "");
}

function complementarCabecalhoCemig(texto: string, dados: ReturnType<typeof interpretarFatura>) {
  const cabecalho = texto.match(
    /([A-Z]{3}\/20\d{2})\s*(\d{2}\/\d{2}\/20\d{2})\s*([\d.]+,\d{2})/
  );
  if (!cabecalho) return dados;

  const valor = Number(cabecalho[3].replace(/\./g, "").replace(",", "."));
  return {
    ...dados,
    referencia: dados.referencia || cabecalho[1],
    vencimento: dados.vencimento || cabecalho[2],
    valorTotal: Number.isFinite(dados.valorTotal) && dados.valorTotal > 0 ? dados.valorTotal : valor,
  };
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

function usinaDaUnidade(unidade: any) {
  return Array.isArray(unidade?.usinas) ? unidade.usinas[0] : unidade?.usinas;
}

function usuarioPodeAcessarUnidade(unidade: any, usuario: UsuarioAutenticado) {
  const perfil = String(usuario?.perfil ?? "").toUpperCase();
  const titularidade = String(usinaDaUnidade(unidade)?.titularidade_ucs_recebedoras ?? "GERADOR").toUpperCase();
  if (perfil === "ADMIN") return true;
  if (perfil === "GESTOR") return titularidade === "GERADOR";
  if (perfil !== "LEITURA") return false;
  if (titularidade !== "CLIENTE") return false;
  if (usuario?.cliente_id && usuario.cliente_id === unidade?.cliente_id) return true;

  const cpfUsuario = normalizarCpf(usuario?.cpf);
  const cpfCliente = normalizarCpf(clienteDaUnidade(unidade)?.cpf);
  return cpfUsuario.length >= 9 && cpfCliente.length >= 9 && cpfUsuario.slice(0, 9) === cpfCliente.slice(0, 9);
}

async function buscarUnidadeAutorizada(unidadeId: string, usuario: UsuarioAutenticado) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, cliente_id, usina_id, tipo, cpf_titular, status, recebimento_email_token, recebimento_email_ativo, recebimento_email_ativado_em, recebimento_email_ultimo_em, recebimento_email_status, recebimento_email_erro, clientes(id, cpf), usinas(id, titularidade_ucs_recebedoras)")
    .eq("id", unidadeId)
    .eq("empresa_id", empresaIdDoUsuario(usuario))
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Unidade consumidora não encontrada.");
  if (!usuarioPodeAcessarUnidade(data, usuario)) throw new Error("Você não tem acesso a esta unidade consumidora.");
  return data;
}

async function obterUltimoRecebimento(unidadeId: string) {
  const { data, error } = await supabase
    .from("recebimentos_faturas_email")
    .select("status, recebido_em, processado_em, erro, fatura_id, caminho_pdf, payload")
    .eq("unidade_consumidora_id", unidadeId)
    .order("recebido_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

function serializarStatus(unidade: any, ultimo: any) {
  const dominio = dominioRecebimento();
  const producao = ultimo?.payload?.andrade_processamento?.tipo === "PRODUCAO_USINA";
  const ultimoEhAuxiliar = ultimo?.payload?.andrade_processamento?.tipo === "SEM_PDF";
  return {
    configurado: Boolean(dominio),
    dominio,
    ativo: Boolean(unidade.recebimento_email_ativo),
    endereco: enderecoRecebimento(unidade.recebimento_email_token),
    ativadoEm: unidade.recebimento_email_ativado_em ?? null,
    ultimoRecebimentoEm: unidade.recebimento_email_ultimo_em ?? (ultimoEhAuxiliar ? null : ultimo?.recebido_em ?? null),
    status: unidade.recebimento_email_status ?? ultimo?.status ?? "NAO_CONFIGURADO",
    erro: unidade.recebimento_email_erro ?? ultimo?.erro ?? null,
    faturaId: ultimo?.fatura_id ?? null,
    finalidade: String(unidade.tipo ?? "").toUpperCase() === "GERADORA" ? "PRODUCAO_USINA" : "FATURA_CONSUMIDOR",
    producao: producao ? ultimo.payload.andrade_processamento : null,
    unidade: { id: unidade.id, numero: unidade.numero, tipo: unidade.tipo ?? null, usinaId: unidade.usina_id ?? null },
  };
}

export async function obterRecebimentoFaturas(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const ultimo = await obterUltimoRecebimento(unidade.id);
  return serializarStatus(unidade, ultimo);
}

export async function obterRecebimentoGeral(usuario: UsuarioAutenticado) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id,recebimento_email_ativo,cpf_titular,clientes(cpf),usinas(titularidade_ucs_recebedoras)")
    .eq("empresa_id", empresaIdDoUsuario(usuario))
    .eq("tipo", "BENEFICIARIA")
    .eq("status", "ATIVA");
  if (error) throw error;
  const unidades = (data ?? []).filter((unidade: any) => String(usinaDaUnidade(unidade)?.titularidade_ucs_recebedoras ?? "GERADOR") === "GERADOR");
  const aptas = unidades.filter((unidade: any) => (normalizarCpf(unidade.cpf_titular) || normalizarCpf(clienteDaUnidade(unidade)?.cpf)).length >= 4);
  const ativas = unidades.filter((unidade: any) => unidade.recebimento_email_ativo).length;
  return { ativo: unidades.length > 0 && ativas === unidades.length, total: unidades.length, ativas, aptas: aptas.length };
}

export async function definirRecebimentoGeral(ativo: boolean, usuario: UsuarioAutenticado) {
  const empresaId = empresaIdDoUsuario(usuario);
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id,cpf_titular,clientes(cpf),usinas(titularidade_ucs_recebedoras)")
    .eq("empresa_id", empresaId)
    .eq("tipo", "BENEFICIARIA")
    .eq("status", "ATIVA");
  if (error) throw error;

  const falhas: string[] = [];
  const unidadesDoGerador = (data ?? []).filter((unidade: any) => String(usinaDaUnidade(unidade)?.titularidade_ucs_recebedoras ?? "GERADOR") === "GERADOR");
  for (const unidade of unidadesDoGerador) {
    try {
      if (ativo) await ativarRecebimentoFaturas(String(unidade.id), usuario);
      else await desativarRecebimentoFaturas(String(unidade.id), usuario);
    } catch (erro: any) {
      falhas.push(String(erro?.message ?? "UC não configurada"));
    }
  }
  const resumo = await obterRecebimentoGeral(usuario);
  return { ...resumo, falhas: falhas.length, mensagem: falhas.length ? `${falhas.length} UC(s) precisam de CPF/CNPJ do titular antes da ativação.` : ativo ? "Recebimento automático ativado para todos os clientes." : "Recebimento automático desativado para todos os clientes." };
}

async function ignorarRecebimentosPendentes(unidadeId: string, mensagem: string, enderecoAtual?: string | null) {
  let consulta = supabase
    .from("recebimentos_faturas_email")
    .update({
      status: "IGNORADO",
      erro: mensagem,
      processado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("unidade_consumidora_id", unidadeId)
    .eq("status", "PENDENTE");

  if (enderecoAtual) consulta = consulta.neq("destinatario", enderecoAtual.toLowerCase());
  const { error } = await consulta;
  if (error) throw error;
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
      .select("id, numero, tipo, usina_id, recebimento_email_token, recebimento_email_ativo, recebimento_email_ativado_em, recebimento_email_ultimo_em, recebimento_email_status, recebimento_email_erro")
      .single();

    if (!error) {
      if (sobrescreverToken) {
        await ignorarRecebimentosPendentes(
          unidade.id,
          "Endereço de recebimento substituído antes do processamento.",
          enderecoRecebimento(data.recebimento_email_token),
        );
      }
      return data;
    }
    if (error.code !== "23505") throw error;
  }

  throw new Error("Não foi possível gerar um endereço exclusivo. Tente novamente.");
}

export async function ativarRecebimentoFaturas(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const cpfTitular = normalizarCpf(unidade.cpf_titular) || normalizarCpf(clienteDaUnidade(unidade)?.cpf);
  if (cpfTitular.length < 4) {
    const destino = String(unidade.tipo ?? "").toUpperCase() === "GERADORA" ? "na usina" : "na unidade consumidora";
    throw new Error(`Informe o CPF/CNPJ do titular da conta ${destino} antes de ativar o recebimento. Os quatro primeiros dígitos são usados apenas para abrir PDFs CEMIG protegidos.`);
  }
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
    .select("id, numero, tipo, usina_id, recebimento_email_token, recebimento_email_ativo, recebimento_email_ativado_em, recebimento_email_ultimo_em, recebimento_email_status, recebimento_email_erro")
    .single();
  if (error) throw error;
  await ignorarRecebimentosPendentes(unidade.id, "Recebimento automático desativado antes do processamento.");
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
  for (const valor of evento.data?.to ?? []) {
    const endereco = String(valor ?? "").trim().toLowerCase();
    const local = endereco.split("@", 1)[0] ?? "";
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
      .select("id, empresa_id, recebimento_email_ativo, status")
      // Endereços de e-mail são tratados sem distinção de maiúsculas pelo
      // provedor; o token original é base64url e pode conter maiúsculas.
      .ilike("recebimento_email_token", alvo.token)
      .maybeSingle();
    if (error) throw error;
    if (data?.recebimento_email_ativo && data.status === "ATIVA") unidade = data;
    console.info("[recebimento-faturas] destino analisado", {
      enderecoReconhecido: Boolean(alvo),
      unidadeEncontrada: Boolean(data),
      recebimentoAtivo: Boolean(data?.recebimento_email_ativo),
      unidadeAtiva: data?.status === "ATIVA",
    });
  }
  if (!alvo?.token) console.info("[recebimento-faturas] destinatário sem token reconhecido");

  const status = unidade ? "PENDENTE" : "IGNORADO";
  const destinatario = alvo?.endereco ?? String(evento.data?.to?.[0] ?? "desconhecido").toLowerCase();
  const registro = {
    empresa_id: unidade?.empresa_id ?? EMPRESA_ANDRADE_ID,
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
  // Em conflito, o Supabase pode devolver o registro anterior. Permitimos que
  // erros/ignorados sejam reavaliados no reenvio manual, sem tocar em itens
  // que já estão processados ou em processamento.
  if (data && data.status !== "IGNORADO" && data.status !== "ERRO") return data;

  const { data: existente, error: erroExistente } = await supabase
    .from("recebimentos_faturas_email")
    .select("id, status")
    .eq("provedor", PROVEDOR)
    .eq("provedor_email_id", emailId)
    .maybeSingle();
  if (erroExistente) throw erroExistente;

  // Um mesmo e-mail pode ter chegado antes de a unidade/endereço ser corrigido.
  // Um reenvio manual pode corrigir um endereço/configuração que estava
  // indisponível. Estados PROCESSADO e PROCESSANDO seguem idempotentes.
  if ((existente?.status === "IGNORADO" || existente?.status === "ERRO") && unidade) {
    const { data: reativado, error: erroReativar } = await supabase
      .from("recebimentos_faturas_email")
      .update({
        unidade_consumidora_id: unidade.id,
        destinatario: registro.destinatario,
        remetente: registro.remetente,
        assunto: registro.assunto,
        payload: registro.payload,
        status: "PENDENTE",
        tentativas: 0,
        proxima_tentativa_em: new Date().toISOString(),
        erro: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .in("status", ["IGNORADO", "ERRO"])
      .select("id, status")
      .maybeSingle();
    if (erroReativar) throw erroReativar;
    return reativado ?? existente;
  }

  return existente;
}

export async function receberWebhookResend(evento: EventoResend, eventoId?: string) {
  if (evento.type !== "email.received") return { aceito: true, processar: false };
  const registro = await registrarEventoRecebido(evento, eventoId);
  if (registro?.status === "PENDENTE") void processarFilaDeRecebimentosFaturas();
  return { aceito: true, processar: registro?.status === "PENDENTE" };
}

async function buscarAnexoResend(emailId: string, anexoId: string) {
  const chave = chaveApiResend();
  const resposta = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(anexoId)}`,
    { headers: { Authorization: `Bearer ${chave}`, "User-Agent": "Andrade-Energy/1.0" }, signal: AbortSignal.timeout(30_000) },
  );
  if (!resposta.ok) throw new Error(`Não foi possível obter o anexo recebido (${resposta.status}).`);
  const corpo = await resposta.json() as { data?: AnexoResend } | AnexoResend;
  return (("data" in corpo ? corpo.data : corpo) ?? {}) as AnexoResend;
}

async function buscarAnexosResend(emailId: string, anexosDoEvento: AnexoResend[] = []) {
  const chave = chaveApiResend();
  if (!chave) throw new Error("Chave do Resend não configurada.");
  const resposta = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`, {
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${chave}`, "User-Agent": "Andrade-Energy/1.0" },
  });
  if (resposta.ok) {
    const corpo = await resposta.json() as { data?: AnexoResend[] } | AnexoResend[];
    return Array.isArray(corpo) ? corpo : corpo.data ?? [];
  }

  // O webhook já contém os IDs dos anexos. Usamos o endpoint individual como
  // alternativa para provedores que não habilitam a listagem imediatamente.
  if (resposta.status === 404 && anexosDoEvento.some((anexo) => anexo.id)) {
    return Promise.all(anexosDoEvento.filter((anexo) => anexo.id).map((anexo) => buscarAnexoResend(emailId, String(anexo.id))));
  }
  throw new Error(`Não foi possível obter os anexos recebidos (${resposta.status}).`);
}

async function buscarEmailRecebidoResend(emailId: string) {
  const chave = chaveApiResend();
  if (!chave) throw new Error("Chave do Resend não configurada.");

  const resposta = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${chave}`, "User-Agent": "Andrade-Energy/1.0" },
  });
  if (!resposta.ok) throw new Error(`Não foi possível obter o conteúdo do e-mail recebido (${resposta.status}).`);
  const corpo = await resposta.json() as { data?: EmailRecebidoResend } | EmailRecebidoResend;
  return (("data" in corpo ? corpo.data : corpo) ?? {}) as EmailRecebidoResend;
}

function pareceConfirmacaoDeEncaminhamentoGmail(registro: any) {
  const conteudo = `${registro?.assunto ?? ""} ${registro?.remetente ?? ""}`.toLocaleLowerCase("pt-BR");
  // A confirmação pode chegar em qualquer idioma. A verificação definitiva
  // abaixo exige também o endereço atual e um link oficial do Google.
  return conteudo.includes("gmail") || conteudo.includes("google");
}

function extrairLinkConfirmacaoGmail(email: EmailRecebidoResend) {
  const conteudo = `${email.text ?? ""}\n${email.html ?? ""}`
    .replace(/&amp;/gi, "&")
    .replace(/=3D/gi, "=")
    .replace(/=\r?\n/g, "");
  const urls = conteudo.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];

  for (const valor of urls) {
    const candidato = valor.replace(/[),.;]+$/g, "");
    try {
      const url = new URL(candidato);
      if (url.hostname === "mail-settings.google.com" || url.hostname === "mail.google.com") return url.toString();
    } catch {
      // Links formatados em HTML podem ser incompletos; apenas tentamos o próximo.
    }
  }

  return null;
}

export async function obterConfirmacaoEncaminhamentoGmail(unidadeId: string, usuario: UsuarioAutenticado) {
  const unidade = await buscarUnidadeAutorizada(unidadeId, usuario);
  const enderecoAtual = enderecoRecebimento(unidade.recebimento_email_token)?.toLowerCase() ?? null;
  const { data, error } = await supabase
    .from("recebimentos_faturas_email")
    .select("provedor_email_id, assunto, remetente, recebido_em")
    .eq("unidade_consumidora_id", unidade.id)
    .order("recebido_em", { ascending: false })
    .limit(5);
  if (error) throw error;

  for (const registro of data ?? []) {
    if (!registro.provedor_email_id || !pareceConfirmacaoDeEncaminhamentoGmail(registro)) continue;
    try {
      const email = await buscarEmailRecebidoResend(registro.provedor_email_id);
      const conteudo = `${email.subject ?? ""}\n${email.text ?? ""}\n${email.html ?? ""}`
        .toLowerCase()
        .replace(/&#64;|&commat;/g, "@");
      // Evita abrir uma confirmação antiga caso o endereço exclusivo tenha
      // sido regenerado depois que o Gmail enviou a mensagem anterior.
      if (enderecoAtual && !conteudo.includes(enderecoAtual)) continue;
      const url = extrairLinkConfirmacaoGmail(email);
      if (url) return { url, recebidoEm: registro.recebido_em ?? null };
    } catch (erro: any) {
      console.warn("[recebimento-faturas] confirmação Gmail indisponível", {
        recebimentoId: registro.provedor_email_id,
        erro: String(erro?.message ?? erro),
      });
    }
  }

  return { url: null, recebidoEm: null };
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
  const resposta = await fetch(anexo.download_url, { signal: AbortSignal.timeout(60_000) });
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

function adicionarMetadadosDeProcessamento(payload: unknown, metadados: Record<string, unknown>) {
  const base = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  return { ...base, andrade_processamento: metadados };
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
  recebimentosEmExecucao.add(String(assumido.id));
  const etapa = (nome: string) => console.info("Recebimento de fatura", { id: assumido.id, etapa: nome });

  try {
    if (!assumido.unidade_consumidora_id) {
      await supabase.from("recebimentos_faturas_email").update({ status: "IGNORADO", processado_em: new Date().toISOString(), updated_at: new Date().toISOString(), erro: "Unidade consumidora não encontrada." }).eq("id", assumido.id);
      return;
    }

    // O item pode ter chegado pouco antes de o usuário desativar o recurso ou
    // gerar um novo endereço. Confirmamos a configuração atual antes de
    // baixar/processar o PDF para nunca faturar por um endereço revogado.
    const gmail = assumido.provedor === "GMAIL" ? assumido.payload?.gmail : null;
    const unidadeOrigemId = gmail?.unidadeOrigemId ?? assumido.unidade_consumidora_id;
    const { data: unidadeAtual, error: erroUnidadeAtual } = await supabase
      .from("unidades_consumidoras")
      .select("id, status, recebimento_email_ativo, recebimento_email_token")
      .eq("id", unidadeOrigemId)
      .eq("empresa_id", assumido.empresa_id)
      .maybeSingle();
    if (erroUnidadeAtual) throw erroUnidadeAtual;

    const enderecoAtual = enderecoRecebimento(unidadeAtual?.recebimento_email_token);
    const destinatarioAtual = String(assumido.destinatario ?? "").trim().toLowerCase();
    const recebimentoValido = Boolean(
      unidadeAtual &&
      unidadeAtual.status === "ATIVA" &&
      unidadeAtual.recebimento_email_ativo &&
      (gmail || (enderecoAtual && destinatarioAtual === enderecoAtual.toLowerCase())),
    );
    if (!recebimentoValido) {
      await supabase.from("recebimentos_faturas_email").update({
        status: "IGNORADO",
        erro: "Endereço de recebimento inativo ou substituído antes do processamento.",
        processado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", assumido.id);
      return;
    }

    etapa("CONSULTAR_ANEXOS");
    const anexosDoEvento = Array.isArray(assumido.payload?.attachments) ? assumido.payload.attachments as AnexoResend[] : [];
    const tokenGmail = gmail ? await obterTokenLeituraGmail(gmail.conexaoId, assumido.empresa_id) : null;
    const anexos = gmail ? [{ filename: assumido.arquivo_nome ?? "fatura.pdf", content_type: "application/pdf" }]
      : await buscarAnexosResend(assumido.provedor_email_id, anexosDoEvento);
    const anexo = escolherPdf(anexos);
    // A confirmação de encaminhamento do Gmail chega ao endereço da UC sem
    // anexo. Ela é esperada no primeiro uso e não deve colocar a unidade em
    // erro nem gerar novas tentativas de processamento.
    if (!anexo) {
      const agora = new Date().toISOString();
      await supabase.from("recebimentos_faturas_email").update({
        status: "IGNORADO",
        erro: null,
        payload: adicionarMetadadosDeProcessamento(assumido.payload, { tipo: "SEM_PDF", ignoradoEm: agora }),
        processado_em: agora,
        updated_at: agora,
      }).eq("id", assumido.id);
      return;
    }
    etapa("BAIXAR_PDF");
    const arquivo = gmail && tokenGmail
      ? await baixarAnexoGmail(tokenGmail, gmail.mensagemId, gmail.anexoId, gmail.parteId, limiteArquivo())
      : await baixarPdf(anexo);
    etapa("VERIFICAR_DUPLICIDADE");
    const hash = createHash("sha256").update(arquivo).digest("hex");

    const { data: duplicado, error: erroDuplicado } = await supabase
      .from("recebimentos_faturas_email")
      .select("id, fatura_id, status, payload")
      .eq("unidade_consumidora_id", assumido.unidade_consumidora_id)
      .eq("arquivo_hash", hash)
      .neq("id", assumido.id)
      .abortSignal(AbortSignal.timeout(30_000))
      .maybeSingle();
    if (erroDuplicado) throw erroDuplicado;
    if (duplicado && (duplicado.fatura_id || duplicado.status !== "PROCESSADO")) {
      // O hash já pertence ao recibo original: não violar o índice único.
      const { error: erroIgnorar } = await supabase.from("recebimentos_faturas_email").update({ status: "IGNORADO", arquivo_nome: anexo.filename ?? "fatura.pdf", fatura_id: duplicado.fatura_id ?? null, erro: "Este PDF já foi recebido anteriormente.", processado_em: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", assumido.id);
      if (erroIgnorar) throw erroIgnorar;
      return;
    }
    if (duplicado) {
      // A exclusão da fatura remove o vínculo por FK. Permitir a recriação
      // pedida pelo usuário, preservando o fingerprint no histórico do recibo.
      const { data: liberado, error: erroLiberar } = await supabase.from("recebimentos_faturas_email").update({
        arquivo_hash: null,
        payload: adicionarMetadadosDeProcessamento(duplicado.payload, { arquivo_hash_anterior: hash, motivo: "Fatura anterior excluída" }),
        updated_at: new Date().toISOString(),
      }).eq("id", duplicado.id).eq("arquivo_hash", hash).eq("status", "PROCESSADO").is("fatura_id", null).select("id").maybeSingle();
      if (erroLiberar) throw erroLiberar;
      if (!liberado) throw new Error("O recebimento anterior mudou durante a conferência. Tente novamente.");
    }

    const pasta = await mkdtemp(path.join(os.tmpdir(), "andrade-fatura-email-"));
    const caminho = path.join(pasta, "conta.pdf");
    try {
      await writeFile(caminho, arquivo);
      etapa("CONSULTAR_CONFIGURACAO_UC");
      const { data: unidadeConfiguracao, error: erroUnidade } = await supabase
        .from("unidades_consumidoras")
        .select("id, numero, tipo, usina_id, cliente_id, empresa_id, cpf_titular, clientes(cpf), usinas(titularidade_ucs_recebedoras)")
        .eq("id", unidadeOrigemId)
        .eq("empresa_id", assumido.empresa_id)
        .abortSignal(AbortSignal.timeout(30_000))
        .maybeSingle();
      if (erroUnidade) throw erroUnidade;
      if (!unidadeConfiguracao) throw new Error("Unidade consumidora não encontrada.");

      const titularidade = String(usinaDaUnidade(unidadeConfiguracao)?.titularidade_ucs_recebedoras ?? "GERADOR").toUpperCase();
      let consultaUnidades = supabase
        .from("unidades_consumidoras")
        .select("id, numero, tipo, usina_id, cliente_id, empresa_id, cpf_titular, clientes(cpf), usinas(titularidade_ucs_recebedoras)")
        .eq("empresa_id", unidadeConfiguracao.empresa_id)
        .eq("status", "ATIVA")
        .eq("recebimento_email_ativo", true)
        .eq("tipo", "BENEFICIARIA");
      // Uma única configuração atende todo o escopo da titularidade. Para o
      // gerador, o PDF pode pertencer a qualquer UC sob gestão da empresa. No
      // consumidor, o escopo permanece restrito às UCs do próprio cliente.
      if (titularidade === "CLIENTE") {
        consultaUnidades = consultaUnidades.eq("cliente_id", unidadeConfiguracao.cliente_id);
      }
      let candidatas: any[];
      if (String(unidadeConfiguracao.tipo).toUpperCase() === "GERADORA") {
        // A configuração da usina só pode importar o PDF da própria UC geradora.
        candidatas = [unidadeConfiguracao];
      } else {
        etapa("CONSULTAR_ESCOPO_UCS");
        const { data: unidadesDoEscopo, error: erroEscopo } = await consultaUnidades.abortSignal(AbortSignal.timeout(30_000));
        if (erroEscopo) throw erroEscopo;
        candidatas = unidadesNoEscopoRecebimento(unidadeConfiguracao, unidadesDoEscopo ?? []);
      }

      // As faturas CEMIG protegidas usam os quatro primeiros dígitos do CPF
      // do titular. Como uma única configuração atende todas as UCs do escopo,
      // testamos somente as senhas dessas UCs e descartamos cada uma logo após
      // a leitura, sem persistência ou logs.
      let unidade: any = null;
      let dados: ReturnType<typeof interpretarFatura> | null = null;
      const tentativas = new Map<string, any>();
      tentativas.set("", null);
      for (const candidata of candidatas) {
        const cpf = normalizarCpf(candidata.cpf_titular) || normalizarCpf(clienteDaUnidade(candidata)?.cpf);
        if (cpf.length >= 4 && !tentativas.has(cpf.slice(0, 4))) tentativas.set(cpf.slice(0, 4), candidata);
      }
      for (const [senha] of tentativas) {
        try {
          etapa("LER_PDF");
          const texto = await extrairTextoPdfIsolado(caminho, senha || undefined);
          const interpretados = complementarCabecalhoCemig(texto, interpretarFatura(texto));
          const encontrada = candidatas.find((candidata) => normalizarNumero(candidata.numero) === normalizarNumero(interpretados.uc));
          if (encontrada) {
            unidade = encontrada;
            dados = interpretados;
            break;
          }
        } catch {
          // A senha pode pertencer a outra UC do mesmo escopo; tentamos a próxima.
        }
      }
      if (!unidade || !dados) throw new Error("A UC do PDF não pertence às UCs abrangidas por esta configuração.");

      await supabase.from("recebimentos_faturas_email").update({ unidade_consumidora_id: unidade.id }).eq("id", assumido.id);

      // A UC geradora alimenta apenas os fechamentos de produção da própria
      // usina. Ela não representa uma fatura de cliente e, portanto, não pode
      // criar cobrança, crédito ou notificação de consumidor.
      if (String(unidade.tipo ?? "").toUpperCase() === "GERADORA") {
        if (!unidade.usina_id) throw new Error("A UC geradora recebida não está vinculada a uma usina.");
        const producao = await registrarProducaoDaFaturaGeradora(unidade.usina_id, dados, unidade.empresa_id);
        const fechamentoId = String(producao.fechamento?.id ?? "");
        if (!fechamentoId) throw new Error("Não foi possível registrar o fechamento de produção da usina.");

        const caminhoPdf = await armazenarContaDeEnergiaDaUsina(unidade.usina_id, fechamentoId, caminho);
        const agora = new Date().toISOString();
        const metadados = {
          tipo: "PRODUCAO_USINA",
          usinaId: unidade.usina_id,
          fechamentoId,
          competencia: producao.fechamento?.competencia ?? null,
          energiaGerada: producao.dados?.energiaGerada ?? null,
          leituraAnterior: producao.dados?.leituraAnterior ?? null,
          leituraAtual: producao.dados?.leituraAtual ?? null,
          fatorMultiplicacao: producao.dados?.fatorMultiplicacao ?? null,
          importadoEm: agora,
        };
        await supabase.from("recebimentos_faturas_email").update({
          status: "PROCESSADO",
          arquivo_nome: anexo.filename ?? "conta-usina.pdf",
          arquivo_hash: hash,
          caminho_pdf: caminhoPdf,
          fatura_id: null,
          payload: adicionarMetadadosDeProcessamento(assumido.payload, metadados),
          erro: null,
          processado_em: agora,
          updated_at: agora,
        }).eq("id", assumido.id);
        await atualizarUnidadeRecebimento(unidade.id, {
          recebimento_email_ultimo_em: agora,
          recebimento_email_status: "PRODUCAO_IMPORTADA",
          recebimento_email_erro: null,
        });
        return;
      }

      // A recuperação de e-mails recentes preserva competências já faturadas.
      const existente = await buscarFatura(dados.uc, dados.referencia, unidade.empresa_id);
      if (existente) {
        const { error } = await supabase.from("recebimentos_faturas_email").update({
          status: "IGNORADO", arquivo_nome: anexo.filename ?? "fatura.pdf", fatura_id: existente.id,
          erro: "Esta competência já foi faturada.", processado_em: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", assumido.id);
        if (error) throw error;
        return;
      }
      etapa("FATURAR_AUTOMATICAMENTE");
      const resultado = await processarFatura(dados, {
        status: "ABERTA",
        criarCobranca: true,
        registrarCreditos: true,
        empresaId: unidade.empresa_id,
      });
      if (resultado?.clienteNaoEncontrado) throw new Error("A UC recebida ainda não está vinculada a um cliente.");
      if (resultado?.jaProcessada) {
        await supabase.from("recebimentos_faturas_email").update({ status: "IGNORADO", arquivo_nome: anexo.filename ?? "fatura.pdf", arquivo_hash: hash, fatura_id: resultado.fatura?.id ?? null, erro: "Esta competência já foi faturada.", processado_em: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", assumido.id);
        return;
      }

      etapa("ARMAZENAR_DOCUMENTOS");
      // A emissão grava os códigos no banco; o objeto original é anterior a ela.
      const { data: faturaEmitida, error: erroEmitida } = await supabase.from("faturas").select("*").eq("id", resultado.id).single();
      if (erroEmitida) throw erroEmitida;
      const documentos = await armazenarDocumentosDaFatura(faturaEmitida, caminho);
      await enfileirarNotificacoesDaFatura(faturaEmitida);
      const agora = new Date().toISOString();
      const { error: erroConcluir } = await supabase.from("recebimentos_faturas_email").update({
        status: "PROCESSADO",
        arquivo_nome: anexo.filename ?? "fatura.pdf",
        arquivo_hash: hash,
        caminho_pdf: documentos.cemig,
        fatura_id: resultado.id,
        erro: null,
        processado_em: agora,
        updated_at: agora,
      }).eq("id", assumido.id);
      if (erroConcluir) throw erroConcluir;
      await atualizarUnidadeRecebimento(unidade.id, {
        recebimento_email_ultimo_em: agora,
        recebimento_email_status: "PROCESSADO",
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
  } finally {
    recebimentosEmExecucao.delete(String(assumido.id));
  }
}

export async function processarFilaDeRecebimentosFaturas() {
  await enfileirarFaturasGmail().catch(() => console.error("Falha na consulta automática ao Gmail."));
  // Corrige somente rascunhos originados do recebimento automático ativo.
  // Não promove rascunhos manuais; completa códigos pendentes sem refazer a fatura.
  const legados = await supabase.from("recebimentos_faturas_email")
    .select("id,empresa_id,fatura_id,faturas!inner(status,codigo_pix,linha_digitavel,valor_total_unificado,valor_total),unidades_consumidoras!inner(recebimento_email_ativo)")
    .eq("status", "PROCESSADO").in("faturas.status", ["RASCUNHO", "ABERTA"])
    .eq("unidades_consumidoras.recebimento_email_ativo", true)
    .or("status.eq.RASCUNHO,codigo_pix.is.null,linha_digitavel.is.null", { foreignTable: "faturas" }).limit(10);
  if (legados.error) throw legados.error;
  for (const legado of legados.data ?? []) {
    if (!legado.fatura_id || recebimentosEmExecucao.has(String(legado.id))) continue;
    const fatura = Array.isArray(legado.faturas) ? legado.faturas[0] : legado.faturas;
    if (fatura?.status !== "RASCUNHO" && (Number(fatura?.valor_total_unificado ?? fatura?.valor_total ?? 0) <= 0 || (fatura?.codigo_pix && fatura?.linha_digitavel))) continue;
    recebimentosEmExecucao.add(String(legado.id));
    try {
      if (fatura?.status === "RASCUNHO") await confirmarFaturaRascunho(legado.fatura_id, legado.empresa_id);
      const atualizada = await detalharFatura(legado.fatura_id, legado.empresa_id);
      await enfileirarNotificacoesDaFatura(atualizada);
    } catch (erro: any) {
      console.error("Falha na recuperação de cobrança automática", { recebimento_id: legado.id, tipo: erro?.name ?? "Error" });
    } finally {
      recebimentosEmExecucao.delete(String(legado.id));
    }
  }
  // Não reenviar automaticamente: o processo interrompido pode já ter salvo
  // a fatura. A recuperação exige conferência antes de repetir efeitos.
  const limiteAbandono = new Date(Date.now() - 30 * 60_000).toISOString();
  const abandonados = await supabase.from("recebimentos_faturas_email")
    .select("id,updated_at").eq("status", "PROCESSANDO").lt("updated_at", limiteAbandono);
  if (abandonados.error) throw abandonados.error;
  for (const item of abandonados.data ?? []) {
    if (recebimentosEmExecucao.has(String(item.id))) continue;
    const recuperacao = await supabase.from("recebimentos_faturas_email").update({
      status: "ERRO",
      erro: "Processamento interrompido. Confira se a fatura já existe antes de reprocessar o e-mail.",
      updated_at: new Date().toISOString(),
    }).eq("id", item.id).eq("status", "PROCESSANDO").eq("updated_at", item.updated_at);
    if (recuperacao.error) throw recuperacao.error;
  }
  let fila = supabase
    .from("recebimentos_faturas_email")
    .select("*")
    .eq("status", "PENDENTE")
    .lte("proxima_tentativa_em", new Date().toISOString())
    .order("created_at")
    .limit(10);
  if (!chaveApiResend()) fila = fila.eq("provedor", "GMAIL");
  const { data, error } = await fila;
  if (error) throw error;
  for (const item of data ?? []) await processarRegistro(item);
  return { processados: data?.length ?? 0 };
}
