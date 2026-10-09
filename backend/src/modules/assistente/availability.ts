// Production rollout is explicit and remains off until the provider keys are configured.
export function assistantAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ASSISTANT_ENABLED === "1" || env.APP_ENV === "preview" ||
    /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(env.SUPABASE_URL ?? "");
}
