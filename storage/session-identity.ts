/** Auth identity belongs to usuario, not the storage envelope. */
export function sessionUserId(session: any): string | undefined {
  const id = session?.usuario?.id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export function readingAutomationKey(session: any, plantId: string): string {
  const owner = sessionUserId(session);
  if (!owner || !plantId) throw new Error("Confirme a sessão e a usina selecionada.");
  return JSON.stringify([owner, plantId]);
}
