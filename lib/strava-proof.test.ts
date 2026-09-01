import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProof } from "./strava-proof.ts";

test("parses a full activity URL", () => {
  assert.deepEqual(parseProof("https://www.strava.com/activities/1234567890"), { id: "1234567890", token: undefined });
});

test("parses an embed snippet with token", () => {
  assert.deepEqual(parseProof('<div class="strava-embed-placeholder" data-embed-id="987654321" data-token="abc123">'), { id: "987654321", token: "abc123" });
});

test("parses a strava-embeds URL with token query", () => {
  assert.deepEqual(parseProof("https://strava-embeds.com/activity/5550001234?token=xyz"), { id: "5550001234", token: "xyz" });
});

test("returns null for a share link (needs server resolving)", () => {
  assert.equal(parseProof("https://strava.app.link/abc123"), null);
});

test("returns null for a non-strava URL", () => {
  assert.equal(parseProof("https://evil.com/activities/1"), null);
});
