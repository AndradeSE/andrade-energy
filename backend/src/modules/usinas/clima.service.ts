import { municipioDoEndereco, estadoDoClima, noiteNaLocalizacao, periodoAtual } from "./clima.policy";

type Fetcher = typeof fetch;
type Location = { lat: number; lon: number; regiao: string; fuso: string };
type Entry<T> = { value: T; until: number };
const MINUTE = 60_000;
const UA = "AndradeEnergy/1.0 (https://www.andradeenergy.com.br)";

export function criarConsultaClima(fetcher: Fetcher = fetch, clock = Date.now) {
  const forecasts = new Map<string, Entry<{ series: any[]; consultedAt: string }>>();
  const failures = new Map<string, number>();
  const pending = new Map<string, Promise<any>>();
  function put<T>(cache: Map<string, T>, key: string, value: T) {
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, value);
  }
  async function json(url: string) {
    const response = await fetcher(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!response.ok) throw Error("Provedor de clima indisponível.");
    return { body: await response.json() as any, expires: Date.parse(response.headers.get("expires") ?? "") };
  }
  async function load(location: Location) {
    // Coordenadas públicas da sede municipal, nunca coordenadas da usina.
    const key = `${location.lat},${location.lon}`;
    let forecast = forecasts.get(key)?.until! > clock() ? forecasts.get(key)?.value : undefined;
    if (!forecast) {
      const { body, expires } = await json(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${location.lat}&lon=${location.lon}`);
      if (!Array.isArray(body.properties?.timeseries)) throw Error("Resposta de clima inválida.");
      forecast = { series: body.properties.timeseries, consultedAt: new Date(clock()).toISOString() };
      put(forecasts, key, { value: forecast, until: Math.max(clock() + 15 * MINUTE, Number.isFinite(expires) ? expires : 0) });
    }
    const point = periodoAtual(forecast.series, clock());
    const symbol = point?.data?.next_1_hours?.summary?.symbol_code;
    const temperature = point?.data?.instant?.details?.air_temperature;
    const night = noiteNaLocalizacao(location.lat, location.lon, clock());
    const state = estadoDoClima(symbol, night);
    if (!state || typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < -50 || temperature > 65) throw Error("Clima atual não disponível.");
    return { disponivel: true, ...state, noite: night, temperatura: Math.round(temperature), regiao: location.regiao, fuso: location.fuso, referencia: point.time, consultadoEm: forecast.consultedAt, fonte: "MET Norway", estimativa: true };
  }
  return async (address: unknown) => {
    const location = municipioDoEndereco(address);
    if (!location) return { disponivel: false, motivo: "Confira o município e a UF no endereço da usina." };
    if ((failures.get(location.id) ?? 0) > clock()) return { disponivel: false, motivo: "Clima temporariamente indisponível." };
    if (pending.has(location.id)) return pending.get(location.id)!;
    const request = load(location).catch(() => {
      put(failures, location.id, clock() + 5 * MINUTE);
      return { disponivel: false, motivo: "Clima temporariamente indisponível." };
    }).finally(() => pending.delete(location.id));
    pending.set(location.id, request);
    return request;
  };
}

export const consultarClimaDoEndereco = criarConsultaClima();
