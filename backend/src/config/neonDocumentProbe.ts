import { createHash } from "node:crypto";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Client } from "pg";
import { neonPreviewConnection } from "./neonSnapshotRuntime";
import { neonStorageConnection, reserveDocumentsBucket } from "./neonStorageRuntime";
import type { MirroredObject } from "./neonStorageSnapshot";

/** Exercise the private PDF URL flow without logging document paths or signed URLs. */
export async function verifyNeonPrivateDocument(env: NodeJS.ProcessEnv) {
  const client = new Client(neonPreviewConnection(env));
  const storage = new S3Client(neonStorageConnection(env));
  try {
    await client.connect();
    const { rows: [state] } = await client.query(
      "SELECT storage_ready,storage_manifest FROM reserve_control.snapshot_state WHERE id=1",
    );
    if (!state?.storage_ready || !Array.isArray(state.storage_manifest)) throw new Error("Cópia dos PDFs não está pronta");
    const manifest = state.storage_manifest as MirroredObject[];
    const object = manifest.find(entry => entry.bucket === "contratos") ?? manifest[0];
    if (!object || object.key !== `sha256/${object.sha256}` || !/^[a-f0-9]{64}$/.test(object.sha256)) {
      throw new Error("Manifesto do PDF inválido");
    }
    const signedUrl = await getSignedUrl(storage, new GetObjectCommand({ Bucket: reserveDocumentsBucket,
      Key: object.key, ResponseContentType: "application/pdf" }), { expiresIn: 60 });
    const response = await fetch(signedUrl, { redirect: "error", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("URL privada do PDF recusada");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== object.size || createHash("sha256").update(bytes).digest("hex") !== object.sha256) {
      throw new Error("Conteúdo do PDF não confere");
    }
    const unsigned = new URL(signedUrl);
    unsigned.search = "";
    const denied = await fetch(unsigned, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (![401, 403, 404].includes(denied.status)) throw new Error("Arquivo privado respondeu sem assinatura");
    return { documents: manifest.length, bytes: bytes.length, unsignedStatus: denied.status };
  } finally { storage.destroy(); await client.end(); }
}
