// Used by both interfaces. Never normalize the values of an edit command.
export function normalizeSolarRequest(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/^solar[,!:]?\s+/, "").replace(/^por favor[,!:]?\s+/, "")
    .replace(/^(?:quero que voce|preciso que voce|voce consegue|consegue|voce pode|pode|quero que|preciso que)\s+/, "")
    .replace(/^me (mostre|mostra|mostrar|abra|abre|abrir)\s+/, "$1 ").replace(/^me (?:leve|leva)\s+(?:para|ate)\s+/, "va para ")
    .replace(/\s+por favor[.!]?$/, "").replace(/\s+/g, " ");
}
export function isSolarHelp(input: string) { return /^(como|onde|por que|porque|explique|me explique|o que)\b/.test(normalizeSolarRequest(input)); }
export function hasSolarMutation(input: string) {
  return /\b(excluir|exclua|apagar|apague|transferir|transfira|pagar|pague|assinar|assine|cancelar|cancele|faturar|fature|emitir|emita|criar|crie|cadastrar|cadastre|editar|edite|alterar|altere|mudar|mude|atualizar|atualize|renomear|renomeie|nomear|nomeie|ativar|ative|desativar|desative|convidar|convide|renovar|renove|importar|importe|enviar|envie|aceitar|aceite)\b/.test(normalizeSolarRequest(input));
}
export function solarSuggestions(generator: boolean) {
  return generator ? ["Minhas faturas", "Meus contratos", "Abrir clientes", "O que você consegue fazer?"] : ["Minhas faturas", "Meu contrato", "Minha economia", "O que você consegue fazer?"];
}
