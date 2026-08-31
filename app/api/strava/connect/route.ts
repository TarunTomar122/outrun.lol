import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { setOAuthState } from "@/lib/session";

export function GET(request: Request) {
  const url = new URL(request.url);
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?error=strava-config", url));
  }
  const state = randomBytes(24).toString("hex");
  const redirectUri = `${url.origin}/api/strava/callback`;
  const authorize = new URL("https://www.strava.com/oauth/authorize");
  authorize.search = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read",
    state,
  }).toString();
  const response = NextResponse.redirect(authorize);
  setOAuthState(response, state);
  return response;
}
