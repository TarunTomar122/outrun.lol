import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../chrome";

export const metadata: Metadata = {
  title: "Rules — outrunn.lol",
  description: "How the daily running leaderboard works: verify a Run, claim a rank, hold the top spot.",
};

const rules: { title: string; body: string }[] = [
  { title: "One board a day", body: "A fresh leaderboard starts every day at midnight IST. Yesterday’s ranks don’t carry over — you earn your spot again each day." },
  { title: "Furthest verified Run wins", body: "Ranks are ordered by distance. The longest Run of the day sits at #1." },
  { title: "Proof is public", body: "Link a public Strava Run — full activity URL or embed snippet. We read the distance, type, and date straight from Strava. Private or non-embeddable activities can’t be verified." },
  { title: "It has to be a Run, from today", body: "Only Runs count — no rides, walks, or older activities. The activity must be dated today on the current board." },
  { title: "Claim a rank by going further", body: "To take a spot, post a Run at least 1 km longer than the entry above you. Beat #1’s distance and #1 is yours." },
  { title: "One run, one link", body: "Each Strava activity can hold a single link. The same Run can’t be reused to claim more than one spot." },
  { title: "Your link, auto-branded", body: "Paste any http(s) link. We pull the site name, tagline, and logo from the page automatically — nothing to fill in." },
  { title: "Clicks are counted", body: "Every click on your promoted link is tracked and shown on your row. Update your Run anytime — your spot keeps its clicks." },
];

export default function Rules() {
  return <main className="app-shell">
    <SiteHeader active="rules" />
    <section className="rules">
      <h1>Rules</h1>
      <p className="rules-intro">outrunn.lol is the daily running leaderboard. Run further than the internet, verify it, and put your link in front of the board.</p>
      <ol className="rules-list">
        {rules.map((rule) => <li key={rule.title}><div><h3>{rule.title}</h3><p>{rule.body}</p></div></li>)}
      </ol>
      <div className="rules-cta"><a href="/#claim">Claim your rank</a></div>
    </section>
    <SiteFooter />
  </main>;
}
