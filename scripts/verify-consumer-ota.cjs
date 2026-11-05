const fs = require('node:fs');
const path = require('node:path');

// Verifica o conteúdo realmente exportado, não apenas a mensagem da OTA.
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || 'dist');
const bundleDir = path.join(output, '_expo/static/js/android');
const maps = fs.readdirSync(bundleDir).filter(name => name.endsWith('.map'));
if (maps.length !== 1) throw new Error('Esperada uma source map Android para conferir o pacote.');
const map = JSON.parse(fs.readFileSync(path.join(bundleDir, maps[0]), 'utf8'));
const required = {
  'app/selecionar-unidade.tsx': ['Solicitar cadastro de nova UC', 'styles.requestAction'],
  'app/clientes/faturas-anexadas.tsx': ['label="Senha do PDF" placeholder="Opcional"', 'Se o PDF não tiver senha, deixe em branco.', 'Excluir PDF enviado', 'Remover PDF'],
  'app/(tabs)/faturas.tsx': [],
  'app/_layout.tsx': ['mostrarCarregamento={!preparandoEntrada && entryScreenReady}'],
  'components/cliente/ClienteHome.tsx': ['solicitar-nova-uc'],
  'components/navigation/ContractAccessGate.tsx': ['!mostrarCarregamento'],
  'components/navigation/PersistentAppTabs.tsx': [],
  'services/clientes.service.ts': [],
  'app/historico-autoleituras.tsx': [],
};
for (const [file, markers] of Object.entries(required)) {
  const index = map.sources.findIndex(source => source.replaceAll('\\', '/').endsWith('/' + file));
  if (index < 0 || typeof map.sourcesContent?.[index] !== 'string') throw new Error('Arquivo ausente no bundle: ' + file);
  const exported = map.sourcesContent[index].replaceAll('\r', '');
  const current = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r', '');
  if (exported !== current) throw new Error('Bundle desatualizado: ' + file);
  for (const marker of markers) if (!exported.includes(marker)) throw new Error('Melhoria ausente em ' + file + ': ' + marker);
  console.log('Conferido: ' + file);
}
console.log('Pacote Consumidor completo e correspondente à fonte atual.');
