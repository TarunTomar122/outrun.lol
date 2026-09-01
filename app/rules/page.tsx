import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../chrome";

export const metadata: Metadata = {
  title: "Rules — outrunn.lol",
  description: "How the daily running leaderboard works: verify a Run, claim a rank, hold the top spot.",
};

const rules: { title: string; body: string }[] = [
  { title: "Your run lasts a week", body: "Post a Run and your link holds its spot for 7 days — a full week of traffic from a single run. After 7 days it drops off the board." },
  { title: "Furthest verified Run wins", body: "Ranks are ordered by distance. The longest Run on the board sits at #1." },
  { title: "Proof is public", body: "Link a public Strava Run — full activity URL or embed snippet. We read the distance, type, and date straight from Strava. Private or non-embeddable activities can’t be verified." },
  { title: "A recent Run counts", body: "Only Runs count — no rides or walks. Submit a public Run from the last 7 days; that’s what starts your 7 days on the board." },
  { title: "Claim a rank by going further", body: "To take a spot, post a Run just 0.1 km longer than the entry above you. Beat #1’s distance and #1 is yours." },
  { title: "One run, one link", body: "Each Strava activity can hold a single link. The same Run can’t be reused to claim more than one spot." },
  { title: "Your link, auto-branded", body: "Paste any http(s) link. We pull the site name, tagline, and logo from the page automatically — nothing to fill in." },
  { title: "Slipped in the ranks?", body: "Run again anytime and submit the same link with your new Run. It updates your distance, refreshes your 7 days, and keeps your clicks." },
];

export default function Rules() {
  return <main className="app-shell">
    <SiteHeader active="rules" />
    <section className="rules">
      <h1>Rules</h1>
      <p className="rules-intro">outrunn.lol is a running leaderboard. Run further than the internet, verify it, and your link rides the board for a week.</p>
      <ol className="rules-list">
        {rules.map((rule) => <li key={rule.title}><div><h3>{rule.title}</h3><p>{rule.body}</p></div></li>)}
      </ol>
      <div className="rules-cta"><a href="/#claim">Claim your rank</a></div>
    </section>
    <SiteFooter />
  </main>;
}
