"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Entry } from "@/lib/types";

type Me = {
  configured: boolean;
  connected: boolean;
  demo: boolean;
  athlete: { firstname: string; lastname?: string } | null;
  entry: Entry | null;
};

const categories = ["All", "Running", "Health", "Productivity", "Community", "Tools", "Writing"];

function distance(value: number) {
  return `${value.toFixed(1)} km`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function timeSince(date: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState("");
  const [link, setLink] = useState("");
  const [headline, setHeadline] = useState("");
  const [profileCategory, setProfileCategory] = useState("Running");

  const load = useCallback(async () => {
    const [leaderboard, profile] = await Promise.all([
      fetch("/api/leaderboard", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/me", { cache: "no-store" }).then((response) => response.json()),
    ]);
    setEntries(leaderboard.entries);
    setMe(profile);
    if (profile.entry) {
      setLink(profile.entry.link);
      setHeadline(profile.entry.headline);
      setProfileCategory(profile.entry.category);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (params.get("connected")) setStatus("Strava connected. Sync to update today’s distance.");
    if (error) setStatus(error === "strava-config" ? "Add Strava app keys in Vercel before connecting." : "Strava connection was not completed. Try again.");
    if (error || params.get("connected")) window.history.replaceState({}, "", window.location.pathname);
    const seen = window.localStorage.getItem("outrun-visit");
    if (!seen) {
      window.localStorage.setItem("outrun-visit", "1");
      void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryId: "seed-1", event: "visit" }) });
    }
  }, [load]);

  const visibleEntries = useMemo(() => category === "All" ? entries : entries.filter((entry) => entry.category === category), [category, entries]);
  const top = entries.slice(0, 3);
  const heroDistance = me?.entry?.distanceKm ?? top[0]?.distanceKm ?? 0;

  async function demo() {
    setStatus("Opening demo mode…");
    await fetch("/api/demo", { method: "POST" });
    await load();
    setStatus("Demo runner connected. Add a link below.");
  }

  async function sync() {
    setSyncing(true);
    setStatus("Syncing today’s runs…");
    const response = await fetch("/api/strava/sync", { method: "POST" });
    const result = await response.json();
    setSyncing(false);
    if (!response.ok) return setStatus(result.error ?? "Sync failed.");
    setStatus(result.demo ? "Demo distance synced." : `Synced ${distance(result.distanceKm)} from Strava.`);
    await load();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!me?.connected) return setStatus("Connect Strava before claiming a spot.");
    setStatus("Saving your spot…");
    const response = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ link, headline, category: profileCategory }) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error ?? "Could not save your spot.");
    setStatus("Your spot is live.");
    await load();
  }

  return (
    <main>
      <header className="site-header shell">
        <a className="wordmark" href="#top" aria-label="outrun.lol home"><span className="mark">↗</span> outrun.lol</a>
        <nav aria-label="Main navigation">
          <a className="active" href="#daily">Daily</a>
          <a href="#rules">Rules</a>
          <a href="#about">About</a>
        </nav>
        <a className="header-link" href="#claim">Claim your spot <span>→</span></a>
      </header>

      <div id="top" className="hero shell">
        <div className="eyebrow"><span className="live-dot" /> updated daily · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
        <h1>Run further.<br /><em>Move up.</em></h1>
        <p className="hero-copy">A public leaderboard for people who’d rather run than refresh. Connect Strava, log your distance, and put something you care about in front of everyone.</p>
        <div className="hero-metric">
          <span className="metric-number">{loading ? "—" : distance(heroDistance)}</span>
          <span className="metric-caption">your distance today<br /><b>{me?.connected ? "synced from Strava" : "connect to start climbing"}</b></span>
        </div>
        <div className="hero-actions">
          {me?.connected ? <button className="button primary" onClick={() => void sync()} disabled={syncing}>{syncing ? "Syncing…" : "↻ Sync Strava"}</button> : <a className="button primary" href="/api/strava/connect">Connect Strava <span>↗</span></a>}
          {!me?.connected && <button className="button secondary" onClick={() => void demo()}>Try demo mode</button>}
        </div>
        {status && <p className="status" role="status">{status}</p>}
        {!me?.configured && !me?.connected && <p className="setup-note">Live Strava OAuth is ready. Add your Strava app keys in Vercel to enable it here.</p>}
      </div>

      <section id="daily" className="shell section leaderboard-section">
        <div className="section-heading"><div><span className="section-kicker">01 / The daily board</span><h2>Today’s top runners</h2></div><span className="section-note">Board resets at midnight<br />UTC</span></div>
        <div className="podium">
          {top.map((entry, index) => <a className={`podium-card rank-${index + 1}`} href={`/api/redirect/${entry.id}`} target="_blank" rel="noreferrer" key={entry.id}>
            <span className="rank">0{index + 1}</span><span className="arrow">↗</span><span className="avatar">{initials(entry.name)}</span><span className="podium-name">{entry.name}</span><span className="podium-distance">{distance(entry.distanceKm)}</span><span className="podium-headline">{entry.headline}</span><span className="podium-link">{new URL(entry.link).hostname.replace("www.", "")}</span>
          </a>)}
        </div>
      </section>

      <section id="claim" className="shell claim-section section">
        <div className="section-heading"><div><span className="section-kicker">02 / Your turn</span><h2>Put your link on the board</h2></div><span className="section-note">Your distance decides rank.<br />Your link gets the attention.</span></div>
        <form className="claim-form" onSubmit={save}>
          <label><span>Your link</span><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://yourthing.com" type="url" required /></label>
          <label><span>One-line pitch</span><input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="What are you building?" maxLength={180} /></label>
          <label className="small-field"><span>Category</span><select value={profileCategory} onChange={(event) => setProfileCategory(event.target.value)}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
          <button className="button primary" type="submit">{me?.connected ? "Publish your spot" : "Connect to publish"} <span>→</span></button>
        </form>
        <div className="claim-foot"><span>{me?.connected ? `Connected as ${me.athlete?.firstname ?? "runner"}` : "No payment. No followers. Just miles."}</span><span>Clicks and visitors are counted on every link.</span></div>
      </section>

      <section className="shell section board-section">
        <div className="filter-row"><div className="filters" role="group" aria-label="Filter leaderboard">{categories.map((item) => <button className={category === item ? "selected" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="entry-count">{visibleEntries.length} runners</span></div>
        <div className="board" aria-live="polite">{visibleEntries.map((entry, index) => <a className="board-row" href={`/api/redirect/${entry.id}`} target="_blank" rel="noreferrer" key={entry.id}><span className="row-rank">{String(index + 1).padStart(2, "0")}</span><span className="row-avatar">{initials(entry.name)}</span><span className="row-name"><b>{entry.name}</b><small>{entry.headline}</small></span><span className="row-category">{entry.category}</span><span className="row-distance">{distance(entry.distanceKm)}</span><span className="row-clicks">{entry.clicks.toLocaleString()} clicks</span><span className="row-time">{timeSince(entry.updatedAt)}</span><span className="row-arrow">↗</span></a>)}</div>
      </section>

      <section id="rules" className="shell info-section section"><div><span className="section-kicker">03 / Rules</span><h2>Simple enough to explain<br />on a run.</h2></div><div className="rule-list"><p><b>01</b><span>Connect your Strava account. We read your running activities for today only.</span></p><p><b>02</b><span>Your total running distance sets your place on the daily board. Ties go to the latest sync.</span></p><p><b>03</b><span>Add one link. Every visit and click is counted so you know if the attention was worth it.</span></p></div></section>

      <footer id="about" className="site-footer shell"><span>outrun.lol <i>↗</i></span><span>Built for the daily miles.</span><span><a href="#rules">Rules</a> · <a href="mailto:hello@outrun.lol">Say hello</a></span></footer>
    </main>
  );
}
