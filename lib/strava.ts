import type { Athlete, Session } from "./types";

const API_BASE = "https://www.strava.com/api/v3";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete: Athlete;
};

type Activity = {
  distance: number;
  type?: string;
  sport_type?: string;
  start_date_local: string;
};

async function parse<T>(response: Response) {
  if (!response.ok) throw new Error(`Strava request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
  });
  return parse<TokenResponse>(await fetch("https://www.strava.com/oauth/token", { method: "POST", body, cache: "no-store" }));
}

export async function refreshToken(refreshTokenValue: string) {
  const body = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    refresh_token: refreshTokenValue,
    grant_type: "refresh_token",
  });
  return parse<Pick<TokenResponse, "access_token" | "refresh_token" | "expires_at">>(await fetch("https://www.strava.com/oauth/token", { method: "POST", body, cache: "no-store" }));
}

export async function getAthlete(accessToken: string) {
  return parse<Athlete>(await fetch(`${API_BASE}/athlete`, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" }));
}

function localDate(timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function getTodayDistance(session: Session) {
  const date = localDate(session.athlete.timezone);
  const after = Math.floor(Date.now() / 1000) - 60 * 60 * 48;
  const params = new URLSearchParams({ after: String(after), per_page: "200" });
  const activities = await parse<Activity[]>(await fetch(`${API_BASE}/athlete/activities?${params}`, { headers: { authorization: `Bearer ${session.accessToken}` }, cache: "no-store" }));
  return activities
    .filter((activity) => (activity.sport_type === "Run" || activity.type === "Run") && activity.start_date_local.startsWith(date))
    .reduce((total, activity) => total + activity.distance, 0) / 1000;
}
