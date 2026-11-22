// App-session memory: minimizing/remounting voice must not repeat the welcome.
// A different signed-in account has its own first conversation.
const greetedAccounts = new Set<string>();
export function needsAssistantGreeting(accountId: string) { return !greetedAccounts.has(accountId); }
export function markAssistantGreetingDelivered(accountId: string) { greetedAccounts.add(accountId); }

const returningPhrases = ["Opa, tô aqui!", "Pode falar!", "Tô ouvindo!", "Oi, pode falar."];
const nextPhraseByAccount = new Map<string, number>();

export function nextAssistantActivationPhrase(accountId: string) {
  const index = nextPhraseByAccount.get(accountId) ?? 0;
  nextPhraseByAccount.set(accountId, (index + 1) % returningPhrases.length);
  return returningPhrases[index];
}
