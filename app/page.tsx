"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Entry } from "@/lib/types";

type Me = { entry: Entry | null };

function distance(value: number) {
  return `${value.toFixed(1)} km`;
}

function host(link: string) {
  try {
    return new URL(link).hostname.replace("www.", "");
  } catch {
    return link;
  }
}

function timeSince(date: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [boardDate, setBoardDate] = useState("");
  const [siteVisitors, setSiteVisitors] = useState(0);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [link, setLink] = useState("");

  const load = useCallback(async () => {
    const [leaderboard, profile] = await Promise.all([
      fetch("/api/leaderboard", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/me", { cache: "no-store" }).then((response) => response.json()),
    ]);
    setEntries(leaderboard.entries);
    setBoardDate(leaderboard.date);
    setSiteVisitors(leaderboard.visitors ?? 0);
    setMe(profile);
    if (profile.entry) {
      setProofLink(profile.entry.proofLink ?? "");
      setLink(profile.entry.link);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    if (!window.localStorage.getItem("outrun-visit")) {
      window.localStorage.setItem("outrun-visit", "1");
      void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryId: "site", event: "visit" }) })
        .then((response) => response.json())
        .then((result) => { if (typeof result.visitors === "number") setSiteVisitors(result.visitors); });
    }
  }, [load]);

  async function demo() {
    setStatus("Opening demo mode…");
    await fetch("/api/demo", { method: "POST" });
    await load();
    setStatus("Demo result loaded. Replace it with your public Run.");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("Verifying your activity…");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proofLink, link }),
      });
      const result = await response.json();
      if (!response.ok) return setStatus(result.error ?? "Could not publish your spot.");
      setStatus("Your spot is live.");
      await load();
    } catch {
      setStatus("Could not verify that activity. Try again in a moment.");
    }
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="logo" href="#top" aria-label="outrun.lol home"><span className="logo-glyph"><i /><i /><i /></span>outrun.lol</a>
      <nav aria-label="Main navigation"><a className="active" href="#board">Daily</a><a href="#claim">Submit</a></nav>
      <a className="mobile-claim" href="#claim">Submit</a>
    </header>

    <section id="top" className="intro">
      <div className="live-pill"><span>● {entries.length} runners</span> · {siteVisitors.toLocaleString()} visitors</div>
      <h1>Daily</h1>
      <p className="intro-copy">Who ran the furthest today? Link your public Strava Run, get verified, and put one link in front of the board.</p>
    </section>

    <section id="claim" className="claim-block">
      <form className="claim-form" onSubmit={save}>
        <label className="text-field"><input value={proofLink} onChange={(event) => setProofLink(event.target.value)} placeholder="Strava activity URL or embed snippet" type="text" required aria-label="Strava activity URL or embed snippet" /></label>
        <label className="url-field"><span aria-hidden="true">◎</span><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Your link — https://yourthing.com" type="url" required aria-label="Your link" /></label>
        <button className="claim-button" type="submit">{me?.entry ? "Update result" : "Publish result"}</button>
      </form>
      <div className="claim-subline"><span>Public Runs only · no account required</span><span>{status || "Distance is verified from the public activity."}</span></div>
    </section>

    <section id="board" className="board" aria-label="Daily running leaderboard">
      <div className="board-heading"><div><h2>{boardDate ? dateLabel(boardDate) : "Daily board"}</h2><p>Furthest verified Run wins the day.</p></div><span>Live · {entries.length} runners</span></div>
      <div className="ranking-list">
        {loading ? <div className="empty-state">Loading today’s runners…</div> : entries.length === 0 ? <div className="empty-state">No runs yet. Be the first on the board.</div> : entries.map((entry, index) => <div className={`rank-card card-${Math.min(index + 1, 3)}`} key={entry.id}>
          <span className="rank-badge">#{index + 1}</span>
          <a className="rank-copy" href={`/api/redirect/${entry.id}`} target="_blank" rel="noreferrer">
            <b>{entry.name} · {host(entry.link)}</b>
            <span>{entry.headline}</span>
            <small>{timeSince(entry.updatedAt)} · {entry.clicks.toLocaleString()} clicks · promote</small>
          </a>
          <strong className="rank-distance">{distance(entry.distanceKm)}</strong>
          {entry.proofLink && <a className="proof-link" href={entry.proofLink} target="_blank" rel="noreferrer">proof ↗</a>}
        </div>)}
      </div>
    </section>

    <footer><a href="#top" className="logo"><span className="logo-glyph"><i /><i /><i /></span>outrun.lol</a><span>Public proof · daily distance · tracked clicks</span></footer>
    {!me?.entry && <div className="demo-float"><button onClick={() => void demo()}>Try demo mode</button><small>Or load a sample result.</small></div>}
  </main>;
}
