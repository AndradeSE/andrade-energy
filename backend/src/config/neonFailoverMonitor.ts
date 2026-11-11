type Recovery = { stop(): void };

export function createNeonFailoverMonitor(options: {
  probePrimary(): Promise<boolean | null>;
  activate(): Promise<Recovery | null>;
  onTransition(provider: "SUPABASE" | "NEON"): Promise<void>;
}) {
  let recovery: Recovery | null = null;
  let consecutive = 0;
  let running = false;

  return async function tick() {
    if (running) return;
    running = true;
    try {
      const primaryHealthy = await options.probePrimary().catch(() => null);
      const shouldSwitch = primaryHealthy !== null && primaryHealthy === Boolean(recovery);
      consecutive = shouldSwitch ? consecutive + 1 : 0;
      if (consecutive < 2) return;
      consecutive = 0;
      if (recovery) {
        recovery.stop();
        recovery = null;
        await options.onTransition("SUPABASE");
      } else {
        recovery = await options.activate();
        if (recovery) await options.onTransition("NEON");
      }
    } finally {
      running = false;
    }
  };
}
