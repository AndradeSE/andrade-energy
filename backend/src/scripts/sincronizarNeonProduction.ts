import "dotenv/config";
import { snapshotFailureReason, synchronizeNeonProduction } from "../config/neonSnapshotRuntime";

const optional = process.argv.includes("--if-configured");
const enabled = process.env.NEON_SNAPSHOT_ENABLED === "true" && process.env.NEON_RECOVERY_READ_ONLY !== "true";

if (!optional || enabled) synchronizeNeonProduction(process.env).then(result => {
  console.log("Resultado da sincronização Neon Production", result);
}).catch(error => {
  console.error("Sincronização Neon Production falhou:", snapshotFailureReason(error));
  process.exitCode = 1;
});
