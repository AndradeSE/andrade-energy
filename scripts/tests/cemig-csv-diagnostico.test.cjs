const test=require('node:test');
const assert=require('node:assert/strict');
const {copiaCsvDiagnostico}=require('../../services/cemig-csv-diagnostico.cjs');
const csv='1204584501840;52998224725;4,7568;\r\n99999101128;52998224725;0,6234;\r\n3006605532;52998224725;94,6198;X';
test('cópia conserva original e total e transfere somente cota autorizada',()=>{
 const before=csv;const copy=copiaCsvDiagnostico(csv,'99999101128','3006605532');
 assert.equal(csv,before);assert.equal(copy.csv,'1204584501840;52998224725;4,7568;\r\n3006605532;52998224725;95,2432;X');assert.equal(copy.linhas,2);assert.equal(copy.transferido,0.6234);
});
test('bloqueia UC ausente, âncora divergente, duplicatas e totais diferentes',()=>{
 for(const value of [csv.replace('99999101128','11111111111'),csv.replace(';X',';'),csv.replace('4,7568','4,7567'),csv+'\r\n1204584501840;52998224725;0;'])assert.throws(()=>copiaCsvDiagnostico(value,'99999101128','3006605532'));
 assert.throws(()=>copiaCsvDiagnostico(csv,'3006605532','3006605532'));
});
test('transferência que chega a 100 preserva representação válida',()=>{
 assert.equal(copiaCsvDiagnostico('99999101128;52998224725;1;\r\n3006605532;52998224725;99;X','99999101128','3006605532').csv,'3006605532;52998224725;100;X');
});
