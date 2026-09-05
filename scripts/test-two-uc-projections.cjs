const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function compile(source) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports });
  return module.exports;
}
const appSource = fs.readFileSync('components/cadastro/RealDiscountInfo.tsx', 'utf8');
const app = compile('const PERCENTUAL_ESTIMADO_FIO_B_SEM_HISTORICO=0.13;\n' + appSource.slice(appSource.indexOf('function numeroBrasileiro('), appSource.indexOf('function resumoDosRepasses(')) + '\nexport { calcularPrevia, obterTarifaDaCompetencia };');
const web = compile(fs.readFileSync('portal-web/src/realDiscountCalculator.ts', 'utf8'));
const { calcularFaturaUnificada } = require('../backend/dist/modules/billing/billing.engine.js');
const scenarios = [
  { uc: '1204584501840', simulation: 0, data: { energiaInjetada: 375, energiaCompensada: 303, energiaCompensadaGD2: 303, tarifaCheia: 1.20907534, valorTotal: 128.17, valorEnergiaConcessionaria: 63.0669278, custoDisponibilidadeGD2: 14.346767, tarifaScee: 0.62352, tarifaGD2: 0.4626174 }, availability: 14.346767, wire: 303 * (0.62352 - 0.4626174) },
  { uc: '595935101808', simulation: 68, data: { consumo: 68, tarifaCheia: 1.18002201, valorTotal: 74.97, custoDisponibilidadeGD2: 7.7364603 }, availability: 7.7364603, wire: 68 * (0.62352 - 0.4626174) },
];
async function main() {
const { montarHistoricoTarifasGd2 } = require('../backend/dist/modules/usinas/tarifasReferencia.js');
if (process.argv.includes('--live')) {
  require('dotenv').config({quiet:true});
  const db = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const {data, error} = await db.from('faturas_anexadas_clientes').select('dados_fatura');
  if (error) throw error;
  for (const s of scenarios) {
    const source = data.find(x => x.dados_fatura?.uc === s.uc)?.dados_fatura;
    assert.ok(source, `Fatura da UC ${s.uc} ausente`);
    s.data = source;
  }
}
const history = montarHistoricoTarifasGd2(scenarios.map(s => ({referencia:'JUL/2026', ...s.data})));
assert.equal(history[0].tarifa_scee, .62352);
assert.equal(montarHistoricoTarifasGd2([{referencia:'JUL/2026',tarifa_cheia:1.209,tarifa_gd:.4626}]).length, 0, 'Tarifa cheia não pode se passar por SCEE');
const monthly = [...history, {referencia:'2026-09',tarifa_scee:.8,tarifa_gd2:.5}];
assert.equal(web.findMonthlyTariff({referencia:'JUL/2026'},monthly).tarifa_scee,.62352);
assert.equal(app.obterTarifaDaCompetencia({referencia:'AGO/2026'},monthly).tarifa_scee,.62352);
let count = 0;
for (const s of scenarios) for (const mode of ['INJECAO', 'COMPENSACAO']) for (const availability of ['REPASSAR', 'ABSORVER']) for (const wire of ['REPASSAR', 'ABSORVER']) for (const separate of [false, true]) {
  const kwh = s.simulation || (mode === 'INJECAO' ? s.data.energiaInjetada : s.data.energiaCompensada);
  const reference = kwh * s.data.tarifaCheia;
  const refund = (availability === 'ABSORVER' ? s.availability : 0) + (wire === 'ABSORVER' ? s.wire : 0);
  const supplierEnergy = s.simulation ? s.availability + s.wire : s.data.valorEnergiaConcessionaria;
  const expectedAndrade = Math.max(0, reference * .6 - refund);
  const expectedDiscount = Math.min(40, Math.max(0, (reference - supplierEnergy - expectedAndrade) / reference * 100));
  const ref = web.findMonthlyTariff(s.data,history);
  const w = web.calculateProjection({ data: s.data, discount: 40, billingMode: mode, type: 'GD2', gd1: 'REPASSAR', gd2: availability, fioB: wire, projectedConsumption: s.simulation, sceeReference: ref.tarifa_scee, gd2Reference: ref.tarifa_gd2 });
  const a = app.calcularPrevia({ dados: s.data, desconto: 40, modalidadeFaturamento: mode, tipoGd: 'GD2', disponibilidadeGd1: 'REPASSAR', disponibilidadeGd2: availability, fioBGd2: wire, consumoIntegralProjetado: s.simulation, tarifaSceeReferencia: ref.tarifa_scee, tarifaGd2Referencia: ref.tarifa_gd2 });
  const b = calcularFaturaUnificada({ modalidade: mode, energiaInjetada: kwh, energiaCompensada: kwh, tarifaCheia: s.data.tarifaCheia, descontoPercentual: 40, valorCemig: s.data.valorTotal, valorEnergiaConcessionaria: supplierEnergy, custoDisponibilidadeRepassavel: s.availability, diferencaFioBRepassavel: s.wire, repassarCustoDisponibilidade: availability === 'REPASSAR', repassarDiferencaFioBGD2: wire === 'REPASSAR', faturaSomenteAndrade: separate });
  assert.ok(w && a);
  assert.ok(w.realDiscount > 0 && a.descontoReal > 0, 'As duas faturas reais não devem zerar nestas configurações');
  assert.ok(Math.abs(w.realDiscount - expectedDiscount) < .0001);
  // O app usa precisão integral; a web e o faturamento limitam resíduos ao
  // desconto contratado. A diferença existente é inferior a 0,01 ponto.
  assert.ok(Math.abs(a.descontoReal - expectedDiscount) < .01);
  assert.ok(Math.abs(b.descontoRealPercentual - expectedDiscount) < .0001);
  assert.ok(Math.abs(b.valorUsina - expectedAndrade) <= .0051);
  assert.ok(Math.abs(b.valorTotalUnificado - (expectedAndrade + (separate ? 0 : s.data.valorTotal))) <= .0051);
  assert.ok(Math.abs(w.wireBCost - s.wire) < .000001);
  assert.ok(Math.abs(a.diferencaFioB - s.wire) < .000001);
  console.log(`${s.uc} ${mode} disp=${availability} fio=${wire} ${separate ? 'SEPARADA' : 'UNIFICADA'}: ${expectedDiscount.toFixed(2)}% / Andrade R$ ${expectedAndrade.toFixed(2)}`);
  count++;
}
console.log(`${count} configurações validadas entre app, web e faturamento.`);
for (const mode of ['INJECAO','COMPENSACAO']) for (const availability of ['REPASSAR','ABSORVER']) for (const wire of ['REPASSAR','ABSORVER']) {
  const data = {...scenarios[1].data, custoDisponibilidadeGD1:27.6642};
  const w = web.calculateProjection({data,discount:40,billingMode:mode,type:'GD1',gd1:availability,gd2:availability,fioB:wire,projectedConsumption:68,sceeReference:.62352,gd2Reference:.4626174});
  const a = app.calcularPrevia({dados:data,desconto:40,modalidadeFaturamento:mode,tipoGd:'GD1',disponibilidadeGd1:availability,disponibilidadeGd2:availability,fioBGd2:wire,consumoIntegralProjetado:68,tarifaSceeReferencia:.62352,tarifaGd2Referencia:.4626174});
  assert.equal(w.wireBCost,0); assert.equal(a.diferencaFioB,0);
  assert.ok(Math.abs(w.realDiscount-a.descontoReal)<.0001);
}
console.log('8 combinações GD1 adicionais: Fio B sempre zero; app e web equivalentes.');
}
main().catch(error => {console.error(error.message); process.exitCode=1;});
