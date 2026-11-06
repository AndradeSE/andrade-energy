import { createHash } from "node:crypto";
import type { Client } from "pg";

export const previewSupabaseUrl = "https://qqhcjieymypowunkixmk.supabase.co";

export const snapshotCatalogSql = `SELECT jsonb_build_object(
  'tables', (SELECT jsonb_agg(jsonb_build_object(
    'name', c.relname, 'rls', c.relrowsecurity, 'kind', c.relkind,
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
      'generated', a.attgenerated, 'identity', a.attidentity,
      'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin,d.adrelid)
    ) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d
      ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', con.conname, 'definition', replace(pg_get_constraintdef(con.oid),
        'reserve_auth.users','auth.users')) ORDER BY con.conname),'[]'::jsonb)
      FROM pg_constraint con WHERE con.conrelid=c.oid AND con.contype<>'n'),
    'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid)
    ) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t
      WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
  ) ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace
      AND c.relkind IN ('r','p')),
  'routines', (SELECT coalesce(jsonb_agg(pg_get_functiondef(p.oid)
    ORDER BY p.oid::regprocedure::text),'[]'::jsonb)
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
      AND p.prokind IN ('f','p') AND p.proname<>'exportar_snapshot_reserva_preview')
) AS catalog`;

type Column = { name: string; generated: string; identity: string };
type Table = {
  name: string;
  rls: boolean;
  kind: string;
  columns: Column[];
  constraints: { name: string; definition: string }[];
  triggers: { name: string; enabled: "O" | "D" | "R" | "A"; definition: string }[];
};
export type ReserveSnapshot = {
  source: string;
  captured_at: string;
  catalog: { tables: Table[]; routines: string[] };
  // Keep each JSON record as text so JS never rounds bigint or numeric values.
  tables: { name: string; rows: string[] }[];
  sequences: { name: string; next_value: string }[];
};

function identifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function snapshotFingerprint(catalog: ReserveSnapshot["catalog"]) {
  // Database collations may order signatures differently, especially '(' vs '_'.
  // Only column order is significant; routines, constraints and triggers are sets.
  const byName = <T extends { name: string }>(items: T[]) => [...items].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const normalized = {
    ...catalog,
    tables: byName(catalog.tables).map(table => ({ ...table,
      constraints: byName(table.constraints), triggers: byName(table.triggers),
    })),
    routines: [...catalog.routines].sort(),
  };
  return createHash("sha256").update(canonical(normalized)).digest("hex");
}

export function validateReserveSnapshot(snapshot: ReserveSnapshot, now = Date.now()) {
  if (snapshot.source !== "qqhcjieymypowunkixmk") throw new Error("Origem do snapshot inválida");
  const age = now - Date.parse(snapshot.captured_at);
  if (!Number.isFinite(age) || age < -60_000 || age > 10 * 60_000) throw new Error("Snapshot vencido");
  const names = new Set(snapshot.catalog.tables.map(table => table.name));
  if (names.size === 0 || names.size !== snapshot.catalog.tables.length ||
      snapshot.tables.length !== names.size || new Set(snapshot.tables.map(table => table.name)).size !== names.size) {
    throw new Error("Lista de tabelas incompleta");
  }
  for (const table of snapshot.catalog.tables) {
    if (!table.rls || table.kind !== "r" || table.columns.length === 0) throw new Error("Estrutura não suportada ou sem RLS");
  }
  for (const table of snapshot.tables) {
    if (!names.has(table.name) || !Array.isArray(table.rows) || table.rows.some(row => typeof row !== "string")) {
      throw new Error("Dados de tabela inválidos");
    }
  }
  if (snapshot.tables.find(table => table.name === "usuarios")?.rows.some(row => JSON.parse(row).auth_user_id != null)) {
    throw new Error("Snapshot depende do Supabase Auth");
  }
  for (const sequence of snapshot.sequences) {
    if (!/^-?\d+$/.test(sequence.next_value)) throw new Error("Sequência inválida");
  }
}

/** The caller owns the connection. Every change, including constraints, commits together. */
export async function restoreReserveSnapshot(client: Client, load: () => Promise<ReserveSnapshot>) {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL search_path=pg_catalog");
    const { rows: [lock] } = await client.query("SELECT pg_try_advisory_xact_lock(7071190) AS acquired");
    if (!lock.acquired) { await client.query("ROLLBACK"); return { skipped: true }; }
    const { rows: [state] } = await client.query(
      "SELECT mode,captured_at FROM reserve_control.snapshot_state WHERE id=1 FOR UPDATE",
    );
    if (state?.mode !== "standby") throw new Error("Reserva não está em modo standby");
    const snapshot = await load();
    validateReserveSnapshot(snapshot);
    if (state.captured_at && Date.parse(snapshot.captured_at) <= new Date(state.captured_at).getTime()) {
      throw new Error("Snapshot anterior ao já publicado");
    }
    const { rows: [{ catalog }] } = await client.query(snapshotCatalogSql);
    const fingerprint = snapshotFingerprint(snapshot.catalog);
    if (snapshotFingerprint({ ...catalog, routines: [] }) !==
        snapshotFingerprint({ ...snapshot.catalog, routines: [] })) {
      throw new Error("Estrutura do reserva desatualizada");
    }
    // Copy trusted database routines through the protocol to preserve their exact text,
    // including line endings that Windows SQL-file imports may otherwise translate.
    for (const routine of snapshot.catalog.routines) await client.query(routine);
    await client.query("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anonymous,authenticated");
    const { rows: [{ catalog: restoredCatalog }] } = await client.query(snapshotCatalogSql);
    if (snapshotFingerprint(restoredCatalog) !== fingerprint) throw new Error("Rotinas do reserva divergentes");
    for (const table of snapshot.catalog.tables) {
      const name = `public.${identifier(table.name)}`;
      for (const trigger of table.triggers) {
        await client.query(`ALTER TABLE ${name} DISABLE TRIGGER ${identifier(trigger.name)}`);
      }
      for (const constraint of table.constraints.filter(item => item.definition.startsWith("FOREIGN KEY"))) {
        await client.query(`ALTER TABLE ${name} DROP CONSTRAINT ${identifier(constraint.name)}`);
      }
    }
    const tables = snapshot.catalog.tables.map(table => `public.${identifier(table.name)}`);
    await client.query(`TRUNCATE ${tables.join(",")}`);
    let rowCount = 0;
    for (const table of snapshot.catalog.tables) {
      const rows = snapshot.tables.find(data => data.name === table.name)!.rows;
      const columns = table.columns.filter(column => !column.generated).map(column => identifier(column.name));
      const name = `public.${identifier(table.name)}`;
      for (let offset = 0; offset < rows.length; offset += 200) {
        await client.query(`INSERT INTO ${name} (${columns.join(",")}) OVERRIDING SYSTEM VALUE
          SELECT ${columns.join(",")} FROM jsonb_populate_recordset(NULL::${name}, $1::jsonb)`,
        [`[${rows.slice(offset, offset + 200).join(",")}]`]);
      }
      const { rows: [count] } = await client.query(`SELECT count(*)::text AS total FROM ${name}`);
      if (BigInt(count.total) !== BigInt(rows.length)) throw new Error("Contagem restaurada divergente");
      rowCount += rows.length;
    }
    for (const table of snapshot.catalog.tables) {
      const name = `public.${identifier(table.name)}`;
      for (const constraint of table.constraints.filter(item => item.definition.startsWith("FOREIGN KEY"))) {
        const definition = constraint.definition.replace("REFERENCES auth.users(", "REFERENCES reserve_auth.users(");
        await client.query(`ALTER TABLE ${name} ADD CONSTRAINT ${identifier(constraint.name)} ${definition}`);
      }
      for (const trigger of table.triggers) {
        const mode = { O: "ENABLE", D: "DISABLE", R: "ENABLE REPLICA", A: "ENABLE ALWAYS" }[trigger.enabled];
        if (!mode) throw new Error("Estado de trigger inválido");
        await client.query(`ALTER TABLE ${name} ${mode} TRIGGER ${identifier(trigger.name)}`);
      }
    }
    for (const sequence of snapshot.sequences) {
      await client.query(`ALTER SEQUENCE public.${identifier(sequence.name)} RESTART WITH ${sequence.next_value}`);
    }
    await client.query(`UPDATE reserve_control.snapshot_state SET captured_at=$1,
      completed_at=clock_timestamp(),fingerprint=$2,table_count=$3,row_count=$4 WHERE id=1`,
    [snapshot.captured_at, fingerprint, tables.length, rowCount]);
    await client.query("COMMIT");
    return { skipped: false, tables: tables.length, rows: rowCount, capturedAt: snapshot.captured_at };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
