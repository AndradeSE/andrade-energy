import { enviarEmailMicrosoft, microsoftEmailConfigurado } from "./microsoftEmail.service";

type EmailTransacional = {
  destinatario: string;
  assunto: string;
  html: string;
  anexos?: Array<{ filename: string; content: Buffer; contentType?: string }>;
};

export async function enviarEmailTransacional(input: EmailTransacional) {
  const falhas: string[] = [];

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
          sender: { name: process.env.BREVO_REMETENTE_NOME ?? "Andrade Energy", email: brevoRemetente },
          to: [{ email: input.destinatario }],
          replyTo: { email: brevoRemetente, name: "Andrade Energy" },
          subject: input.assunto,
          htmlContent: input.html,
          attachment: (input.anexos ?? []).map((anexo) => ({
            name: anexo.filename,
            content: anexo.content.toString("base64"),
          })),
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

  const resendApiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (resendApiKey && remetente) {
    try {
      const resposta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: remetente,
          to: [input.destinatario],
          subject: input.assunto,
          html: input.html,
          attachments: (input.anexos ?? []).map((anexo) => ({
            filename: anexo.filename,
            content: anexo.content.toString("base64"),
          })),
        }),
      });
      if (resposta.ok) return true;
      const detalhe = (await resposta.text()).slice(0, 500);
      falhas.push(`Resend: HTTP ${resposta.status}${detalhe ? ` - ${detalhe}` : ""}`);
    } catch (erro: any) {
      falhas.push(`Resend: ${erro?.message ?? "falha desconhecida"}`);
    }
  }

  if (falhas.length) {
    console.error("Falha em todos os provedores de e-mail transacional:", falhas.join(" | "));
  } else {
    console.error("Nenhum provedor de e-mail transacional está configurado.");
  }
  return false;
}
