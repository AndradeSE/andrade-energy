import test from "node:test";
import assert from "node:assert/strict";
import { orderHomeTab } from "./home-tab-order";
test("Home centralizada com abas ímpares e primeira à esquerda com abas pares", () => {
  for (let count = 1; count <= 7; count++) {
    const tabs = ["Home", ...Array.from({ length: count - 1 }, (_, index) => `aba-${index}`)];
    const original = [...tabs];
    const arranged = orderHomeTab(tabs, item => item === "Home");
    assert.equal(arranged.indexOf("Home"), count % 2 ? Math.floor(count / 2) : 0);
    assert.deepEqual(arranged.filter(item => item !== "Home"), original.filter(item => item !== "Home"));
    assert.deepEqual(tabs, original);
  }
  assert.deepEqual(orderHomeTab(["Perfil"], item => item === "Home"), ["Perfil"]);
});
