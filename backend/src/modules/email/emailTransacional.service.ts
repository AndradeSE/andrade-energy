import { enviarEmailMicrosoft, microsoftEmailConfigurado } from "./microsoftEmail.service";
import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";

type EmailTransacional = {
  destinatario: string;
  assunto: string;
  html: string;
  anexos?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  empresaId?: string | null;
};

const emailValido = (valor: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(valor ?? "").trim());
const enderecoDe = (valor: string) => valor.match(/<([^>]+)>/)?.[1]?.trim() ?? valor.trim();

async function identidadeDeEnvio(empresaId?: string | null) {
  const id = String(empresaId ?? EMPRESA_ANDRADE_ID);
  const { data } = await supabase.from("empresas")
    .select("nome,email_suporte,nome_remetente,email_remetente,email_resposta,dominio_email_verificado")
    .eq("id", id).maybeSingle();
  const global = String(process.env.EMAIL_REMETENTE ?? "Andrade Energy <onboarding@resend.dev>");
  const nome = String(data?.nome_remetente ?? data?.nome ?? "Andrade Energy").trim().replace(/[<>]/g, "");
  const personalizado = data?.dominio_email_verificado && emailValido(data?.email_remetente)
    ? String(data.email_remetente).trim().toLowerCase()
    : enderecoDe(global);
  const resposta = [data?.email_resposta, data?.email_suporte, personalizado].find(emailValido) as string;
  return { from: `${nome} <${personalizado}>`, nome, resposta };
}

export async function enviarEmailTransacional(input: EmailTransacional) {
  const falhas: string[] = [];
  const identidade = await identidadeDeEnvio(input.empresaId);

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const resposta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: identidade.from,
          reply_to: identidade.resposta,
          to: [input.destinatario], subject: input.assunto, html: input.html,
          ...((input.anexos?.length ?? 0) > 0 ? { attachments: input.anexos!.map((anexo) => ({ filename: anexo.filename, content: anexo.content.toString("base64") })) } : {}),
        }),
      });
      if (resposta.ok) return true;
      falhas.push(`Resend: HTTP ${resposta.status} - ${(await resposta.text()).slice(0, 500)}`);
    } catch (erro: any) { falhas.push(`Resend: ${erro?.message ?? "falha desconhecida"}`); }
  }

  if (await microsoftEmailConfigurado()) {
    try {
      const enviado = await enviarEmailMicrosoft({
        ...input,
        anexos: (input.anexos ?? []).map((anexo) => ({
          filename: anexo.filename,
          content: anexo.content.toString("base64"),
        })),
      });
      if (enviado) return true;
      falhas.push("Microsoft sem token válido");
    } catch (erro: any) {
      falhas.push(`Microsoft: ${erro?.message ?? "falha desconhecida"}`);
    }
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoRemetente = process.env.BREVO_REMETENTE_EMAIL;
  if (brevoApiKey && brevoRemetente) {
    try {
      const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: identidade.nome, email: brevoRemetente },
          to: [{ email: input.destinatario }],
          replyTo: { email: identidade.resposta, name: identidade.nome },
          subject: input.assunto,
          htmlContent: input.html,
          ...((input.anexos?.length ?? 0) > 0 ? {
            attachment: input.anexos!.map((anexo) => ({
              name: anexo.filename,
              content: anexo.content.toString("base64"),
            })),
          } : {}),
          tags: ["cadastro", "transacional"],
        }),
      });
      if (resposta.ok) return true;
      const detalhe = (await resposta.text()).slice(0, 500);
      falhas.push(`Brevo: HTTP ${resposta.status}${detalhe ? ` - ${detalhe}` : ""}`);
    } catch (erro: any) {
      falhas.push(`Brevo: ${erro?.message ?? "falha desconhecida"}`);
    }
  }

  if (falhas.length) {
    console.error("Falha em todos os provedores de e-mail transacional:", falhas.join(" | "));
  } else {
    console.error("Nenhum provedor de e-mail transacional está configurado.");
  }
  return false;
}
