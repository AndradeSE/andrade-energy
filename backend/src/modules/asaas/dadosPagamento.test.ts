import assert from "node:assert/strict";
import test from "node:test";

import { dadosPixDaCobranca } from "./asaas.service";

test("preserva o Pix pagável mesmo quando a validade informada é menor que 60 dias", () => {
  const pix = dadosPixDaCobranca({
    payload: "00020101021226890014br.gov.bcb.pix",
    expirationDate: "2026-09-23T23:59:59Z",
  });

  assert.equal(pix.codigo, "00020101021226890014br.gov.bcb.pix");
  assert.equal(pix.expiraEm, "2026-09-23T23:59:59.000Z");
});

test("não inventa um Pix quando o Asaas não retorna payload", () => {
  assert.equal(dadosPixDaCobranca({ expirationDate: "2026-09-23T23:59:59Z" }).codigo, null);
});
