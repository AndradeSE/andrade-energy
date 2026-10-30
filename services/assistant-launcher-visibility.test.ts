import test from "node:test";
import assert from "node:assert/strict";
import { assistantLauncherAvailable } from "./assistant-launcher-visibility";

test("Solar aparece no Comercial sem usina e na usina selecionada", () => {
  assert.equal(assistantLauncherAvailable("/admin/comercial", true), true);
  assert.equal(assistantLauncherAvailable("/geradores/gestao", true), true);
  assert.equal(assistantLauncherAvailable("/", true, "usina"), true);
  assert.equal(assistantLauncherAvailable("/", true), false);
});
test("Solar não aparece nos seletores mesmo com contexto anterior", () => {
  for (const route of ["/selecionar-unidade", "/selecionar-gerador", "/admin/escolher-area", "/admin/empresas"])
    assert.equal(assistantLauncherAvailable(route, true, "anterior"), false);
  assert.equal(assistantLauncherAvailable("/", false), false);
  assert.equal(assistantLauncherAvailable("/", false, undefined, "uc"), true);
});
