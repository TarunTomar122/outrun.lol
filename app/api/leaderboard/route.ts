import { NextResponse } from "next/server";
import { getEntries } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await getEntries();
  entries.sort((a, b) => b.distanceKm - a.distanceKm || b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json({ entries });
}
