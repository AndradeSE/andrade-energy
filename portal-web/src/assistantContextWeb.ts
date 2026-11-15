// Memory stays in this account/selection's mounted conversation, never in the online history.
export function inheritWebUnit(question: string, messages: Array<{ role: string; text: string }>) {
  if (!/\b(?:dessa|desta|dela|mesma|essa|esta)\s+(?:uc|unidade)\b/i.test(question) || /\b(?:uc|final)\s+\d{3,}/i.test(question)) return question;
  for (const message of [...messages].reverse()) {
    if (message.role !== "model") continue;
    const matches = [...message.text.matchAll(/\bUC\s+(\d{3,})\b/gi)];
    const units = [...new Set(matches.map(match => match[1]))];
    if (units.length > 1) return question;
    if (units.length === 1) return question.replace(/\b(?:dessa|desta|dela|mesma|essa|esta)\s+(?:uc|unidade)\b/i, `da UC ${units[0]}`);
  }
  return question;
}
