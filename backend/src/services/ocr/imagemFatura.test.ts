import { test } from "node:test";
import assert from "node:assert/strict";
import { converterImagemFatura, tipoImagemFatura } from "./imagemFatura";

test("não interpreta SVG, executável ou PDF como fotografia", async () => {
  for (const conteudo of ["<svg></svg>", "MZ executable", "%PDF-1.4"]) {
    assert.equal(tipoImagemFatura(Buffer.from(conteudo)), null);
    await assert.rejects(converterImagemFatura(Buffer.from(conteudo)), /JPG ou PNG/);
  }
});

test("rejeita dimensões abusivas antes de iniciar o reconhecimento", async () => {
  const png = Buffer.alloc(32);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
  png.write("IHDR", 12);
  png.writeUInt32BE(100000, 16);
  png.writeUInt32BE(100000, 20);
  await assert.rejects(converterImagemFatura(png), /20 megapixels/);
});
