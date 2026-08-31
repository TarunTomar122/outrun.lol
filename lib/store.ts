import type { Entry } from "./types";

type Store = { days: Map<string, Entry[]> };

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

function entryKey(date: string) {
  return `outrun:entries:${date}`;
}

function clickKey(date: string, id: string) {
  return `outrun:clicks:${date}:${id}`;
}

async function withClickCounts(date: string, entries: Entry[]) {
  if (!hasRedis()) return entries;
  return Promise.all(entries.map(async (entry) => {
    let stored = await redis(["GET", clickKey(date, entry.id)]);
    if (stored === null || stored === undefined) {
      await redis(["SET", clickKey(date, entry.id), String(entry.clicks), "NX"]);
      stored = await redis(["GET", clickKey(date, entry.id)]);
    }
    const clicks = Number(stored);
    return { ...entry, clicks: Number.isFinite(clicks) ? clicks : entry.clicks };
  }));
}

// ponytail: memory is the zero-config fallback; Redis handles shared durable counts when attached.
const memory: Store = (globalThis.__outrunStore ??= { days: new Map() });

const seedEntries: Omit<Entry, "updatedAt">[] = [
  { id: "seed-stocksbrew", athleteId: 1001, name: "StocksBrew", siteLogo: "https://stocksbrew.online/icon.svg", link: "https://stocksbrew.online", headline: "A calmer way to make sense of the market.", distanceKm: 24.8, clicks: 0 },
  { id: "seed-yourtrace", athleteId: 1002, name: "YourTrace", siteLogo: "https://yourtrace.online/trace-app-icon-v1-192.png", link: "https://yourtrace.online", headline: "See what your website is really doing.", distanceKm: 18.6, clicks: 0 },
];

export function dayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function freshSeeds() {
  return seedEntries.map((entry) => ({ ...entry, updatedAt: new Date().toISOString() }));
}

export async function getEntries(date = dayKey()) {
  const stored = parseEntries(await redis(["GET", entryKey(date)]));
  if (stored) {
    const entries = await withClickCounts(date, stored);
    memory.days.set(date, entries);
    return entries;
  }
  if (!memory.days.has(date)) {
    const entries = freshSeeds();
    memory.days.set(date, entries);
    if (hasRedis()) await redis(["SET", entryKey(date), JSON.stringify(entries), "NX"]);
  }
  return withClickCounts(date, memory.days.get(date)!);
}

async function saveEntries(date: string, entries: Entry[]) {
  memory.days.set(date, entries);
  if (hasRedis()) await redis(["SET", entryKey(date), JSON.stringify(entries)]);
}

export async function upsertEntry(date: string, entry: Entry) {
  const entries = await getEntries(date);
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index === -1) entries.push(entry);
  else entries[index] = { ...entries[index], ...entry };
  await saveEntries(date, entries);
  if (hasRedis()) await redis(["SET", clickKey(date, entry.id), String(entry.clicks), "NX"]);
  return entry;
}

export async function updateEntry(date: string, id: string, update: (entry: Entry) => Entry) {
  const entries = await getEntries(date);
  const index = entries.findIndex((item) => item.id === id);
  if (index === -1) return null;
  entries[index] = update(entries[index]);
  await saveEntries(date, entries);
  return entries[index];
}

export async function getEntry(date: string, id: string) {
  return (await getEntries(date)).find((entry) => entry.id === id) ?? null;
}

export async function trackEntry(date: string, id: string) {
  if (hasRedis()) {
    const entry = await getEntry(date, id);
    if (!entry) return null;
    const value = Number(await redis(["INCR", clickKey(date, id)]));
    const tracked = { ...entry, clicks: Number.isFinite(value) ? value : entry.clicks + 1 };
    const entries = memory.days.get(date);
    const index = entries?.findIndex((item) => item.id === id) ?? -1;
    if (entries && index !== -1) entries[index] = tracked;
    return tracked;
  }
  return updateEntry(date, id, (entry) => ({
    ...entry,
    clicks: entry.clicks + 1,
  }));
}
