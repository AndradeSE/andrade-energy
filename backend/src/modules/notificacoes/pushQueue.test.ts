import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverQueuedPush } from "./pushQueue";

test("provider failure persists retry status and same owner acknowledges its reservation", async () => {
  let owner: unknown;
  let acknowledged = false;
  const db = { rpc: async (name: string, args: Record<string, unknown>) => {
    if (name === "reservar_push_contingencia") {
      owner = args.p_dono;
      return { data: [{ notificacao_id: "test", notificacao: { id: "test", empresa_id: "isolated" }, contexto: {} }], error: null };
    }
    assert.equal(args.p_dono, owner);
    assert.equal(args.p_sucesso, false);
    acknowledged = true;
    return { data: null, error: null };
  } };
  const result = await deliverQueuedPush(db, async () => { throw new Error("provider offline"); });
  assert.deepEqual(result, { processed: true, success: false });
  assert.equal(acknowledged, true);
});
test("empty queue never sends; claim failure never sends or acknowledges", async () => {
  let sent = 0;
  assert.deepEqual(await deliverQueuedPush({ rpc: async () => ({ data: [], error: null }) }, async () => { sent++; }), { processed: false });
  await assert.rejects(deliverQueuedPush({ rpc: async () => ({ data: null, error: {} }) }, async () => { sent++; }));
  assert.equal(sent, 0);
});
