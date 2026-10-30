import test from 'node:test';
import assert from 'node:assert/strict';
import {utils,write} from 'xlsx';
import {lerTributosCemig} from './tributosCemig.service';
function arquivo(pis:unknown=.01,cofins:unknown=.04){
 const w=utils.book_new();
 for(const nome of ['Ago26','Set26'])utils.book_append_sheet(w,utils.aoa_to_sheet([['Índice','Percent.'],['PASEP',pis],['COFINS',cofins],['SEM ICMS',1/.95],['PASEP/COFINS + ICMS  TOTAL',1/.95/.82]]),nome);
 return write(w,{type:'buffer',bookType:'xls'});
}
test('lê percentuais e referência das abas sem presumir que sejam do mês atual',()=>{
 const r=lerTributosCemig(arquivo());assert.equal(r[0].referencia,'2026-09');assert.equal(r[1].referencia,'2026-08');assert.equal(r[0].pis,1);assert.equal(r[0].cofins,4);assert.equal(r[0].icmsPadrao,18);
});
test('aceita zero explícito e rejeita ausência, texto e taxas inválidas',()=>{
 assert.equal(lerTributosCemig(arquivo(0,0))[0].pis,0);
 for(const v of [null,'1%',-.1,1])assert.throws(()=>lerTributosCemig(arquivo(v)));
});
test('limita tamanho de entrada',()=>assert.throws(()=>lerTributosCemig(Buffer.alloc(5_000_001))));
