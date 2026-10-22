import assert from "node:assert/strict";
import test from "node:test";
import { proporRateioMensal, csvRateioMensal, csvCemigRateio } from "./rateioMensal.policy";

test("demanda exata sem 15%, resto somente para âncora e soma 100%", () => {
  const p = proporRateioMensal(10000, [{ numero: "123456789", consumo_medio_kwh: 1000 }], "987654321");
  assert.equal(p.linhas[0].percentual, 10);
  assert.equal(p.linhas[1].percentual, 90);
  assert.equal(p.linhas[0].energiaPrevista, 1000);
  assert.equal(p.rascunho, false);
  assert.equal(proporRateioMensal(20000, [{numero:"123456789",consumo_medio_kwh:1000}]).linhas[0].percentual, 5);
});
test("âncora opcional permanece só na planilha e identifica rascunho", () => {
  const p = proporRateioMensal(3000, [{ numero:"123456789", nome:"=HYPERLINK(1)", consumo_medio_kwh: 1000 }]);
  assert.equal(p.rascunho, true);
  assert.equal(p.linhas[1].uc, "UC âncora — a definir");
  assert.equal(p.linhas.reduce((s,l) => s + Math.round(l.percentual * 10000),0),1000000);
  assert.match(csvRateioMensal(p,"2026-10","456789123"), /RASCUNHO/);
  assert.match(csvRateioMensal(p,"2026-10","456789123"), /'=HYPERLINK/);
});
test("bloqueia excesso, média ausente, UC repetida e âncora duplicada", () => {
  const u = [{numero:"123456789",consumo_medio_kwh:1000}];
  assert.throws(()=>proporRateioMensal(500,u), /supera/);
  assert.throws(()=>proporRateioMensal(0,u), /produção/);
  assert.throws(()=>proporRateioMensal(3000,[...u,...u]), /duplicada/);
  assert.throws(()=>proporRateioMensal(3000,u,"123456789"), /já está/);
  assert.throws(()=>proporRateioMensal(3000,[{...u[0],consumo_medio_kwh:0}]), /consumo médio/);
});

test("CSV Cemig usa somente as quatro colunas do guia, sem cabeçalho/BOM/% e preserva zeros",()=>{
  const p=proporRateioMensal(10000,[{numero:"001234567890",documento:"01234567890",consumo_medio_kwh:2005}],"009876543210");
  const csv=csvCemigRateio(p,"456789123","529.982.247-25",true);
  assert.equal(csv,"001234567890;01234567890;20,05;\r\n009876543210;52998224725;79,95;X");
  for(const linha of csv.split("\r\n"))assert.equal(linha.split(";").length,4);
  assert.doesNotMatch(csv,/[\uFEFF%"\n]{2}/);
  assert.throws(()=>csvCemigRateio(p,"456789123","",true),/CPF\/CNPJ/);
  assert.throws(()=>csvCemigRateio(p,"456789123","52998224725",false),/números atuais/);
});
test("não produz arquivo Cemig com âncora provisória nem cota zero de beneficiária",()=>{
  const u=[{numero:"123456789",documento:"52998224725",consumo_medio_kwh:1000}];
  assert.throws(()=>csvCemigRateio(proporRateioMensal(10000,u),"456789123","52998224725",true),/Defina o número/);
  const p=proporRateioMensal(1000,u,"987654321");
  assert.throws(()=>csvCemigRateio(p,"456789123","52998224725",true),/cota zero/);
  assert.match(csvCemigRateio(p,"987654321","52998224725",true),/0;X$/);
});
