import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearOAuthState, readOAuthState, setSession } from "@/lib/session";
import { exchangeCode, getAthlete } from "@/lib/strava";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const responseUrl = new URL("/", url);
  if (error || !code || !state) {
    responseUrl.searchParams.set("error", error ?? "strava-denied");
    return NextResponse.redirect(responseUrl);
  }

  if (readOAuthState(request) !== state) {
    responseUrl.searchParams.set("error", "invalid-state");
    return NextResponse.redirect(responseUrl);
  }

  try {
    const token = await exchangeCode(code);
    const athlete = await getAthlete(token.access_token).catch(() => token.athlete);
    const response = NextResponse.redirect(new URL("/?connected=1", url));
    setSession(response, {
      athleteId: athlete.id,
      athlete,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_at,
      scope: token.scope ?? "",
    });
    clearOAuthState(response);
    return response;
  } catch {
    responseUrl.searchParams.set("error", "strava-exchange");
    return NextResponse.redirect(responseUrl);
  }
}
