import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/session";
import { dayKey, trackEntry } from "@/lib/store";

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null) as { entryId?: string; event?: "click" | "visit" } | null;
  if (!input?.entryId || (input.event !== "click" && input.event !== "visit")) return NextResponse.json({ error: "Invalid tracking event." }, { status: 400 });
  const session = readSession(request);
  const stored = await trackEntry(dayKey(), input.entryId, input.event);
  const sessionEntry = session?.entry?.id === input.entryId ? {
    ...session.entry,
    clicks: session.entry.clicks + (input.event === "click" ? 1 : 0),
    visitors: session.entry.visitors + (input.event === "visit" ? 1 : 0),
    updatedAt: new Date().toISOString(),
  } : undefined;
  const entry = stored ?? sessionEntry;
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  const response = NextResponse.json({ ok: true });
  if (session && sessionEntry) setSession(response, { ...session, entry: stored ?? sessionEntry });
  return response;
}
