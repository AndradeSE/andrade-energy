/** Homologation links must never be handled by the production APK. */
export function appScheme(variant: "gerador" | "consumidor") {
  const homologacao = process.env.APP_ENV === "preview" ||
    /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL ?? "");
  return `andradeenergy${variant}${homologacao ? "preview" : ""}`;
}
