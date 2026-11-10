import { createHash } from "node:crypto";

export type SourceObject = { bucket: string; path: string; id: string; version: string; size: number; content_type: string };
export type MirroredObject = SourceObject & { key: string; sha256: string };
export type SnapshotObjectSource = {
  info: (object: SourceObject) => Promise<{ id: string; version: string; size: number }>;
  download: (object: SourceObject) => Promise<Uint8Array>;
};
export type SnapshotObjectStore = {
  exists: (key: string, size: number, hash: string) => Promise<boolean>;
  put: (key: string, data: Uint8Array, hash: string, contentType: string) => Promise<void>;
  get: (key: string) => Promise<Uint8Array>;
};

const buckets = new Set(["faturas", "contratos", "contingency-uploads", "usinas"]);
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function mirrorSnapshotObjects(objects: SourceObject[], previous: MirroredObject[],
  source: SnapshotObjectSource, store: SnapshotObjectStore) {
  const manifest: MirroredObject[] = [];
  const paths = new Set<string>();
  for (const object of objects) {
    const path = JSON.stringify([object.bucket, object.path]);
    if (!buckets.has(object.bucket) || !object.path || !object.id || !object.version || paths.has(path) ||
        !Number.isSafeInteger(object.size) || object.size < 0 || object.size > 32 * 1024 * 1024) {
      throw new Error("Manifesto de arquivos inválido");
    }
    paths.add(path);
    const cached = previous.find(entry => entry.bucket === object.bucket && entry.path === object.path &&
      entry.id === object.id && entry.version === object.version && entry.size === object.size);
    if (cached && /^[a-f0-9]{64}$/.test(cached.sha256) && cached.key === `sha256/${cached.sha256}` &&
        await store.exists(cached.key, object.size, cached.sha256)) {
      manifest.push({ ...object, key: cached.key, sha256: cached.sha256 });
      continue;
    }
    const matches = (info: { id: string; version: string; size: number }) =>
      info.id === object.id && info.version === object.version && info.size === object.size;
    if (!matches(await source.info(object))) throw new Error("Arquivo mudou após o snapshot");
    const bytes = await source.download(object);
    if (bytes.length !== object.size || !matches(await source.info(object))) {
      throw new Error("Arquivo mudou durante a cópia");
    }
    const sha256 = digest(bytes);
    const key = `sha256/${sha256}`;
    await store.put(key, bytes, sha256, object.content_type || "application/octet-stream");
    const restored = await store.get(key);
    if (restored.length !== object.size || digest(restored) !== sha256) throw new Error("Arquivo do reserva não confere");
    manifest.push({ ...object, key, sha256 });
  }
  return manifest;
}
