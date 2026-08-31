import { NextResponse } from "next/server";
import { setSession } from "@/lib/session";
import { dayKey, getEntry, upsertEntry } from "@/lib/store";

export async function POST() {
  const athlete = { id: 9001, firstname: "Demo", lastname: "Runner", timezone: "UTC" };
  const previous = await getEntry(dayKey(), "athlete-9001");
  const entry = {
    id: "athlete-9001",
    athleteId: athlete.id,
    name: previous?.name ?? "Demo Runner",
    link: previous?.link ?? "https://outrun.lol",
    headline: previous?.headline ?? "A tiny running experiment on the internet.",
    category: previous?.category ?? "Running",
    distanceKm: previous?.distanceKm ?? 8.4,
    clicks: previous?.clicks ?? 0,
    visitors: previous?.visitors ?? 0,
    updatedAt: new Date().toISOString(),
  };
  const response = NextResponse.json({ demo: true });
  setSession(response, { athleteId: athlete.id, athlete, accessToken: "", refreshToken: "", expiresAt: 0, scope: "", demo: true, anonymous: true, entry });
  return response;
}
