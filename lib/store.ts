import type { Entry } from "./types";

type Store = { days: Map<string, Entry[]>; visitors: Map<string, number> };

declare global {
  // eslint-disable-next-line no-var
  var __outrunStore: Store | undefined;
}

const memory: Store = (globalThis.__outrunStore ??= { days: new Map(), visitors: new Map() });
memory.visitors ??= new Map();

const seedEntries: Omit<Entry, "updatedAt">[] = [
  { id: "seed-1", athleteId: 1001, name: "Maya Chen", link: "https://stride.club", headline: "A calmer way to build a running habit.", distanceKm: 24.8, clicks: 842, visitors: 516 },
  { id: "seed-2", athleteId: 1002, name: "Oliver Reed", link: "https://paceboard.app", headline: "Your week, measured in good decisions.", distanceKm: 18.6, clicks: 611, visitors: 382 },
  { id: "seed-3", athleteId: 1003, name: "Priya Shah", link: "https://slowmiles.co", headline: "The social running club for the long way home.", distanceKm: 16.1, clicks: 488, visitors: 297 },
  { id: "seed-4", athleteId: 1004, name: "Jon Bell", link: "https://workoutlog.dev", headline: "A tiny workout logger for serious lifters.", distanceKm: 12.4, clicks: 221, visitors: 161 },
  { id: "seed-5", athleteId: 1005, name: "Sam Okafor", link: "https://fieldnotes.run", headline: "Training notes that stay out of your way.", distanceKm: 9.8, clicks: 173, visitors: 109 },
];

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kv(command: unknown[]) {
  if (!hasKv()) return null;
  const response = await fetch(process.env.KV_REST_API_URL!, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`KV request failed: ${response.status}`);
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

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function freshSeeds() {
  return seedEntries.map((entry) => ({ ...entry, updatedAt: new Date().toISOString() }));
}

export async function getEntries(date = dayKey()) {
  const stored = parseEntries(await kv(["GET", `outrun:entries:${date}`]));
  if (stored) return stored;
  if (!memory.days.has(date)) memory.days.set(date, freshSeeds());
  return memory.days.get(date)!;
}

async function saveEntries(date: string, entries: Entry[]) {
  memory.days.set(date, entries);
  // ponytail: read/write updates can lose concurrent increments; use Redis atomic ops if traffic matters.
  if (hasKv()) await kv(["SET", `outrun:entries:${date}`, JSON.stringify(entries)]);
}

export async function upsertEntry(date: string, entry: Entry) {
  const entries = await getEntries(date);
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index === -1) entries.push(entry);
  else entries[index] = { ...entries[index], ...entry };
  await saveEntries(date, entries);
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

export async function getSiteVisitors(date = dayKey()) {
  const stored = await kv(["GET", `outrun:visitors:${date}`]);
  const count = Number(stored);
  if (stored !== null && stored !== undefined && Number.isFinite(count)) {
    memory.visitors.set(date, count);
    return count;
  }
  return memory.visitors.get(date) ?? 0;
}

export async function trackSiteVisit(date = dayKey()) {
  const count = (await getSiteVisitors(date)) + 1;
  memory.visitors.set(date, count);
  // ponytail: increments can collide without Redis atomic ops; use INCR when traffic matters.
  if (hasKv()) await kv(["SET", `outrun:visitors:${date}`, String(count)]);
  return count;
}

export async function trackEntry(date: string, id: string, event: "click" | "visit") {
  return updateEntry(date, id, (entry) => ({
    ...entry,
    clicks: entry.clicks + (event === "click" ? 1 : 0),
    visitors: entry.visitors + (event === "visit" ? 1 : 0),
  }));
}
