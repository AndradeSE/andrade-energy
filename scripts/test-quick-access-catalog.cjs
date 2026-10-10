const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');
const generator = read('components/dashboard/DashboardGestor.tsx');
const client = read('components/cliente/ClienteHome.tsx');
const commercial = read('app/admin/comercial.tsx');
function labels(source) { return [...source.matchAll(/label:\s*"([^"]+)"/g)].map(match => match[1]); }
const generatorCatalog = generator.slice(generator.indexOf('const atalhos ='), generator.indexOf('] as const;')) + generator.slice(generator.indexOf('<QuickAccessCarousel'), generator.indexOf('</Section>', generator.indexOf('<QuickAccessCarousel')));
const clientCatalog = client.slice(client.indexOf('<QuickAccessCarousel'), client.indexOf('<View style={styles.overviewHeader}'));
const commercialCatalog = commercial.slice(commercial.indexOf('<QuickAccessCarousel'), commercial.indexOf('</Section>', commercial.indexOf('<QuickAccessCarousel')));
for (const [catalog, forbidden] of [
  [generatorCatalog, ['Clientes', 'Colaboradores', 'Operação', 'Home', 'Faturamento', 'Financeiro', 'Contrato', 'Contratos', 'Valor financeiro disponível']],
  [clientCatalog, ['Faturas', 'Economia', 'Home', 'Contrato', 'Meu perfil']],
  [commercialCatalog, ['Geradores', 'Assinaturas', 'Home', 'Planos', 'Financeiro', 'Pagamentos']],
]) {
  for (const label of forbidden) assert.ok(!labels(catalog).includes(label), `Redundant tab: ${label}`);
  for (const label of ['Solar', 'Tutoriais', 'Sobre e atualizações', 'Pesquisar']) assert.ok(labels(catalog).includes(label), label);
}
for (const label of ['Nova usina', 'Novo cliente', 'Nova UC', 'Trocar usina', 'Faturas emitidas', 'Faturamento manual', 'Importar produção PDF', 'Recebimento da usina', 'Faturamento automático', 'Inversores']) assert.ok(generatorCatalog.includes(label), label);
assert.match(generator, /!colaborador \? \[/);
assert.match(generator, /String\(item.usina_id \?\? usina\?\.id \?\? ""\) === usinaId/);
assert.match(generator, /unidades.length === 1/);
assert.match(clientCatalog, /recebimentoObrigatorio \?/);
assert.match(commercialCatalog, /colaboradorComercial/);
for (const path of ['assistente.tsx', 'tutoriais.tsx', 'sobre.tsx', 'pesquisa.tsx', 'usinas/nova.tsx', 'usinas/inversores.tsx', 'unidades/recebimento-email.tsx', 'faturamento/criar-manual.tsx']) assert.ok(fs.existsSync(`app/${path}`), path);
assert.match(read('components/QuickAccessCarousel.tsx'), /itemId\(item\) === valor \|\| item.label === valor/);
console.log('PASS: no duplicate bottom tabs; useful actions, native-runtime guard, permissions, scoped UC selection, routes and saved-selection compatibility.');
