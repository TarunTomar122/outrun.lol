import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { dayKey, getEntry } from "@/lib/store";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  const storedEntry = session ? await getEntry(dayKey(), `athlete-${session.athleteId}`) : null;
  const entry = session?.entry && (!storedEntry || session.entry.updatedAt > storedEntry.updatedAt) ? session.entry : storedEntry ?? session?.entry ?? null;
  return NextResponse.json({
    configured: Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET),
    connected: Boolean(session && !session.anonymous),
    demo: Boolean(session?.demo),
    athlete: session?.athlete ?? null,
    entry,
  });
}
