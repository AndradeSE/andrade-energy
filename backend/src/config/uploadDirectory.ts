import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function uploadDirectory() {
  const directory = process.env.API_RUNTIME === "serverless"
    ? path.join(tmpdir(), "andrade-uploads")
    : path.resolve("uploads");
  mkdirSync(directory, { recursive: true });
  return directory;
}
