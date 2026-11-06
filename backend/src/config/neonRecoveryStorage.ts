import { createHash } from "node:crypto";
import type { MirroredObject } from "./neonStorageSnapshot";

export function recoveryStorage(load: () => Promise<MirroredObject[]>, sign: (key: string) => Promise<string>,
  download: (key: string) => Promise<Uint8Array>) {
  return { from(bucket: string) {
    const object = async (path: string) => {
      if (!["faturas", "contratos", "contingency-uploads"].includes(bucket)) throw new Error("Bucket indisponível na recuperação");
      const entry = (await load()).find(item => item.bucket === bucket && item.path === path);
      if (!entry || !/^[a-f0-9]{64}$/.test(entry.sha256) || entry.key !== `sha256/${entry.sha256}` ||
          !Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > 32 * 1024 * 1024) {
        throw new Error("Documento ausente da cópia validada");
      }
      return entry;
    };
    const methods = {
      async createSignedUrl(path: string, _expiresIn: number) {
        const entry = await object(path);
        return { data: { signedUrl: await sign(entry.key) }, error: null };
      },
      async info(path: string) {
        const entry = await object(path);
        return { data: { id: entry.id, size: entry.size, version: entry.version, contentType: entry.content_type }, error: null };
      },
      async download(path: string) {
        const entry = await object(path);
        const bytes = await download(entry.key);
        if (bytes.length !== entry.size || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) {
          throw new Error("Conteúdo do documento não confere");
        }
        return { data: new Blob([Buffer.from(bytes)], { type: entry.content_type }), error: null };
      },
    };
    return new Proxy(methods, { get(target, key) {
      if (typeof key === "string" && Object.hasOwn(target, key)) return Reflect.get(target, key);
      throw new Error("Operação de arquivos bloqueada na recuperação");
    } });
  } };
}
