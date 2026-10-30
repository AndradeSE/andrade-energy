// Opt-in separado para TTS. Nunca enviar credenciais, links ou arquivos.
export function authorizedAccountSpeech(body: { accountVoiceConsent?: unknown; speechText?: unknown }) {
  if (body.accountVoiceConsent !== true || typeof body.speechText !== "string" || !body.speechText.trim() || body.speechText.length > 1600) return undefined;
  return body.speechText
    .replace(/https?:\/\/\S+/gi, "[link no aplicativo]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mail no aplicativo]")
    .replace(/(?:senha|password|token|api[ _-]?key|codigo de acesso|código de acesso)\s*[:=]\s*\S+/gi, "[credencial omitida]")
    .replace(/\b\d[\d .\/-]{9,}\d\b/g, "[identificador omitido]")
    .replace(/(?:Telefone|Endereço)\s*:[^\n]+/gi, "[contato disponível no perfil]");
}
