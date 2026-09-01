import type { Entry } from "./types";
import { fetchSiteMetadata } from "./site-metadata";
import { active } from "./retention";

type Store = { entries: Entry[] | null; visits: number };

declare global {
  // eslint-disable-next-line no-var
  var __outrunStore: Store | undefined;
}

const REDIS_URL = process.env.outrun_KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.outrun_KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

function hasRedis() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function redis(command: Array<string | number>) {
  if (!hasRedis()) return null;
  const response = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Redis request failed: ${response.status}`);
  return (await response.json() as { result?: unknown }).result;
}

function parseEntries(value: unknown) {
  if (typeof value !== "string") return Array.isArray(value) ? value as Entry[] : null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as Entry[] : null;
  } catch {
    return null;
  }
}

// Rolling board: every run holds its spot for 7 days from its last submission (see ./retention).
const BOARD_KEY = "outrun:board:v1";

function clickKey(id: string) {
  return `outrun:clicks:${id}`;
}

function ranked(entries: Entry[]) {
  return [...entries].sort((a, b) => b.distanceKm - a.distanceKm);
}

async function withClickCounts(entries: Entry[]) {
  if (!hasRedis()) return entries;
  return Promise.all(entries.map(async (entry) => {
    let stored = await redis(["GET", clickKey(entry.id)]);
    if (stored === null || stored === undefined) {
      await redis(["SET", clickKey(entry.id), String(entry.clicks), "NX"]);
      stored = await redis(["GET", clickKey(entry.id)]);
    }
    const clicks = Number(stored);
    return { ...entry, clicks: Number.isFinite(clicks) ? clicks : entry.clicks };
  }));
}

// ponytail: memory is the zero-config fallback; Redis handles shared durable counts when attached.
const memory: Store = (globalThis.__outrunStore ??= { entries: null, visits: 0 });

const VISITS_KEY = "outrun:visits";

export async function getVisits() {
  if (hasRedis()) {
    const value = Number(await redis(["GET", VISITS_KEY]));
    return Number.isFinite(value) ? value : 0;
  }
  return memory.visits;
}

export async function bumpVisits() {
  if (hasRedis()) {
    const value = Number(await redis(["INCR", VISITS_KEY]));
    return Number.isFinite(value) ? value : 0;
  }
  return (memory.visits += 1);
}

const seedEntries: Omit<Entry, "updatedAt">[] = [
  { id: "seed-stocksbrew", athleteId: 1001, name: "StocksBrew", siteLogo: "https://stocksbrew.online/icon.svg", link: "https://stocksbrew.online", headline: "A calmer way to make sense of the market.", distanceKm: 24.8, clicks: 0 },
  { id: "seed-yourtrace", athleteId: 1002, name: "YourTrace", link: "https://yourtrace.online", headline: "See what your website is really doing.", distanceKm: 18.6, clicks: 0 },
];

export function dayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

// ponytail: seed identity (name/headline/logo) is scraped live from each link so nothing is hardcoded; the seed literals are the fallback if a fetch fails.
async function freshSeeds() {
  const updatedAt = new Date().toISOString();
  return Promise.all(seedEntries.map(async (entry) => {
    const metadata = await fetchSiteMetadata(entry.link);
    return { ...entry, name: metadata.siteName || entry.name, headline: metadata.headline || entry.headline, siteLogo: metadata.siteLogo ?? entry.siteLogo, updatedAt };
  }));
}

// Reads the raw board (unranked, no click merge), prunes expired runs, seeds once when empty.
async function readBoard(): Promise<Entry[]> {
  const stored = parseEntries(await redis(["GET", BOARD_KEY]));
  if (stored) {
    const live = active(stored);
    if (live.length !== stored.length && hasRedis()) await redis(["SET", BOARD_KEY, JSON.stringify(live)]);
    memory.entries = live;
    return live;
  }
  if (memory.entries === null) {
    memory.entries = await freshSeeds();
    if (hasRedis()) await redis(["SET", BOARD_KEY, JSON.stringify(memory.entries), "NX"]);
  }
  memory.entries = active(memory.entries);
  return memory.entries;
}

export async function getEntries() {
  return ranked(await withClickCounts(await readBoard()));
}

async function saveBoard(entries: Entry[]) {
  memory.entries = entries;
  if (hasRedis()) await redis(["SET", BOARD_KEY, JSON.stringify(entries)]);
}

export async function upsertEntry(entry: Entry) {
  const entries = await readBoard();
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index === -1) entries.push(entry);
  else entries[index] = { ...entries[index], ...entry };
  await saveBoard(entries);
  if (hasRedis()) await redis(["SET", clickKey(entry.id), String(entry.clicks), "NX"]);
  return entry;
}

export async function updateEntry(id: string, update: (entry: Entry) => Entry) {
  const entries = await readBoard();
  const index = entries.findIndex((item) => item.id === id);
  if (index === -1) return null;
  entries[index] = update(entries[index]);
  await saveBoard(entries);
  return entries[index];
}

export async function getEntry(id: string) {
  return (await readBoard()).find((entry) => entry.id === id) ?? null;
}

// Empties the board (and each entry's click count). Used by the dev reset endpoint.
export async function clearEntries() {
  const entries = await readBoard();
  if (hasRedis()) {
    for (const entry of entries) await redis(["DEL", clickKey(entry.id)]);
    await redis(["SET", BOARD_KEY, "[]"]);
  }
  memory.entries = [];
}

export async function trackEntry(id: string) {
  if (hasRedis()) {
    const entry = await getEntry(id);
    if (!entry) return null;
    const value = Number(await redis(["INCR", clickKey(id)]));
    const tracked = { ...entry, clicks: Number.isFinite(value) ? value : entry.clicks + 1 };
    if (memory.entries) {
      const index = memory.entries.findIndex((item) => item.id === id);
      if (index !== -1) memory.entries[index] = tracked;
    }
    return tracked;
  }
  return updateEntry(id, (entry) => ({ ...entry, clicks: entry.clicks + 1 }));
}
