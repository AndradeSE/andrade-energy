import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForNavigationWarmup } from "../../utils/navigation-warmup";

test("a pending auxiliary request cannot block navigation", async () => {
  await waitForNavigationWarmup(new Promise(() => {}), 10);
});
test("failed warming is nonfatal", async () => {
  await waitForNavigationWarmup(Promise.reject(new Error("offline")), 10);
});
test("ready data continues immediately", async () => {
  await waitForNavigationWarmup(Promise.resolve(), 60000);
});
test("late failures after the deadline are handled", async () => {
  let reject!: (error: Error) => void;
  const work = new Promise((_, fail) => { reject = fail; });
  await waitForNavigationWarmup(work, 10);
  reject(new Error("late network failure"));
  await new Promise(resolve => setTimeout(resolve, 0));
});
