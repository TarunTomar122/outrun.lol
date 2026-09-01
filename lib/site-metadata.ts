export type SiteMetadata = { siteName?: string; headline?: string; siteLogo?: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#x27": "'", nbsp: " " };

function decode(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (ENTITIES[code]) return ENTITIES[code];
    const num = code[0] === "#" ? (code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)) : NaN;
    return Number.isFinite(num) ? String.fromCodePoint(num) : whole;
  }).trim();
}

function meta(html: string, key: string) {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"))?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decode(content) : undefined;
}

// Pick the best square-ish icon: apple-touch-icon > other rel=icon > og:image > /favicon.ico
function iconHref(html: string) {
  const links = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi) ?? [];
  const href = (tag?: string) => tag?.match(/href=["']([^"']+)["']/i)?.[1];
  return href(links.find((tag) => /apple-touch-icon/i.test(tag))) ?? href(links[0]);
}

export function parseMetadata(html: string, base: URL): SiteMetadata {
  const abs = (value?: string) => { if (!value) return undefined; try { return new URL(value, base).toString(); } catch { return undefined; } };
  const headline = meta(html, "og:description") || meta(html, "description") || meta(html, "twitter:description") || meta(html, "og:title");
  const logo = iconHref(html) || meta(html, "og:image") || meta(html, "twitter:image") || "/favicon.ico";
  return { siteName: meta(html, "og:site_name"), headline, siteLogo: abs(logo) };
}

// ponytail: best-effort scrape of the promoted link's og/favicon tags; empty object on any failure so the caller falls back.
export async function fetchSiteMetadata(link: string): Promise<SiteMetadata> {
  try {
    const response = await fetch(link, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; outrunn.lol/1.0; +https://outrunn.lol)", accept: "text/html" },
    });
    if (!response.ok) return {};
    const html = (await response.text()).slice(0, 200_000);
    return parseMetadata(html, new URL(response.url || link));
  } catch {
    return {};
  }
}
