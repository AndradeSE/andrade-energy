import { supabase } from "../../config/supabase";
import {
  enviarEmailMicrosoft,
  microsoftEmailConfigurado,
} from "../email/microsoftEmail.service";

type Canal = "EMAIL" | "WHATSAPP";

const LIMITE_TENTATIVAS = 5;

function moeda(valor: unknown) {
  return Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizarWhatsapp(valor: string) {
  const numeros = valor.replace(/\D/g, "");
  if (!numeros) return "";
  return numeros.startsWith("55") ? `+${numeros}` : `+55${numeros}`;
}

export async function enfileirarNotificacoesDaFatura(fatura: any) {
  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("email, whatsapp")
    .eq("id", fatura.cliente_id)
    .single();

  if (error) throw error;

  const destinos: Array<{ canal: Canal; destinatario: string }> = [];
  if (cliente.email?.trim()) {
    destinos.push({ canal: "EMAIL", destinatario: cliente.email.trim().toLowerCase() });
  }
  if (cliente.whatsapp?.trim()) {
    const whatsapp = normalizarWhatsapp(cliente.whatsapp);
    if (whatsapp) destinos.push({ canal: "WHATSAPP", destinatario: whatsapp });
  }

  if (!destinos.length) return [];

  const registros = destinos.map(({ canal, destinatario }) => ({
    fatura_id: fatura.id,
    cliente_id: fatura.cliente_id,
    canal,
    destinatario,
    status: "PENDENTE",
    tentativas: 0,
    proxima_tentativa_em: new Date().toISOString(),
    erro: null,
  }));

  const { data, error: insertError } = await supabase
    .from("notificacoes_fatura")
    .upsert(registros, { onConflict: "fatura_id,canal", ignoreDuplicates: true })
    .select("id, canal, status");

  if (insertError) throw insertError;
  return data ?? [];
}

async function baixarAnexo(caminho: string, filename: string) {
  const { data, error } = await supabase.storage.from("faturas").download(caminho);
  if (error) throw error;
  return {
    filename,
    content: Buffer.from(await data.arrayBuffer()).toString("base64"),
  };
}

async function enviarEmail(item: any) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  const fatura = item.faturas;
  const anexos = await Promise.all([
    baixarAnexo(fatura.pdf_cemig_url, "fatura-cemig.pdf"),
    baixarAnexo(fatura.pdf_usina_url, "fatura-usina.pdf"),
    baixarAnexo(fatura.pdf_unificada_url, "fatura-unificada.pdf"),
  ]);
  const assunto = `Sua fatura Andrade Energy — ${fatura.referencia}`;
  const html = `<h2>Sua Fatura Unificada Andrade Energy está pronta</h2><p>Total unificado: <strong>${moeda(fatura.valor_total_unificado)}</strong></p><p>Vencimento: <strong>${fatura.vencimento}</strong></p><p>Economia real: <strong>${moeda(fatura.economia_real)}</strong> (${Number(fatura.desconto_real_percentual ?? 0).toFixed(2)}%)</p><p>Os documentos da CEMIG, da usina e a Fatura Unificada Andrade Energy estão anexados.</p>`;

  if (await microsoftEmailConfigurado()) {
    return enviarEmailMicrosoft({ destinatario: item.destinatario, assunto, html, anexos });
  }
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoRemetente = process.env.BREVO_REMETENTE_EMAIL;
  if (brevoApiKey && brevoRemetente) {
    const respostaBrevo = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_REMETENTE_NOME ?? "Andrade Energy",
          email: brevoRemetente,
        },
        to: [{ email: item.destinatario }],
        replyTo: { email: brevoRemetente, name: "Andrade Energy" },
        subject: assunto,
        htmlContent: html,
        attachment: anexos.map((anexo) => ({ name: anexo.filename, content: anexo.content })),
        headers: { "Idempotency-Key": `fatura-${item.fatura_id}-email` },
        tags: ["fatura", "transacional"],
      }),
    });
    if (!respostaBrevo.ok) throw new Error(`Falha no envio pela Brevo (${respostaBrevo.status}).`);
    return true;
  }
  if (!apiKey || !remetente) return false;
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `fatura-${item.fatura_id}-email`,
      "User-Agent": "Andrade-Energy/1.0",
    },
    body: JSON.stringify({
      from: remetente,
      to: [item.destinatario],
      subject: assunto,
      html,
      attachments: anexos,
    }),
  });
  if (!resposta.ok) throw new Error(`Falha no provedor de e-mail (${resposta.status}).`);
  return true;
}

async function enviarWhatsapp(item: any) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION;
  if (!token || !phoneId || !template || !graphVersion) return false;

  const fatura = item.faturas;
  const { data, error } = await supabase.storage
    .from("faturas")
    .createSignedUrl(fatura.pdf_unificada_url, 3600);
  if (error) throw error;

  const resposta = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: item.destinatario.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template,
        language: { code: "pt_BR" },
        components: [
          {
            type: "header",
            parameters: [{ type: "document", document: { link: data.signedUrl, filename: `fatura-${fatura.referencia}.pdf` } }],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: String(fatura.referencia) },
              { type: "text", text: moeda(fatura.valor_total_unificado) },
              { type: "text", text: String(fatura.vencimento) },
              { type: "text", text: `${Number(fatura.desconto_real_percentual ?? 0).toFixed(2)}%` },
            ],
          },
        ],
      },
    }),
  });
  if (!resposta.ok) throw new Error(`Falha no provedor de WhatsApp (${resposta.status}).`);
  return true;
}

async function atualizarFalha(item: any, erro: unknown) {
  const tentativas = Number(item.tentativas) + 1;
  const minutos = Math.min(60, 2 ** tentativas);
  await supabase.from("notificacoes_fatura").update({
    status: tentativas >= LIMITE_TENTATIVAS ? "ERRO" : "PENDENTE",
    tentativas,
    erro: erro instanceof Error ? erro.message.slice(0, 500) : "Falha desconhecida.",
    proxima_tentativa_em: new Date(Date.now() + minutos * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", item.id);
}

export async function processarFilaDeNotificacoes() {
  const configurados: Canal[] = [];
  if (
    (await microsoftEmailConfigurado()) ||
    (process.env.BREVO_API_KEY && process.env.BREVO_REMETENTE_EMAIL) ||
    (process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE)
  ) configurados.push("EMAIL");
  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME && process.env.WHATSAPP_GRAPH_VERSION) configurados.push("WHATSAPP");
  if (!configurados.length) return;

  const { data: itens, error } = await supabase
    .from("notificacoes_fatura")
    .select("*, faturas(*)")
    .eq("status", "PENDENTE")
    .in("canal", configurados)
    .lte("proxima_tentativa_em", new Date().toISOString())
    .order("created_at")
    .limit(10);
  if (error) throw error;

  for (const item of itens ?? []) {
    try {
      await supabase.from("notificacoes_fatura").update({ status: "PROCESSANDO", updated_at: new Date().toISOString() }).eq("id", item.id).eq("status", "PENDENTE");
      const enviada = item.canal === "EMAIL" ? await enviarEmail(item) : await enviarWhatsapp(item);
      if (enviada) {
        await supabase.from("notificacoes_fatura").update({ status: "ENVIADA", enviada_em: new Date().toISOString(), erro: null, updated_at: new Date().toISOString() }).eq("id", item.id);
      }
    } catch (erro) {
      await atualizarFalha(item, erro);
    }
  }
}
