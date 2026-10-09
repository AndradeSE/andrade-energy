const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const [envFile, ...directories] = process.argv.slice(2);
if (!envFile || !directories.length) throw new Error('Informe configuração privada e diretórios de exportação.');
const env = dotenv.parse(fs.readFileSync(envFile));
const secrets = Object.entries(env).filter(([key, value]) => /KEY|SECRET|TOKEN|PASSWORD/.test(key) && value.length >= 24);
const leaks = new Set();
let inspected = 0;
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) { inspect(target); continue; }
    const content = fs.readFileSync(target);
    inspected++;
    for (const [key, value] of secrets) if (content.includes(Buffer.from(value))) leaks.add(key);
  }
}
directories.forEach(inspect);
console.log(JSON.stringify({ arquivos: inspected, segredosVerificados: secrets.length, nomesDeSegredosEncontrados: [...leaks] }));
if (leaks.size) process.exitCode = 1;
