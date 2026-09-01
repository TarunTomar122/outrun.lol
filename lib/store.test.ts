import { test } from "node:test";
import assert from "node:assert/strict";
import { active } from "./retention.ts";
import type { Entry } from "./types.ts";

const at = (msAgo: number): Entry => ({
  id: `e${msAgo}`, athleteId: 1, name: "x", link: "https://x.com", headline: "", distanceKm: 1, clicks: 0,
  updatedAt: new Date(Date.now() - msAgo).toISOString(),
});

const DAY = 24 * 60 * 60 * 1000;

test("keeps runs from the last 7 days, drops older ones", () => {
  const kept = active([at(1 * DAY), at(6.9 * DAY), at(7.1 * DAY), at(30 * DAY)]);
  const ids = kept.map((e) => e.id);
  assert.deepEqual(ids, [`e${1 * DAY}`, `e${6.9 * DAY}`]);
});
