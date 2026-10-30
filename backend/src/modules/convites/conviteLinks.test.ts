import assert from "node:assert/strict";
import test from "node:test";
import { linksDoConvite } from "./conviteLinks";

test("convites usam app e rota web do perfil correto, com token codificado", () => {
  const saved = { ...process.env };
  try {
    delete process.env.PORTAL_WEB_URL; delete process.env.APP_CONSUMIDOR_DOWNLOAD_URL; delete process.env.APP_GERADOR_DOWNLOAD_URL;
    process.env.APP_ENV = "production"; process.env.SUPABASE_URL = "https://example.supabase.co";
    for (const tipo of ["consumidor", "gerador"] as const) {
      const links = linksDoConvite(tipo, "token&teste");
      assert.equal(links.app, `andradeenergy${tipo}://criar-conta?convite=token%26teste`);
      assert.equal(links.download, `https://www.andradeenergy.com.br/downloads/andrade-energy-${tipo}.apk`);
      assert.equal(new URL(links.web).pathname, tipo === "gerador" ? "/convite-gerador" : "/convite");
      assert.equal(new URL(links.web).searchParams.get("convite"), "token&teste");
    }
    process.env.APP_ENV = "preview";
    assert.match(linksDoConvite("gerador", "teste").web, /^https:\/\/andrade-energy-preview\./);
    assert.match(linksDoConvite("consumidor", "teste").app, /^andradeenergyconsumidorpreview:/);
    process.env.PORTAL_WEB_URL = "http://inseguro.invalid";
    assert.throws(() => linksDoConvite("gerador", "teste"), /HTTPS/);
  } finally { for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved); }
});
