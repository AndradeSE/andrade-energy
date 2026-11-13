const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
if (process.env.EXPO_PUBLIC_APP_VARIANT !== 'consumidor') process.exit(0);
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'config/consumer-release-baseline.json'), 'utf8'));
const changed = Object.entries(baseline.files).filter(([file, expected]) => {
  const full = path.join(root, file);
  return !fs.existsSync(full) || crypto.createHash('sha256').update(fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n')).digest('hex') !== expected;
}).map(([file]) => file);
if (changed.length) {
  console.error('PUBLICACAO BLOQUEADA: arquivos diferem da base conferida do Consumidor:\n' + changed.join('\n'));
  console.error('Revise as diferencas e homologue no Preview antes de atualizar a base. Nao reutilize um checkout antigo.');
  process.exit(1);
}
console.log('Base do Consumidor conferida: ' + Object.keys(baseline.files).length + ' arquivos.');
