import { AsyncLocalStorage } from "node:async_hooks";

const tasks = new AsyncLocalStorage<Set<Promise<void>>>();

/** Await short audit writes before Lambda returns; not a replacement for a durable queue. */
export function trackRequestTask(work: PromiseLike<unknown>): void {
  const pending = tasks.getStore();
  const promise = Promise.resolve(work).then(() => {}, error => {
    console.error("Falha em tarefa associada à requisição", { tipo: error?.name ?? "Error" });
  });
  pending?.add(promise);
}

export async function withRequestTasks<T>(action: () => Promise<T>): Promise<T> {
  return tasks.run(new Set(), async () => {
    try { return await action(); }
    finally {
      const pending = tasks.getStore()!;
      // Tasks may register another short write while completing.
      while (pending.size) {
        const batch = [...pending];
        batch.forEach(task => pending.delete(task));
        await Promise.all(batch);
      }
    }
  });
}
