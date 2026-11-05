import "dotenv/config";
import { snapshotFailureReason, synchronizeNeonPreview } from "../config/neonSnapshotRuntime";

const optional = process.argv.includes("--if-configured");
const enabled = process.env.NEON_SNAPSHOT_ENABLED === "true";

if (!optional || enabled) synchronizeNeonPreview(process.env).then(result => {
  console.log("Resultado da sincronização Neon Preview", result);
}).catch(error => {
  console.error("Sincronização Neon Preview falhou:", snapshotFailureReason(error));
  process.exitCode = 1;
});
