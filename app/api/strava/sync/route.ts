import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/session";
import { getTodayDistance, refreshToken } from "@/lib/strava";
import { dayKey, getEntry, upsertEntry } from "@/lib/store";
import type { Session } from "@/lib/types";

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: "Connect Strava first." }, { status: 401 });
  try {
    let current: Session = session;
    if (session.expiresAt <= Math.floor(Date.now() / 1000) + 60) {
      const token = await refreshToken(session.refreshToken);
      current = { ...session, accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_at };
    }
    const distanceKm = await getTodayDistance(current);
    const previous = await getEntry(dayKey(), `athlete-${current.athleteId}`);
    const entry = {
      id: previous?.id ?? `athlete-${current.athleteId}`,
      athleteId: current.athleteId,
      name: previous?.name ?? `${current.athlete.firstname} ${current.athlete.lastname ?? ""}`.trim(),
      avatar: current.athlete.profile,
      link: previous?.link ?? "https://strava.com",
      headline: previous?.headline ?? "Running a little further today.",
      distanceKm,
      clicks: previous?.clicks ?? 0,
      updatedAt: new Date().toISOString(),
    };
    await upsertEntry(dayKey(), entry);
    const response = NextResponse.json({ distanceKm, athlete: current.athlete });
    setSession(response, { ...current, entry });
    return response;
  } catch {
    return NextResponse.json({ error: "Strava could not be synced. Try again in a moment." }, { status: 502 });
  }
}
