import test from "node:test";
import assert from "node:assert/strict";
import { acessoPorUnidade, contratoCorrespondeAoNumeroUc, contratoLiberaUnidade } from "./acessoContrato.policy";

const contrato = { id: "c1", cliente_id: "cliente", unidade_consumidora_id: "uc1", status: "ATIVO" };
test("rascunho e status VIGENTE sem assinatura não liberam", () => {
  assert.equal(contratoLiberaUnidade(contrato), false);
  assert.equal(contratoLiberaUnidade({ ...contrato, status: "VIGENTE" }), false);
});
test("upload externo só libera depois de conferência", () => {
  const externo = { ...contrato, contrato_assinado_url: "assinado.pdf" };
  assert.equal(contratoLiberaUnidade(externo), false);
  assert.equal(contratoLiberaUnidade({ ...externo, dados_documento: { assinatura_externa_validada_em: "2026-09-07" } }), true);
});
test("PDF vigente libera a UC sem depender da data da assinatura", () => {
  assert.equal(contratoLiberaUnidade({ ...contrato, status: "VIGENTE", contrato_assinado_url: "antigo.pdf", assinado_em: "2026-09-06T20:00:00.000Z" }), true);
  assert.equal(contratoLiberaUnidade({ ...contrato, status: "VIGENTE", contrato_assinado_url: "novo.pdf", assinado_em: "2026-09-07T20:00:00.000Z" }), true);
  assert.equal(contratoLiberaUnidade({ ...contrato, status: "VIGENTE", contrato_assinado_url: "pendente.pdf", dados_documento: { assinatura_externa_pendente: true } }), false);
});
test("aceite não libera contrato cancelado, vencido ou sem vínculo de UC", () => {
  const assinado = { ...contrato, aceite_cliente_em: "2026-09-07" };
  assert.equal(contratoLiberaUnidade(assinado), true);
  for (const status of ["CANCELADO", "VENCIDO"]) assert.equal(contratoLiberaUnidade({ ...assinado, status }), false);
  assert.equal(contratoLiberaUnidade({ ...assinado, unidade_consumidora_id: null }), false);
  assert.equal(contratoLiberaUnidade({ ...assinado, vigencia_fim: "2026-09-06" }, "2026-09-07"), false);
});
test("nova UC pendente não bloqueia UC assinada nem herda assinatura alheia", () => {
  const resultado = acessoPorUnidade([{ id: "uc1", cliente_id: "cliente" }, { id: "uc2", cliente_id: "cliente" }], [
    { ...contrato, aceite_cliente_em: "2026-09-07" },
    { ...contrato, id: "c2", unidade_consumidora_id: "uc2", cliente_id: "outro", aceite_cliente_em: "2026-09-07" },
  ]);
  assert.deepEqual(resultado.map(uc => uc.liberado), [true, false]);
});
test("rascunho de revisão preserva acesso da versão assinada ainda vigente", () => {
  const resultado = acessoPorUnidade([{ id: "uc1", cliente_id: "cliente" }], [contrato,
    { ...contrato, id: "anterior", status: "SUBSTITUIDO", aceite_cliente_em: "2026-09-07" },
  ]);
  assert.equal(resultado[0].liberado, true);
});
test("restauração exige o mesmo número de UC", () => {
  assert.equal(contratoCorrespondeAoNumeroUc({ numero: "AE-1204584501840-2026" }, "1204584501840"), true);
  assert.equal(contratoCorrespondeAoNumeroUc({ numero: "AE-1204584501840-2026" }, "595935101808"), false);
  assert.equal(contratoCorrespondeAoNumeroUc({ numero: "AE-2026", dados_documento: { numero_uc: "1204584501840" } }, "1204584501840"), true);
});
