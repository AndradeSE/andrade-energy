/** Cache warming is optional: it must never prevent navigation. */
export async function waitForNavigationWarmup(
  work: Promise<unknown>,
  budgetMs = 8000,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work.catch(() => undefined),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, budgetMs); }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
