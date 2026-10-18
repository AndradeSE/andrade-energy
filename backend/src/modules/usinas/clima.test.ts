import assert from "node:assert/strict";
import test from "node:test";
import { municipioDoEndereco, coordenadasBrasileiras, estadoDoClima, noiteNaLocalizacao, periodoAtual } from "./clima.policy";
import { criarConsultaClima } from "./clima.service";

const address = "Logradouro: NÃO ENVIAR\nNúmero: 123\nCidade: Belo Horizonte\nUF: MG\nCEP: 30130-000";
test("resolve município localmente e rejeita localização desconhecida ou ambígua", () => {
  assert.equal(municipioDoEndereco(address)?.regiao, "Belo Horizonte/MG");
  assert.equal(municipioDoEndereco("Rua de teste, Belo Horizonte/MG")?.regiao, "Belo Horizonte/MG");
  assert.equal(municipioDoEndereco("UC 1204584501840 CEP 30130-000"), undefined);
  assert.equal(municipioDoEndereco("Cidade: Não existe\nUF: MG"), undefined);
  assert.equal(municipioDoEndereco("Belo Horizonte/MG, São Paulo/SP"), undefined);
  assert.equal(coordenadasBrasileiras(null, "-43"), undefined);
  assert.equal(coordenadasBrasileiras("", ""), undefined);
  assert.equal(coordenadasBrasileiras("59.9", "10.7"), undefined);
});
test("noite acompanha posição solar e mantém chuva/nuvens durante a noite", () => {
  assert.equal(noiteNaLocalizacao(-19.9, -43.9, Date.parse("2026-10-17T15:00:00Z")), false);
  assert.equal(noiteNaLocalizacao(-19.9, -43.9, Date.parse("2026-10-18T02:00:00Z")), true);
  assert.deepEqual(estadoDoClima("clearsky_day", true), { tipo: "noite", descricao: "Noite" });
  assert.equal(estadoDoClima("rain", true)?.descricao, "Chuva à noite");
  assert.equal(estadoDoClima("cloudy", true)?.descricao, "Noite nublada");
  assert.equal(estadoDoClima("unknown", false), undefined);
});
test("não usa previsão distante como clima atual", () => {
  const now = Date.parse("2026-10-17T15:20:00Z");
  assert.equal(periodoAtual([{ time: "2026-10-17T18:00:00Z" }], now), undefined);
  assert.equal(periodoAtual([{ time: "2026-10-17T15:00:00Z" }, { time: "2026-10-17T16:00:00Z" }], now)?.time, "2026-10-17T15:00:00Z");
});
const forecast = { properties: { timeseries: [{ time: "2026-10-17T15:00:00Z", data: { instant: { details: { air_temperature: 26.4 } }, next_1_hours: { summary: { symbol_code: "clearsky_day" } } } }] } };
test("só transmite coordenadas municipais públicas e deduplica o cache", async () => {
  const calls: string[] = [];
  const provider = criarConsultaClima((async (url, options) => {
    calls.push(String(url));
    assert.match(String((options?.headers as Record<string, string>)["User-Agent"]), /AndradeEnergy/);
    return new Response(JSON.stringify(forecast), { status: 200, headers: { expires: "Sat, 17 Oct 2026 16:00:00 GMT" } });
  }) as typeof fetch, () => Date.parse("2026-10-17T15:20:00Z"));
  const [a, b] = await Promise.all([provider(address), provider("Cidade: Belo Horizonte\nUF: MG\nCEP: 99999-999")]);
  assert.equal(a.disponivel, true);
  assert.equal(a.tipo, "sol");
  assert.equal(a.temperatura, 26);
  assert.equal(b.regiao, "Belo Horizonte/MG");
  await provider(address);
  assert.equal(calls.length, 1);
  const city = municipioDoEndereco(address)!;
  assert.equal(calls[0], `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${city.lat}&lon=${city.lon}`);
  assert.doesNotMatch(calls[0], /30130|99999|ENVIAR|120458|cep|address/i);
});
test("cidade ausente não consulta fornecedor nem inventa condição", async () => {
  const provider = criarConsultaClima((async () => { throw Error("Não pode consultar"); }) as typeof fetch);
  const data = await provider("Endereço sem cidade e UF\nCEP: 30130-000");
  assert.equal(data.disponivel, false);
  assert.equal(data.tipo, undefined);
});
test("resposta sem temperatura ou condição não inventa clima", async () => {
  const provider = criarConsultaClima((async () => new Response(JSON.stringify({ properties: { timeseries: [] } }), { status: 200 })) as typeof fetch);
  assert.equal((await provider(address)).disponivel, false);
});
test("falha evita consultas repetidas por cinco minutos", async () => {
  let calls = 0;
  const provider = criarConsultaClima((async () => { calls++; return new Response("", { status: 429 }); }) as typeof fetch);
  assert.equal((await provider(address)).disponivel, false);
  assert.equal((await provider(address)).disponivel, false);
  assert.equal(calls, 1);
});
