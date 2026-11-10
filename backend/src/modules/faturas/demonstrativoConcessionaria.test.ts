import { test } from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { gerarDemonstrativoConcessionaria, deveGerarDemonstrativoConcessionaria } from "./demonstrativoConcessionaria";

async function exemplo(comPagamento = true) {
 return new Promise<Buffer>(resolve => {
  const doc = new PDFDocument({ size: "A4", margin: 0 }); const chunks: Buffer[]=[];
  doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));
  doc.fontSize(20).text('CEMIG',30,30);doc.fontSize(12).text('UC 1131082701880 - OUT/2026',30,110);
  doc.text('Consumo 214 kWh - Energia R$ 225,47',30,170);
  doc.rect(200,80,50,50).fill('#000000');
  if(comPagamento){doc.fillColor('#000000').fontSize(11).text('Código de Débito Automático',100,740);doc.text('836100000030 608001380022 328405037339 080934003262',100,770);
   for(let x=30;x<550;x+=4)doc.rect(x,795,2,25).fill('#000000');
   doc.rect(30,745,45,45).fill('#000000');}
  doc.end();
 });
}

test("somente consumidor unificado recebe cópia sem pagamento", () => {
 const f={pdf_cemig_url:'privado.pdf',fatura_somente_andrade:false};
 assert.equal(deveGerarDemonstrativoConcessionaria(f,false),false);
 assert.equal(deveGerarDemonstrativoConcessionaria(f,true),true);
 assert.equal(deveGerarDemonstrativoConcessionaria({...f,fatura_somente_andrade:null},true),true);
 assert.equal(deveGerarDemonstrativoConcessionaria({...f,fatura_somente_andrade:true},true),false);
});
test("conserva aparência original e remove permanentemente a faixa de pagamento", async () => {
 const original=await exemplo();const antes=Buffer.from(original); const copia=await gerarDemonstrativoConcessionaria({},original);
 assert.deepEqual(original,antes);
 const library=await PDFiumLibrary.init();const a=await library.loadDocument(original),b=await library.loadDocument(copia);
 try {
  assert.equal(b.getPageCount(),a.getPageCount());
  const pageA=a.getPage(0),pageB=b.getPage(0);
  const texto=pageB.getText();assert.match(texto,/NÃO PAGAR/);assert.doesNotMatch(texto,/836100000030/);
  const rawA=await pageA.render({scale:2,render:async o=>o.data}),rawB=await pageB.render({scale:2,render:async o=>o.data});
  // Original invoice image is simply shifted 48 points below the added notice.
  const offset=96*rawB.width*4;
  const limite=rawA.width*4*1300;
  let diferenca=0;
  for(let i=0;i<limite;i++)diferenca+=Math.abs(rawA.data[i]-rawB.data[offset+i]);
  assert.ok(diferenca/limite<12,'a região com os dados originais permanece visualmente igual');
  const footer=rawB.data.slice(offset+rawB.width*4*1480);
  assert.ok(footer.every(v=>v===255),'QR and barcode pixels are really gone, not covered by PDF overlays');
 } finally {a.destroy();b.destroy();library.destroy();}
});
test("não inventa um novo documento se a área de pagamento não for identificada", async () => {
 await assert.rejects(gerarDemonstrativoConcessionaria({},await exemplo(false)),/não localizada/);
});
