export const ESCOPO_LEITURA_GMAIL = "https://www.googleapis.com/auth/gmail.readonly";

export function exigirPermissaoLeituraGmail(escopos: unknown) {
  const concedidos = Array.isArray(escopos) ? escopos : typeof escopos === "string" ? escopos.split(/\s+/) : [];
  if (!concedidos.includes(ESCOPO_LEITURA_GMAIL)) {
    const erro = new Error("O Gmail foi conectado sem permissão para ler as faturas. Conecte a conta novamente e autorize a leitura dos e-mails.");
    Object.assign(erro, { codigoGmail: "GMAIL_LEITURA_NAO_AUTORIZADA" });
    throw erro;
  }
}
