export type TransferAttempt = { amount: number; destination: string; key: string };
export function transferAttempt(previous: TransferAttempt | null, amount: number, destination: string, createKey: () => string): TransferAttempt {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor de transferência válido e maior que zero.");
  if (previous?.amount === amount && previous.destination === destination) return previous;
  return { amount, destination, key: createKey() };
}
