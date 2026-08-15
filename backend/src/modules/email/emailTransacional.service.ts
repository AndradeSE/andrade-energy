import { enviarEmailMicrosoft, microsoftEmailConfigurado } from "./microsoftEmail.service";

type EmailTransacional = {
  destinatario: string;
  assunto: string;
  html: string;
};

export async function enviarEmailTransacional(input: EmailTransacional) {
  if (await microsoftEmailConfigurado()) {
    return enviarEmailMicrosoft({ ...input, anexos: [] });
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoRemetente = process.env.BREVO_REMETENTE_EMAIL;
  if (brevoApiKey && brevoRemetente) {
    const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_REMETENTE_NOME ?? "Andrade Energy", email: brevoRemetente },
        to: [{ email: input.destinatario }],
        replyTo: { email: brevoRemetente, name: "Andrade Energy" },
        subject: input.assunto,
        htmlContent: input.html,
        tags: ["cadastro", "transacional"],
      }),
    });
    if (!resposta.ok) throw new Error(`Falha no envio pela Brevo (${resposta.status}).`);
    return true;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (resendApiKey && remetente) {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: [input.destinatario], subject: input.assunto, html: input.html }),
    });
    if (!resposta.ok) throw new Error(`Falha no envio pelo Resend (${resposta.status}).`);
    return true;
  }

  return false;
}
