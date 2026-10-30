/** A standby HTTP instance must not also run the primary instance's queues. */
export function backgroundJobsEnabled(value = process.env.BACKGROUND_JOBS_ENABLED): boolean {
  if (value === undefined) return true;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("BACKGROUND_JOBS_ENABLED deve ser true ou false.");
}
