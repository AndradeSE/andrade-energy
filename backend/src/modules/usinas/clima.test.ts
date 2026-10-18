import assert from "node:assert/strict";
import test from "node:test";
import { cepDoEndereco, coordenadasBrasileiras, estadoDoClima, noiteNaLocalizacao, periodoAtual } from "./clima.policy";
import { criarConsultaClima } from "./clima.service";

test("localização exige CEP explícito e coordenadas válidas no Brasil", () => {
  assert.equal(cepDoEndereco("Logradouro: Rua de teste\nCEP: 30130-000"), "30130000");
  assert.equal(cepDoEndereco("Centro 30130-000"), "30130000");
  assert.equal(cepDoEndereco("UC 1204584501840"), undefined);
  assert.equal(coordenadasBrasileiras(null, "-43"), undefined);
  assert.equal(coordenadasBrasileiras("", ""), undefined);
  assert.equal(coordenadasBrasileiras("59.9", "10.7"), undefined);
  assert.deepEqual(coordenadasBrasileiras("-19.916712", "-43.934512"), { lat: -19.9167, lon: -43.9345 });
});
test("noite acompanha a posição solar da usina, não o fuso do celular", () => {
  assert.equal(noiteNaLocalizacao(-19.9, -43.9, Date.parse("2026-10-17T15:00:00Z")), false);
  assert.equal(noiteNaLocalizacao(-19.9, -43.9, Date.parse("2026-10-18T02:00:00Z")), true);
  assert.deepEqual(estadoDoClima("clearsky_day", true), { tipo: "noite", descricao: "Noite" });
  assert.equal(estadoDoClima("rain", true)?.descricao, "Chuva à noite");
  assert.equal(estadoDoClima("cloudy", true)?.descricao, "Noite nublada");
  assert.equal(estadoDoClima("unknown", false), undefined);
});
test("nunca apresenta previsão distante como clima atual", () => {
  const now = Date.parse("2026-10-17T15:20:00Z");
  assert.equal(periodoAtual([{ time: "2026-10-17T18:00:00Z" }], now), undefined);
  assert.equal(periodoAtual([{ time: "2026-10-17T15:00:00Z" }, { time: "2026-10-17T16:00:00Z" }], now)?.time, "2026-10-17T15:00:00Z");
});
const location = { city: "Belo Horizonte", state: "MG", timezoneName: "America/Sao_Paulo", location: { coordinates: { latitude: "-19.9167", longitude: "-43.9345" } } };
const forecast = { properties: { timeseries: [{ time: "2026-10-17T15:00:00Z", data: { instant: { details: { air_temperature: 26.4 } }, next_1_hours: { summary: { symbol_code: "clearsky_day" } } } }] } };
test("consulta só o CEP e coordenadas fixas; deduplica requisições e respeita cache", async () => {
  const calls: string[] = [];
  const provider = criarConsultaClima((async (url, options) => {
    calls.push(String(url));
    assert.match(String((options?.headers as Record<string, string>)["User-Agent"]), /AndradeEnergy/);
    return new Response(JSON.stringify(calls.length === 1 ? location : forecast), { status: 200, headers: { expires: "Sat, 17 Oct 2026 16:00:00 GMT" } });
  }) as typeof fetch, () => Date.parse("2026-10-17T15:20:00Z"));
  const [a, b] = await Promise.all([provider("CEP: 30130-000\nNome: NÃO ENVIAR"), provider("CEP: 30130-000")]);
  assert.equal(a.disponivel, true);
  assert.equal(a.tipo, "sol");
  assert.equal(a.temperatura, 26);
  assert.equal(b.regiao, "Belo Horizonte/MG");
  await provider("CEP: 30130-000");
  assert.equal(calls.length, 2);
  assert.equal(calls[0], "https://brasilapi.com.br/api/cep/v2/30130000");
  assert.equal(calls[1], "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-19.9167&lon=-43.9345");
});
test("CEP ausente não consulta fornecedor nem inventa condição", async () => {
  const provider = criarConsultaClima((async () => { throw Error("Não pode consultar"); }) as typeof fetch);
  const data = await provider("Endereço sem CEP");
  assert.equal(data.disponivel, false);
  assert.equal(data.tipo, undefined);
});
test("coordenadas ausentes não viram zero nem clima de outra cidade", async () => {
  let calls = 0;
  const provider = criarConsultaClima((async () => {
    calls++;
    return new Response(JSON.stringify({ ...location, location: { coordinates: { latitude: null, longitude: null } } }), { status: 200 });
  }) as typeof fetch);
  assert.equal((await provider("CEP: 30130-000")).disponivel, false);
  assert.equal(calls, 1);
});
test("falha do fornecedor é indisponibilidade e evita novas consultas em sequência", async () => {
  let calls = 0;
  const provider = criarConsultaClima((async () => { calls++; return new Response("", { status: 429 }); }) as typeof fetch);
  assert.equal((await provider("CEP: 30130-000")).disponivel, false);
  assert.equal((await provider("CEP: 30130-000")).disponivel, false);
  assert.equal(calls, 1);
});
