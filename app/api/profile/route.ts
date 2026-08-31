import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import type { NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/session";
import { dayKey, getEntry, upsertEntry } from "@/lib/store";
import type { Session } from "@/lib/types";
import { verifyStravaActivity } from "@/lib/strava-proof";

function anonymousSession(): Session {
  const athleteId = randomInt(1_000_000_000, 2_000_000_000);
  return { athleteId, athlete: { id: athleteId, firstname: "Runner" }, accessToken: "", refreshToken: "", expiresAt: 0, scope: "", anonymous: true };
}

export async function POST(request: NextRequest) {
  const session = readSession(request);
  const current = session ?? anonymousSession();
  const input = await request.json().catch(() => null) as { proofLink?: string; link?: string } | null;
  const proofLink = typeof input?.proofLink === "string" ? input.proofLink.trim() : "";
  if (!proofLink || proofLink.length > 12000) return NextResponse.json({ error: "Add a Strava activity URL or embed snippet." }, { status: 400 });
  const link = typeof input?.link === "string" ? input.link.trim() : "";
  if (!link || link.length > 300) return NextResponse.json({ error: "Add a link under 300 characters." }, { status: 400 });
  try {
    const parsed = new URL(link);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Use a full http:// or https:// URL." }, { status: 400 });
  }
  let verified;
  try {
    verified = await verifyStravaActivity(proofLink, dayKey());
  } catch {
    return NextResponse.json({ error: "We could not verify that activity. Use a public Run from today that allows embedding." }, { status: 422 });
  }
  const previous = current.entry ?? await getEntry(dayKey(), `athlete-${current.athleteId}`);
  const entry = {
    id: previous?.id ?? `runner-${current.athleteId}`,
    athleteId: current.athleteId,
    name: verified.athleteName,
    avatar: current.athlete.profile,
    link,
    proofLink: verified.activityUrl,
    headline: previous?.headline || "Running a little further today.",
    distanceKm: verified.distanceKm,
    clicks: previous?.clicks ?? 0,
    visitors: previous?.visitors ?? 0,
    updatedAt: new Date().toISOString(),
  };
  await upsertEntry(dayKey(), entry);
  const response = NextResponse.json({ entry });
  setSession(response, { ...current, anonymous: current.anonymous ?? false, entry });
  return response;
}
