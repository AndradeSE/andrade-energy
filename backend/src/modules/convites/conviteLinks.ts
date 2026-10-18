import { appScheme } from "../../utils/appScheme";

export function linksDoConvite(tipo: "consumidor" | "gerador", token: string) {
  const preview = appScheme(tipo).endsWith("preview");
  const portal = String(process.env.PORTAL_WEB_URL || (preview ? "https://andrade-energy-preview.anacarolinesantos73.chatgpt.site" : "https://www.andradeenergy.com.br")).replace(/\/$/, "");
  const download = process.env[tipo === "gerador" ? "APP_GERADOR_DOWNLOAD_URL" : "APP_CONSUMIDOR_DOWNLOAD_URL"] || (preview
    ? `https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-${tipo}-preview.apk`
    : `https://www.andradeenergy.com.br/downloads/andrade-energy-${tipo}.apk`);
  for (const value of [portal, download]) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw Error("Link de convite não configurado com HTTPS.");
  }
  return { portal, download, web: `${portal}/${tipo === "gerador" ? "convite-gerador" : "convite"}?convite=${encodeURIComponent(token)}`, app: `${appScheme(tipo)}://criar-conta?convite=${encodeURIComponent(token)}` };
}
