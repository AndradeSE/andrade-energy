const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('components/cadastro/RealDiscountInfo.tsx', 'utf8');
const calculation = 'const PERCENTUAL_ESTIMADO_FIO_B_SEM_HISTORICO = 0.13;\n'
  + source.slice(source.indexOf('function numeroBrasileiro('), source.indexOf('function resumoDosRepasses('))
  + '\nexport { obterConsumoProjetado, calcularPrevia };';
const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(calculation, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports });
const { obterConsumoProjetado, calcularPrevia } = moduleUnderTest.exports;

const dados = { consumo: 1, tarifaCheia: 1.18, valorTotal: 180, custoDisponibilidadeGD2: 13.27 };
assert.equal(obterConsumoProjetado(dados, '5880'), 5880);
assert.equal(obterConsumoProjetado(dados, '5.880,00'), 5880);
assert.equal(obterConsumoProjetado({ consumo: 303 }, ''), 303);

for (const disponibilidade of ['REPASSAR', 'ABSORVER']) {
  for (const fioB of ['REPASSAR', 'ABSORVER']) {
    const result = calcularPrevia({
      dados, desconto: 40, tipoGd: 'GD2', modalidadeFaturamento: 'COMPENSACAO',
      disponibilidadeGd1: 'REPASSAR', disponibilidadeGd2: disponibilidade,
      fioBGd2: fioB, consumoIntegralProjetado: obterConsumoProjetado(dados, 5880),
    });
    assert.ok(result.descontoReal > 0 && result.descontoReal <= 40);
    assert.equal(result.baseDesconto, 5880 * 1.18);
    if (disponibilidade === 'ABSORVER' && fioB === 'ABSORVER') {
      assert.ok(Math.abs(result.descontoReal - 40) < 0.000001);
    }
  }
}
console.log('Consumo configurado preservado e quatro combinações de repasses validadas.');
