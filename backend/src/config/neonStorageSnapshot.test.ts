import assert from "node:assert/strict";
import test from "node:test";
import { mirrorSnapshotObjects, type SourceObject, type SnapshotObjectSource, type SnapshotObjectStore } from "./neonStorageSnapshot";
import { neonStorageConnection } from "./neonStorageRuntime";

const object: SourceObject = { bucket: "faturas", path: "empresa/fatura.pdf", id: "id", version: "v1",
  size: 4, content_type: "application/pdf" };

function fixture() {
  const blobs = new Map<string, Uint8Array>();
  let downloads = 0;
  const source: SnapshotObjectSource = {
    info: async () => ({ id: "id", version: "v1", size: 4 }),
    download: async () => { downloads++; return Buffer.from("%PDF"); },
  };
  const store: SnapshotObjectStore = {
    exists: async key => blobs.has(key),
    put: async (key, bytes) => { blobs.set(key, Uint8Array.from(bytes)); },
    get: async key => blobs.get(key)!,
  };
  return { source, store, downloads: () => downloads };
}

test("cópia verifica o conteúdo e reutiliza somente a mesma versão", async () => {
  const f = fixture();
  const manifest = await mirrorSnapshotObjects([object], [], f.source, f.store);
  assert.match(manifest[0].key, /^sha256\/[a-f0-9]{64}$/);
  const reused = await mirrorSnapshotObjects([object], manifest, f.source, f.store);
  assert.deepEqual(reused, manifest);
  assert.equal(f.downloads(), 1);
  await assert.rejects(mirrorSnapshotObjects([{ ...object, version: "v2" }], manifest, f.source, f.store));
});

test("arquivo alterado durante o download impede a publicação", async () => {
  const f = fixture();
  let calls = 0;
  f.source.info = async () => ({ id: "id", version: ++calls === 1 ? "v1" : "v2", size: 4 });
  await assert.rejects(mirrorSnapshotObjects([object], [], f.source, f.store));
});

test("conteúdo corrompido no destino é recusado mesmo com tamanho igual", async () => {
  const f = fixture();
  f.store.get = async () => Buffer.from("erro");
  await assert.rejects(mirrorSnapshotObjects([object], [], f.source, f.store));
});

test("manifesto duplicado ou bucket inesperado é recusado", async () => {
  const f = fixture();
  await assert.rejects(mirrorSnapshotObjects([object, object], [], f.source, f.store));
  await assert.rejects(mirrorSnapshotObjects([{ ...object, bucket: "outro" }], [], f.source, f.store));
});

test("credenciais só podem ser usadas no endpoint do Neon Production", () => {
  const env = { NEON_STORAGE_ENDPOINT: "https://br-dark-cloud-beb7z4du.storage.c-9.us-east-2.aws.neon.tech",
    NEON_STORAGE_ACCESS_KEY_ID: "test", NEON_STORAGE_SECRET_ACCESS_KEY: "test" };
  assert.equal(neonStorageConnection(env).forcePathStyle, true);
  assert.throws(() => neonStorageConnection({ ...env, NEON_STORAGE_ENDPOINT: "https://invalid.example" }));
  assert.throws(() => neonStorageConnection({ ...env, NEON_STORAGE_ENDPOINT: `${env.NEON_STORAGE_ENDPOINT}?secret=test` }));
});
