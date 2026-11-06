import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "pg";
import { restoreReserveSnapshot, snapshotFingerprint, validateReserveSnapshot, type ReserveSnapshot } from "./neonSnapshot";
import { neonPreviewConnection } from "./neonSnapshotRuntime";

test("o sincronizador rejeita origem e destino fora do Preview", () => {
  assert.throws(() => neonPreviewConnection({ SUPABASE_URL: "https://ehnkyrsseisvvtbkwrvu.supabase.co" }));
  const env = { SUPABASE_URL: "https://qqhcjieymypowunkixmk.supabase.co",
    NEON_DATABASE_URL: "postgres://user:password@ep-misty-star-beg2irkr.c-9.us-east-2.aws.neon.tech/andrade_preview_restore_test?sslmode=disable" };
  assert.equal(neonPreviewConnection(env).ssl.rejectUnauthorized, true);
  assert.throws(() => neonPreviewConnection({ ...env, NEON_DATABASE_URL: env.NEON_DATABASE_URL.replace("neon.tech", "invalid.example") }));
  assert.throws(() => neonPreviewConnection({ ...env, NEON_DATABASE_URL: env.NEON_DATABASE_URL.replace("andrade_preview_restore_test", "neondb") }));
});

test("o fingerprint independe da ordem das chaves JSON", () => {
  const catalog = { tables: [], routines: [] };
  assert.equal(snapshotFingerprint(catalog), snapshotFingerprint({ routines: [], tables: [] }));
  assert.equal(snapshotFingerprint({ tables: [], routines: ["a()", "a_b()"] }),
    snapshotFingerprint({ tables: [], routines: ["a_b()", "a()"] }));
});

test("restauração transacional preserva vínculos, triggers, sequências e o snapshot anterior", {
  skip: !process.env.NEON_TEST_DATABASE_URL,
}, async t => {
  const url = new URL(process.env.NEON_TEST_DATABASE_URL!);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/andrade_neon_snapshot_test");
  const client = new Client({ connectionString: url.href });
  await client.connect();
  try {
    await client.query(`DO $$DECLARE r text; BEGIN
      FOREACH r IN ARRAY ARRAY['anon','anonymous','authenticated','service_role'] LOOP
        IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname=r) THEN EXECUTE format('CREATE ROLE %I',r); END IF;
      END LOOP; END$$;
      CREATE SCHEMA reserve_auth; CREATE TABLE reserve_auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.usuarios(id int PRIMARY KEY,auth_user_id uuid REFERENCES reserve_auth.users(id));
      CREATE TABLE public.parent(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, child_id int);
      CREATE TABLE public.child(id int PRIMARY KEY,parent_id bigint REFERENCES public.parent(id));
      ALTER TABLE public.parent ADD FOREIGN KEY(child_id) REFERENCES public.child(id);
      CREATE TABLE public.events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
      CREATE TABLE public.amounts(id bigint PRIMARY KEY,price numeric);
      CREATE FUNCTION public.track_insert() RETURNS trigger LANGUAGE plpgsql AS
      $$BEGIN INSERT INTO public.events DEFAULT VALUES; RETURN NEW; END$$;
      CREATE TRIGGER track_insert AFTER INSERT ON public.parent FOR EACH ROW EXECUTE FUNCTION public.track_insert();
      ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.parent ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.child ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.amounts ENABLE ROW LEVEL SECURITY;
      INSERT INTO public.amounts VALUES(9007199254740993,0.1234567890123456789);
      INSERT INTO public.usuarios VALUES(1,NULL);
      INSERT INTO public.parent DEFAULT VALUES;
      INSERT INTO public.child VALUES(1,1);
      UPDATE public.parent SET child_id=1;
    `);
    const root = path.resolve(__dirname, "../../..");
    await client.query(await readFile(path.join(root, "supabase/migrations/20261105234323_snapshot_reserva_neon_preview.sql"), "utf8"));
    // The setup script intentionally accepts only named Neon Preview databases.
    const setup = await readFile(path.join(root, "scripts/initialize-neon-preview-reserve.sql"), "utf8");
    await client.query(setup.replace("^andrade_preview_restore_[a-z0-9_]+$", "^andrade_neon_snapshot_test$"));
    const { rows: [{ snapshot }] } = await client.query("SELECT public.exportar_snapshot_reserva_preview() AS snapshot");
    const fresh = (): ReserveSnapshot => ({ ...structuredClone(snapshot), captured_at: new Date().toISOString() });

    await t.test("copia relações circulares sem disparar o trigger de negócio", async () => {
      const result = await restoreReserveSnapshot(client, async () => fresh());
      assert.equal(result.skipped, false);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM public.events")).rows[0].n, 1);
      assert.equal((await client.query("SELECT p.id FROM public.parent p JOIN public.child c ON p.child_id=c.id AND c.parent_id=p.id")).rowCount, 1);
      assert.equal((await client.query("SELECT nextval('public.parent_id_seq')::int AS n")).rows[0].n, 2);
      assert.deepEqual((await client.query("SELECT id::text,price::text FROM public.amounts")).rows[0],
        { id: "9007199254740993", price: "0.1234567890123456789" });
    });
    await t.test("vínculo inválido reverte todos os registros e o marcador", async () => {
      const state = (await client.query("SELECT * FROM reserve_control.snapshot_state")).rows[0];
      const invalid = fresh();
      invalid.tables.find(table => table.name === "child")!.rows[0] = '{"id":1,"parent_id":999}';
      await assert.rejects(restoreReserveSnapshot(client, async () => invalid));
      assert.equal((await client.query("SELECT parent_id::int AS id FROM public.child")).rows[0].id, 1);
      assert.deepEqual((await client.query("SELECT * FROM reserve_control.snapshot_state")).rows[0], state);
      assert.equal((await client.query("SELECT tgenabled FROM pg_trigger WHERE tgname='track_insert'")).rows[0].tgenabled, "O");
    });
    await t.test("reserva ativa impede até a consulta da origem", async () => {
      await client.query("UPDATE reserve_control.snapshot_state SET mode='active'");
      let loaded = false;
      await assert.rejects(restoreReserveSnapshot(client, async () => { loaded = true; return fresh(); }));
      assert.equal(loaded, false);
      await client.query("UPDATE reserve_control.snapshot_state SET mode='standby'");
    });
    await t.test("schema divergente e snapshot vencido são recusados", async () => {
      const invalid = fresh();
      invalid.catalog.routines.push("schema-divergente");
      await assert.rejects(restoreReserveSnapshot(client, async () => invalid));
      const old = fresh();
      old.captured_at = "2020-01-01T00:00:00Z";
      assert.throws(() => validateReserveSnapshot(old));
      const duplicate = fresh();
      duplicate.tables[0] = duplicate.tables[1];
      assert.throws(() => validateReserveSnapshot(duplicate));
    });
  } finally { await client.end(); }
});
