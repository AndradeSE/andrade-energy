import { strict as assert } from "node:assert";
import { test } from "node:test";
import { plantSelectionExists } from "./plant-selection";

test("empty account rejects a saved selection", () => assert.equal(plantSelectionExists([], "old"), false));
test("another account's plant is rejected", () => assert.equal(plantSelectionExists([{ id: "current" }], "old"), false));
test("no selection requires the list even if plants exist", () => assert.equal(plantSelectionExists([{ id: "current" }]), false));
test("existing selection is accepted", () => assert.equal(plantSelectionExists([{ id: "current" }], "current"), true));
