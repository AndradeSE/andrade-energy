// Token is accepted through a hidden terminal input, never a file, argument or log.
const assert = require('node:assert/strict');
if (!process.stdin.isTTY) throw new Error('Use um terminal com entrada privada.');
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
console.log('Ready for private recovery check JSON (input is hidden).');
let input = '';
process.stdin.on('data', chunk => {
  if (chunk.includes('\u0003')) process.exit(1);
  input += chunk;
  if (!/[\r\n]/.test(input)) return;
  process.stdin.pause();
  process.stdin.setRawMode(false);
  const line = input.split(/[\r\n]/,1)[0].trim(); input = '';
  run(line).then(summary => { console.log(JSON.stringify(summary));process.exit(0); })
    .catch(() => { console.error('Conferência HTTP da recuperação não concluída. Nenhuma credencial foi registrada.');process.exit(1); });
});
async function run(line) {
  const { token, contractId } = JSON.parse(line);
  assert.match(token,/^[a-f0-9]{64}$/);
  assert.match(contractId,/^[a-f0-9-]{36}$/i);
  const origin = 'https://andrade-energy-api-homologacao.onrender.com';
  const request = (path,authenticated=true,method='GET') => fetch(origin+path,{
    method,redirect:'error',headers:authenticated?{Authorization:`Bearer ${token}`}:{},
    signal:AbortSignal.timeout(20000),
  });
  const health = await request('/health',false);
  assert.equal(health.status,200);
  assert.equal((await health.json()).status,'read-only');
  console.log('Recuperação publicada confirmada.');
  assert.equal((await request('/api/auth/session',false)).status,401);
  const session = await request('/api/auth/session');assert.equal(session.status,200);
  const user=(await session.json()).usuario;
  assert.ok(user.id && user.empresa_id);
  console.log('Sessão autenticada confirmada.');
  const clients=await request('/api/clientes');assert.equal(clients.status,200);
  const rows=await clients.json();assert.ok(Array.isArray(rows));
  assert.ok(rows.every(row=>row.empresa_id===user.empresa_id));
  console.log('Consulta de clientes isolada por empresa confirmada.');
  const quotas=await request('/api/cotas-servicos?catalogo=3');assert.equal(quotas.status,200);
  const reserve=(await quotas.json()).reservaDados;
  assert.equal(reserve.banco,'NEON');assert.equal(reserve.modo,'SOMENTE_LEITURA');
  const notices=await request('/api/notificacoes');assert.equal(notices.status,200);
  assert.ok((await notices.json()).some(row=>row.tipo==='BANCO_RESERVA_ATIVADO'));
  const document=await request(`/api/contratos/${contractId}/documento`);assert.equal(document.status,200);
  const pdf=await document.json();assert.ok(pdf.contrato_assinado_url || pdf.contrato_gerado_url || pdf.arquivo_pdf);
  assert.equal((await request('/api/clientes',true,'POST')).status,503);
  assert.equal((await request('/api/faturas/gerar')).status,503);
  return {online:true,authenticated:true,tenantScoped:true,quotaStatus:true,noticeHistory:true,contractPdf:true,mutationsBlocked:true};
}
