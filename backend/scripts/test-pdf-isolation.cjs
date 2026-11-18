const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,writeFile,rm}=require('node:fs/promises');
const {createWriteStream}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const PDFDocument=require('pdfkit');
const {extrairTextoPdfIsolado}=require('../dist/services/ocr/ocrIsolado.service');
const {interpretarFatura}=require('../dist/services/ocr/parser.service');
async function fixture(path,password){
  await new Promise((resolve,reject)=>{
    const pdf=new PDFDocument({compress:false,...(password?{userPassword:password}: {})});
    const out=createWriteStream(path);out.on('finish',resolve);out.on('error',reject);pdf.pipe(out);
    pdf.text('SIMULACAO - SEM VALIDADE FISCAL');
    pdf.text('N DA INSTALACAO: 99999101127');pdf.text('NOV/2026 25/11/2026 216,80');
    pdf.text('Energia Elétrica kWh 271 0,800000 216,80 0,800000');pdf.end();
  });
}
for(const password of [undefined,'1234']) test(`isolated reader parses real ${password?'protected':'unprotected'} PDF bytes`,async()=>{
  const dir=await mkdtemp(join(tmpdir(),'andrade-ocr-regression-'));
  try{
    const path=join(dir,'fixture.pdf');await fixture(path,password);
    const data=interpretarFatura(await extrairTextoPdfIsolado(path,password));
    assert.equal(data.uc,'99999101127');assert.equal(data.consumo,271);assert.equal(data.valorTotal,216.8);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('invalid PDF is rejected without returning parser internals',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'andrade-ocr-invalid-'));
  try{const path=join(dir,'invalid.pdf');await writeFile(path,'not a PDF');
    await assert.rejects(extrairTextoPdfIsolado(path),/Não foi possível ler o PDF/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
