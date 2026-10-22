import assert from "node:assert/strict";
import test from "node:test";
import { proporRateioMensal, csvRateioMensal } from "./rateioMensal.policy";

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
