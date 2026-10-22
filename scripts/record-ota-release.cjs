const fs = require('node:fs');
const path = require('node:path');

function recordRelease(file, variant, audience, message, now = new Date()) {
  if (!['gerador','consumidor'].includes(variant) || !['internal','clients'].includes(audience) || !String(message).trim()) throw new Error('Dados da publicação inválidos.');
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).formatToParts(now);
  const p = Object.fromEntries(parts.map(item=>[item.type,item.value]));
  const entry = { numero:`OTA ${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}`, data:`${p.day}/${p.month}/${p.year}`, variant, audience, melhorias:[String(message).trim()] };
  records.unshift(entry);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(records,null,2)+'\n');
  fs.renameSync(`${file}.tmp`,file);
  return entry;
}
module.exports = {recordRelease};
if (require.main === module) recordRelease(path.join(__dirname,'../config/ota-release-history.json'), ...process.argv.slice(2));
