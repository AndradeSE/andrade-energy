import assert from 'node:assert/strict';
import test from 'node:test';
import { escolherAnexoFatura, anexoImagemFatura } from './anexoFaturaPolicy';
test('fotos anexadas são aceitas; logos inline são ignorados e PDF original tem preferência',()=>{
 const logo={filename:'logo.png',content_type:'image/png',content_disposition:'inline',content_id:'logo'};
 const foto={filename:'IMG_1234.jpg',content_type:'image/jpeg',content_disposition:'attachment'};
 const pdf={filename:'conta.pdf',content_type:'application/pdf'};
 assert.equal(escolherAnexoFatura([logo,foto]),foto);
 assert.equal(escolherAnexoFatura([foto,pdf]),pdf);
 assert.equal(escolherAnexoFatura([logo]),undefined);
 assert.equal(anexoImagemFatura({filename:'foto.svg',content_type:'image/svg+xml'}),false);
});
