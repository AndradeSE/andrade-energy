// App-session memory: minimizing/remounting voice must not repeat the welcome.
// A different signed-in account has its own first conversation.
const greetedAccounts = new Set<string>();
export function needsAssistantGreeting(accountId: string) { return !greetedAccounts.has(accountId); }
export function markAssistantGreetingDelivered(accountId: string) { greetedAccounts.add(accountId); }
