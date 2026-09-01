import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession } from "@/lib/session";
import { getEntries } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const entries = await getEntries();
  const sessionEntry = readSession(request)?.entry;
  if (sessionEntry) {
    const index = entries.findIndex((entry) => entry.id === sessionEntry.id);
    if (index === -1) entries.push(sessionEntry);
    else if (sessionEntry.updatedAt > entries[index].updatedAt) entries[index] = sessionEntry;
  }
  entries.sort((a, b) => b.distanceKm - a.distanceKm || b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json({ entries });
}
