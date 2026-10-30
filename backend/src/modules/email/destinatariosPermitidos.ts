/** Sem a variável, mantém o envio normal de produção. Com ela, bloqueia por padrão. */
export function emailDestinatarioPermitido(destinatario: string) {
  const configuracao = process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
  if (configuracao === undefined) return true;

  const permitidos = new Set(
    configuracao.split(/[;,\n]/).map((email) => email.trim().toLowerCase()).filter(Boolean),
  );
  return permitidos.has(String(destinatario ?? "").trim().toLowerCase());
}
