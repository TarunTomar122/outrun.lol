import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import type { NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/session";
import { dayKey, getEntries, upsertEntry } from "@/lib/store";
import type { Session } from "@/lib/types";
import { ProofVerificationError, verifyStravaActivity } from "@/lib/strava-proof";
import { fetchSiteMetadata } from "@/lib/site-metadata";

function anonymousSession(): Session {
  const athleteId = randomInt(1_000_000_000, 2_000_000_000);
  return { athleteId, athlete: { id: athleteId, firstname: "Runner" }, accessToken: "", refreshToken: "", expiresAt: 0, scope: "", anonymous: true };
}

export async function POST(request: NextRequest) {
  const session = readSession(request);
  const current = session ?? anonymousSession();
  // A run counts if it happened in the last 7 days; that run then holds a spot for 7 days.
  const validDates = Array.from({ length: 7 }, (_, days) => dayKey(new Date(Date.now() - days * 86_400_000)));
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
    verified = await verifyStravaActivity(proofLink, validDates);
  } catch (error) {
    if (error instanceof ProofVerificationError) {
      const messages = {
        invalid: "That doesn’t look like a Strava activity or embed snippet.",
        unavailable: "That run isn’t publicly embeddable. Set its visibility to Everyone, or paste the desktop Embed snippet (it carries the access token).",
        "not-run": "That activity isn’t a Run. Link a Run activity to join the board.",
        "no-distance": "We couldn’t read a distance from that Run.",
        "date-unavailable": "We couldn’t confirm when that activity happened.",
        "wrong-day": "That Run is older than 7 days.",
      } as const;
      return NextResponse.json({ error: messages[error.code], code: error.code, activityDate: error.activityDate }, { status: 422 });
    }
    return NextResponse.json({ error: "We could not verify that activity. Use a public Run from the last 7 days that allows embedding." }, { status: 422 });
  }
  const dayEntries = await getEntries();
  const previous = current.entry ?? dayEntries.find((item) => item.athleteId === current.athleteId);
  // One Strava run holds one link: block reusing an activity already claimed by someone else today.
  if (dayEntries.some((item) => item.proofLink === verified.activityUrl && item.athleteId !== current.athleteId)) {
    return NextResponse.json({ error: "That Strava run is already on today’s board.", code: "run-claimed" }, { status: 409 });
  }
  const linkChanged = previous?.link !== link;
  const metadata = linkChanged ? await fetchSiteMetadata(link) : {};
  const entry = {
    id: previous?.id ?? `runner-${current.athleteId}`,
    athleteId: current.athleteId,
    name: metadata.siteName || previous?.name || verified.athleteName,
    avatar: current.athlete.profile,
    siteLogo: metadata.siteLogo ?? previous?.siteLogo,
    link,
    proofLink: verified.activityUrl,
    headline: metadata.headline || previous?.headline || "Running a little further today.",
    distanceKm: verified.distanceKm,
    clicks: previous?.clicks ?? 0,
    updatedAt: new Date().toISOString(),
  };
  await upsertEntry(entry);
  const response = NextResponse.json({ entry });
  setSession(response, { ...current, anonymous: current.anonymous ?? false, entry });
  return response;
}
