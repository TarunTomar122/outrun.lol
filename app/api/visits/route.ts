import { NextResponse } from "next/server";
import { bumpVisits, getVisits } from "@/lib/store";

// GET reads the running total; POST counts a new visit (called once per browser session).
export async function GET() {
  return NextResponse.json({ visits: await getVisits() });
}

export async function POST() {
  return NextResponse.json({ visits: await bumpVisits() });
}
