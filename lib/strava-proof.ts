type VerifiedActivity = {
  activityUrl: string;
  athleteName: string;
  distanceKm: number;
  date: string;
};

type ActivityProof = { id: string; token?: string };

export type ProofFailureCode = "invalid" | "unavailable" | "not-run" | "no-distance" | "date-unavailable" | "wrong-day";

export class ProofVerificationError extends Error {
  readonly code: ProofFailureCode;
  readonly activityDate?: string;

  constructor(code: ProofFailureCode, activityDate?: string) {
    super(code);
    this.name = "ProofVerificationError";
    this.code = code;
    this.activityDate = activityDate;
  }
}

function fail(code: ProofFailureCode, activityDate?: string): never {
  throw new ProofVerificationError(code, activityDate);
}

function proofDetails(value: string): ActivityProof {
  const embedId = value.match(/data-embed-id=["'](\d{4,20})["']/i);
  if (embedId) return { id: embedId[1], token: value.match(/data-token=["']([^"']+)["']/i)?.[1] };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail("invalid");
  }
  if (url.protocol !== "https:" || !["strava.com", "www.strava.com", "strava-embeds.com"].includes(url.hostname)) return fail("invalid");
  const match = url.pathname.match(url.hostname === "strava-embeds.com" ? /\/activity\/(\d{4,20})(?:\/|$)/ : /\/activities\/(\d{4,20})(?:\/|$)/);
  if (!match) return fail("invalid");
  return { id: match[1], token: url.searchParams.get("token") ?? undefined };
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function distanceKm(value: string, unit: string) {
  const number = Number(value.includes(",") && !value.includes(".") ? value.replace(",", ".") : value.replace(/,/g, ""));
  if (!Number.isFinite(number) || number <= 0) throw new Error("invalid-distance");
  return unit.toLowerCase() === "mi" ? number * 1.609344 : unit.toLowerCase() === "m" ? number / 1000 : number;
}

function exactDate(value: string) {
  const parsed = new Date(`${value} UTC`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

async function htmlAt(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "outrunn.lol activity verifier" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return fail("unavailable");
    return response.text();
  } catch {
    return fail("unavailable");
  }
}

export async function verifyStravaActivity(value: string, validDates: string[]): Promise<VerifiedActivity> {
  const { id, token } = proofDetails(value);
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  const html = await htmlAt(`https://strava-embeds.com/activity/${id}${query}`);
  const type = html.match(/<div class="type-and-date">[\s\S]*?<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const dateText = html.match(/class="activity-date">([^<]+)</i)?.[1]?.trim() ?? "";
  const distanceMatch = html.match(/class="stat-label">Distance<\/div>\s*<div class="stat-value">\s*([\d.,]+)\s*(km|mi|m)\b/i);
  const name = html.match(/class="athlete-name"[^>]*>([^<]+)</i)?.[1]?.trim();
  if (!type) return fail("unavailable");
  if (!/run/i.test(type)) return fail("not-run");
  if (!distanceMatch) return fail("no-distance");

  let date = exactDate(dateText);
  if (!date) {
    let activityHtml: string;
    try {
      activityHtml = await htmlAt(`https://www.strava.com/activities/${id}`);
    } catch {
      return fail("date-unavailable");
    }
    const exactText = activityHtml.match(/name="description" content="View [^\"]+ on ([A-Z][a-z]+ \d{1,2}, \d{4}) \| Strava"/i)?.[1];
    date = exactText ? exactDate(exactText) : "";
  }
  if (!date) return fail("date-unavailable");
  if (!validDates.includes(date)) return fail("wrong-day", date);

  return {
    activityUrl: `https://www.strava.com/activities/${id}`,
    athleteName: decodeHtml(name ?? "Runner"),
    distanceKm: distanceKm(distanceMatch[1], distanceMatch[2]),
    date,
  };
}
