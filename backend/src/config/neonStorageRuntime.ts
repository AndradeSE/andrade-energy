import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { productionSupabaseUrl } from "./neonSnapshot";
import { mirrorSnapshotObjects, type MirroredObject, type SourceObject } from "./neonStorageSnapshot";

export const reserveDocumentsBucket = "andrade-production-documentos";

export function neonStorageConnection(env: NodeJS.ProcessEnv) {
  const endpoint = new URL(String(env.NEON_STORAGE_ENDPOINT ?? ""));
  if (endpoint.protocol !== "https:" || endpoint.port || endpoint.username || endpoint.password ||
      endpoint.pathname !== "/" || endpoint.search || endpoint.hash ||
      !/^br-dark-cloud-beb7z4du\.storage\.c-\d+\.us-east-2\.aws\.neon\.tech$/.test(endpoint.hostname) ||
      !env.NEON_STORAGE_ACCESS_KEY_ID || !env.NEON_STORAGE_SECRET_ACCESS_KEY) {
    throw new Error("Armazenamento Neon Production não configurado");
  }
  return { region: "us-east-2", endpoint: endpoint.origin, forcePathStyle: true, maxAttempts: 2,
    credentials: { accessKeyId: env.NEON_STORAGE_ACCESS_KEY_ID, secretAccessKey: env.NEON_STORAGE_SECRET_ACCESS_KEY } };
}

export async function mirrorNeonDocuments(env: NodeJS.ProcessEnv, objects: SourceObject[], previous: MirroredObject[]) {
  if (env.SUPABASE_URL?.replace(/\/$/, "") !== productionSupabaseUrl || !env.SUPABASE_SERVICE_KEY) {
    throw new Error("Origem diferente do Production");
  }
  const storage = new S3Client(neonStorageConnection(env));
  const origin = createClient(productionSupabaseUrl, env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30_000), redirect: "error" }) } });
  try {
    return await mirrorSnapshotObjects(objects, previous, {
      info: async object => {
        const { data, error } = await origin.storage.from(object.bucket).info(object.path);
        if (error || !data || data.size == null) throw new Error("Arquivo de origem indisponível");
        return { id: data.id, version: data.version, size: data.size };
      },
      download: async object => {
        const { data, error } = await origin.storage.from(object.bucket).download(object.path);
        if (error || !data || data.size > 32 * 1024 * 1024) throw new Error("Arquivo de origem indisponível");
        return new Uint8Array(await data.arrayBuffer());
      },
    }, {
      exists: async (key, size, sha256) => {
        try {
          const result = await storage.send(new HeadObjectCommand({ Bucket: reserveDocumentsBucket, Key: key }),
            { abortSignal: AbortSignal.timeout(30_000) });
          return result.ContentLength === size && result.Metadata?.sha256 === sha256;
        } catch (error) {
          if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
          throw error;
        }
      },
      put: async (key, data, sha256, contentType) => {
        try {
          await storage.send(new PutObjectCommand({ Bucket: reserveDocumentsBucket, Key: key,
            Body: data, ContentType: contentType, Metadata: { sha256 } }),
          { abortSignal: AbortSignal.timeout(30_000) });
        } catch (error) {
          const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
          if (status) throw new Error('NEON_STORAGE_PUT_HTTP_' + status);
          throw error;
        }
      },
      get: async key => {
        for (let attempt = 0; ; attempt++) {
          try {
            const result = await storage.send(new GetObjectCommand({ Bucket: reserveDocumentsBucket, Key: key }),
              { abortSignal: AbortSignal.timeout(30_000) });
            if (!result.Body || (result.ContentLength ?? Infinity) > 32 * 1024 * 1024) throw new Error("Arquivo do reserva indisponível");
            return await result.Body.transformToByteArray();
          } catch (error) {
            const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
            if (attempt < 3 && (status === 404 || (status != null && status >= 500))) {
              await new Promise(resolve => setTimeout(resolve, [250, 1000, 3000][attempt]));
              continue;
            }
            if (status) throw new Error('NEON_STORAGE_GET_HTTP_' + status);
            throw error;
          }
        }
      },
    });
  } finally { storage.destroy(); }
}
