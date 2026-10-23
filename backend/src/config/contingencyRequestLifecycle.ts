import type { Response } from "express";
import { trackRequestTask } from "./requestTasks";

/** A caller can disconnect while the database is reserving its request. */
export async function continueReservedRequest(
  response: Pick<Response, "destroyed" | "writableEnded" | "once">,
  release: () => Promise<void>,
  dispatch: () => void,
) {
  if (response.destroyed || response.writableEnded) {
    // No route has run yet, so releasing this reservation cannot hide a mutation.
    await release();
    return;
  }
  response.once("finish", () => trackRequestTask(release()));
  // Do not release on close after dispatch: work may still be running even
  // though the caller disconnected. Such requests require reconciliation.
  dispatch();
}
