let state: { capturedAt: string; completedAt: string } | null = null;
export function recoveryActive() { return state !== null; }
export function setRecoveryState(value: typeof state) { state = value; }
export function recoveryStatus() {
  return state ? { banco: "NEON", modo: "SOMENTE_LEITURA", ...state }
    : { banco: "SUPABASE", modo: "PRINCIPAL" };
}
