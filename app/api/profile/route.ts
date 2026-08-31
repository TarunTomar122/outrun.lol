import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/session";
import { dayKey, getEntry, upsertEntry } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: "Connect Strava first." }, { status: 401 });
  const input = await request.json().catch(() => null) as { link?: string; headline?: string; category?: string } | null;
  const link = typeof input?.link === "string" ? input.link.trim() : "";
  if (!link || link.length > 300) return NextResponse.json({ error: "Add a link under 300 characters." }, { status: 400 });
  try {
    const parsed = new URL(link);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Use a full http:// or https:// URL." }, { status: 400 });
  }
  const previous = await getEntry(dayKey(), `athlete-${session.athleteId}`);
  const entry = {
    id: previous?.id ?? `athlete-${session.athleteId}`,
    athleteId: session.athleteId,
    name: previous?.name ?? `${session.athlete.firstname} ${session.athlete.lastname ?? ""}`.trim(),
    avatar: session.athlete.profile,
    link,
    headline: typeof input?.headline === "string" ? input.headline.trim().slice(0, 180) || previous?.headline || "Running a little further today." : previous?.headline || "Running a little further today.",
    category: typeof input?.category === "string" ? input.category.trim().slice(0, 40) || previous?.category || "Running" : previous?.category || "Running",
    distanceKm: previous?.distanceKm ?? 0,
    clicks: previous?.clicks ?? 0,
    visitors: previous?.visitors ?? 0,
    updatedAt: new Date().toISOString(),
  };
  await upsertEntry(dayKey(), entry);
  const response = NextResponse.json({ entry });
  setSession(response, { ...session, entry });
  return response;
}
