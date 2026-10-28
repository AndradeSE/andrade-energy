// Diagnostic copy only: never modify stored allocations or the source CSV.
function copiaCsvDiagnostico(csv, ucRemover, ucAncora, ucAncoraAtual=ucAncora) {
  if (!/^\d+$/.test(ucRemover) || !/^\d+$/.test(ucAncora) || ucRemover === ucAncora) throw Error('UCs da cópia inválidas.');
  const rows = csv.split(/\r?\n/).map(line => line.split(';'));
  function units(value) {
    if (!/^\d{1,3}(?:,\d{1,4})?$/.test(value)) throw Error('Cota fora do padrão.');
    const [a,b=''] = value.split(',');
    return Number(a)*10000+Number(b.padEnd(4,'0'));
  }
  if(rows.some(r=>r.length!==4||!/^\d+$/.test(r[0])||!/^\d{11}(?:\d{3})?$/.test(r[1])))throw Error('CSV fora do padrão.');
  const removed=rows.filter(r=>r[0]===ucRemover);
  const anchor=rows.filter(r=>r[0]===ucAncora&&r[3]==='X');
  if(removed.length!==1||anchor.length!==1||rows.filter(r=>r[3]==='X').length!==1||removed[0][3])throw Error('Confira a UC excluída e a âncora da cópia.');
  if(new Set(rows.map(r=>r[0])).size!==rows.length)throw Error('UC duplicada.');
  if(!/^\d+$/.test(ucAncoraAtual)||rows.some(r=>r!==anchor[0]&&r[0]===ucAncoraAtual))throw Error('UC atual da âncora inválida ou duplicada.');
  const before=rows.reduce((n,r)=>n+units(r[2]),0);
  if(before!==1000000)throw Error('A cópia exige total original de 100%.');
  const added=units(removed[0][2]), original=units(anchor[0][2]);
  const total=original+added;
  const value=(Math.floor(total/10000)+','+String(total%10000).padStart(4,'0')).replace(/,?0+$/,'');
  const copy=rows.filter(r=>r!==removed[0]).map(r=>r===anchor[0]?[ucAncoraAtual,r[1],value,r[3]]:[...r]);
  if(copy.reduce((n,r)=>n+units(r[2]),0)!==before)throw Error('Total da cópia divergente.');
  return {csv:copy.map(r=>r.join(';')).join('\r\n'),linhas:copy.length,transferido:added/10000,cotaAncora:total/10000};
}
module.exports={copiaCsvDiagnostico};
