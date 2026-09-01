import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { getEntries } from "@/lib/store";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  const storedEntry = session ? (await getEntries()).find((entry) => entry.athleteId === session.athleteId) ?? null : null;
  const entry = session?.entry && (!storedEntry || session.entry.updatedAt > storedEntry.updatedAt) ? session.entry : storedEntry ?? session?.entry ?? null;
  return NextResponse.json({
    configured: Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET),
    connected: Boolean(session && !session.anonymous),
    athlete: session?.athlete ?? null,
    entry,
  });
}
