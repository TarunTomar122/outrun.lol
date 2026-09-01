import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSession } from "@/lib/session";
import { clearEntries } from "@/lib/store";

// Clears the board. Open in dev; in production only with the right ?token= (set DEV_RESET_TOKEN).
export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  const allowed = process.env.NODE_ENV !== "production" || (!!process.env.DEV_RESET_TOKEN && token === process.env.DEV_RESET_TOKEN);
  if (!allowed) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  await clearEntries();
  // Also drop the caller's own entry from their session, otherwise the board re-injects it.
  const response = NextResponse.json({ ok: true });
  clearSession(response);
  return response;
}
