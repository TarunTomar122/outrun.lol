import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession, setSession } from "@/lib/session";
import { dayKey, getEntry, trackEntry } from "@/lib/store";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = readSession(request);
  const entry = await getEntry(dayKey(), id) ?? (session?.entry?.id === id ? session.entry : null);
  if (!entry) return NextResponse.redirect(new URL("/", request.url));
  const tracked = await trackEntry(dayKey(), id, "click");
  const response = NextResponse.redirect(entry.link);
  if (session?.entry?.id === id) setSession(response, { ...session, entry: { ...(tracked ?? session.entry), clicks: tracked?.clicks ?? session.entry.clicks + 1 } });
  return response;
}
