type VerifiedActivity = {
  activityUrl: string;
  athleteName: string;
  distanceKm: number;
  date: string;
};

function activityId(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !["strava.com", "www.strava.com", "strava-embeds.com"].includes(url.hostname)) throw new Error("invalid-url");
  const match = url.pathname.match(url.hostname === "strava-embeds.com" ? /\/activity\/(\d{4,20})(?:\/|$)/ : /\/activities\/(\d{4,20})(?:\/|$)/);
  if (!match) throw new Error("invalid-activity");
  return match[1];
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function distanceKm(value: string, unit: string) {
  const number = Number(value.includes(",") && !value.includes(".") ? value.replace(",", ".") : value.replace(/,/g, ""));
  if (!Number.isFinite(number) || number <= 0) throw new Error("invalid-distance");
  return unit.toLowerCase() === "mi" ? number * 1.609344 : unit.toLowerCase() === "m" ? number / 1000 : number;
}

export async function verifyStravaActivity(value: string, today: string): Promise<VerifiedActivity> {
  const id = activityId(value);
  const response = await fetch(`https://strava-embeds.com/activity/${id}`, {
    headers: { "user-agent": "outrun.lol activity verifier" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("activity-unavailable");
  const html = await response.text();
  const type = html.match(/class="type-and-date">[\s\S]*?<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const dateText = html.match(/class="activity-date">([^<]+)</i)?.[1]?.trim();
  const distanceMatch = html.match(/class="stat-label">Distance<\/div><div class="stat-value">\s*([\d.,]+)\s*(km|mi|m)\b/i);
  const name = html.match(/class="athlete-name"[^>]*>([^<]+)</i)?.[1]?.trim();
  const date = dateText ? new Date(`${dateText} UTC`).toISOString().slice(0, 10) : "";
  if (!type || !/run/i.test(type) || !date || date !== today || !distanceMatch) throw new Error("activity-not-eligible");
  return { activityUrl: `https://www.strava.com/activities/${id}`, athleteName: decodeHtml(name ?? "Runner"), distanceKm: distanceKm(distanceMatch[1], distanceMatch[2]), date };
}
