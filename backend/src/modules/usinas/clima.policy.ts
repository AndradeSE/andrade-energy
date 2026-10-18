import municipios from "./municipios.data.json";
const normalizar = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const cidades = new Map(municipios.map(item => [`${item.uf}|${normalizar(item.nome)}`, item]));

// Resolução inteiramente local. Nenhum CEP, rua ou nome privado é enviado.
export function municipioDoEndereco(endereco: unknown) {
  if (typeof endereco !== "string") return undefined;
  const cidade = endereco.match(/^Cidade:\s*([^\n\r]+)/im)?.[1]?.trim();
  const uf = endereco.match(/^UF:\s*([A-Z]{2})\b/im)?.[1]?.toUpperCase();
  const candidatos = cidade && uf ? [[cidade, uf]] : Array.from(endereco.matchAll(/([^,;\n\r]+?)\s*[-/]\s*([A-Z]{2})\b/gi), match => [match[1].trim(), match[2].toUpperCase()]);
  const identificados = candidatos.map(([nome, estado]) => cidades.get(`${estado}|${normalizar(nome)}`)).filter(Boolean);
  const unicos = [...new Map(identificados.map(item => [item!.id, item!])).values()];
  if (unicos.length !== 1) return undefined;
  const municipio = unicos[0];
  const point = coordenadasBrasileiras(municipio.lat, municipio.lon);
  if (!point) return undefined;
  return { ...point, id: String(municipio.id), regiao: `${municipio.nome}/${municipio.uf}`, fuso: municipio.fuso || "UTC" };
}

export function coordenadasBrasileiras(latitude: unknown, longitude: unknown) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return undefined;
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -34 || lat > 6 || lon < -74 || lon > -28) return undefined;
  return { lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) };
}

// Altura solar aproximada (NOAA); independe do fuso do aparelho.
export function noiteNaLocalizacao(lat: number, lon: number, now: number) {
  const date = new Date(now);
  const day = Math.floor((now - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86_400_000) + 1;
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const gamma = 2 * Math.PI / 365 * (day - 1 + (hour - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const dec = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const rad = Math.PI / 180;
  const angle = ((hour * 60 + eq + 4 * lon) / 4 - 180) * rad;
  const altitude = Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(angle)) / rad;
  return altitude < -0.833;
}

export function estadoDoClima(symbol: unknown, night: boolean) {
  if (typeof symbol !== "string") return undefined;
  if (/snow/.test(symbol)) return { tipo: "chuva" as const, descricao: night ? "Neve à noite" : "Neve" };
  if (/sleet/.test(symbol)) return { tipo: "chuva" as const, descricao: "Chuva e gelo" };
  if (/thunder/.test(symbol)) return { tipo: "chuva" as const, descricao: night ? "Trovoadas à noite" : "Trovoadas" };
  if (/rain|sleet|snow/.test(symbol)) return { tipo: "chuva" as const, descricao: night ? "Chuva à noite" : "Chuvoso" };
  if (/cloudy|fog/.test(symbol)) return { tipo: night ? "noite" as const : "nublado" as const, descricao: night ? "Noite nublada" : /fair|partly/.test(symbol) ? "Parcialmente nublado" : "Nublado" };
  if (/clearsky|fair/.test(symbol)) return { tipo: night ? "noite" as const : "sol" as const, descricao: night ? "Noite" : "Ensolarado" };
  return undefined;
}

export function periodoAtual(series: any[], now: number) {
  return series.filter(item => typeof item?.time === "string" && Math.abs(Date.parse(item.time) - now) <= 65 * 60_000)
    .sort((a, b) => Math.abs(Date.parse(a.time) - now) - Math.abs(Date.parse(b.time) - now))[0];
}
