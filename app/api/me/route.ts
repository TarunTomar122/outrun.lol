import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { getEntries } from "@/lib/store";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  // Reflect the live board only: if your run expired or was cleared, you're not "on the board".
  const entry = session ? (await getEntries()).find((item) => item.athleteId === session.athleteId) ?? null : null;
  return NextResponse.json({
    configured: Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET),
    connected: Boolean(session && !session.anonymous),
    athlete: session?.athlete ?? null,
    entry,
  });
}
