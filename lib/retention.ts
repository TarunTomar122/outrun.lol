import type { Entry } from "./types";

// A run holds its spot for 7 days from its last submission.
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function active(entries: Entry[]) {
  const cutoff = Date.now() - WEEK_MS;
  return entries.filter((entry) => Date.parse(entry.updatedAt) >= cutoff);
}
