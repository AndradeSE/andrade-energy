import type { ServerResponse } from "node:http";
import { trackRequestTask } from "./requestTasks";

/** A caller can disconnect while the database is reserving its request. */
export async function continueReservedRequest(
  response: Pick<ServerResponse, "destroyed" | "writableEnded" | "once" | "end">,
  release: () => Promise<void>,
  dispatch: () => void,
) {
  if (response.destroyed || response.writableEnded) {
    // No route has run yet, so releasing this reservation cannot hide a mutation.
    await release();
    return;
  }
  let releaseStarted = false;
  const releaseOnce = () => {
    if (releaseStarted) return;
    releaseStarted = true;
    trackRequestTask(release());
  };
  const end = response.end;
  response.end = function (this: typeof response, ...args: any[]) {
    // A response sent after the caller disconnected does not emit finish.
    // The route has nevertheless reached its response boundary, so it is safe
    // to release now; closing the socket alone is deliberately insufficient.
    releaseOnce();
    return (end as Function).apply(this, args);
  } as typeof response.end;
  response.once("finish", releaseOnce);
  // Do not release on close after dispatch: work may still be running even
  // though the caller disconnected. Such requests require reconciliation.
  dispatch();
}
