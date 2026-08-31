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

const categories = ["All", "Road", "Trail", "Workout", "Treadmill", "Health", "Community", "Other"];

function distance(value: number) {
  return `${value.toFixed(1)} km`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function host(link: string) {
  try { return new URL(link).hostname.replace("www.", ""); } catch { return link; }
}

function timeSince(date: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}

function PeriodToggle({ period, onChange, className = "" }: { period: "today" | "all"; onChange: (value: "today" | "all") => void; className?: string }) {
  return <div className={`period-toggle ${className}`} role="tablist" aria-label="Leaderboard period">
    <button className={period === "all" ? "selected" : ""} onClick={() => onChange("all")} role="tab" aria-selected={period === "all"}>♜ All-time</button>
    <button className={period === "today" ? "selected today" : "today"} onClick={() => onChange("today")} role="tab" aria-selected={period === "today"}>● Today</button>
  </div>;
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [category, setCategory] = useState("All");
  const [period, setPeriod] = useState<"today" | "all">("today");
  const [targetDistance, setTargetDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState("");
  const [link, setLink] = useState("");
  const [headline, setHeadline] = useState("");
  const [profileCategory, setProfileCategory] = useState("Road");

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
    if (!window.localStorage.getItem("outrun-visit")) {
      window.localStorage.setItem("outrun-visit", "1");
      void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryId: "seed-1", event: "visit" }) });
    }
  }, [load]);

  const visibleEntries = useMemo(() => category === "All" ? entries : entries.filter((entry) => entry.category === category), [category, entries]);
  const top = entries.slice(0, 3);
  const topDistance = top[0]?.distanceKm ?? 0;
  const beatDistance = targetDistance ?? Number((topDistance + 0.1).toFixed(1));
  const visitorCount = entries.reduce((total, entry) => total + entry.visitors, 0);
  const runnerCount = entries.length;

  function changePeriod(value: "today" | "all") {
    setPeriod(value);
    if (value === "all") setStatus("All-time history starts when the first week is complete.");
  }

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

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-cluster">
        <a className="logo" href="#top" aria-label="outrun.lol home"><span className="logo-glyph"><i /><i /><i /></span>outrun.lol</a>
        <PeriodToggle period={period} onChange={changePeriod} className="period-desktop" />
      </div>
      <nav aria-label="Main navigation"><a className="active" href="#board">Leaderboard</a><a href="#daily">Daily</a><a href="#categories">Categories</a><a href="#about">About</a></nav>
      <div className="top-actions"><button aria-label="Search" className="icon-button">⌕</button><button aria-label="Switch to dark mode" className="icon-button">☾</button><a className="mobile-claim" href="#claim">Claim</a></div>
    </header>

    <section id="top" className="intro">
      <div className="live-pill"><span>● {runnerCount || 0} runners</span> · {visitorCount.toLocaleString()} visitors · <a href="#about">see stats→</a></div>
      <PeriodToggle period={period} onChange={changePeriod} className="period-mobile" />
      <h1>Claim #1 for <span className="stepper"><button aria-label="Lower distance to beat" onClick={() => setTargetDistance(Number(Math.max(0, beatDistance - 0.1).toFixed(1)))}>−</button><b>{distance(beatDistance)}</b><button aria-label="Raise distance to beat" onClick={() => setTargetDistance(Number((beatDistance + 0.1).toFixed(1)))}>+</button></span></h1>
      <p className="intro-copy">Run further than the rest, climb the daily board, and put one link in front of everyone who’s watching. Your distance decides the rank.</p>
    </section>

    <section id="claim" className="claim-block">
      <form onSubmit={save}>
        <label className="url-field"><span aria-hidden="true">◎</span><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Your link — https://yourthing.com" type="url" required aria-label="Your link" /></label>
        <label className="category-field"><select value={profileCategory} onChange={(event) => setProfileCategory(event.target.value)} aria-label="Category">{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select><span aria-hidden="true">⌄</span></label>
        <button className="claim-button" type="submit">{me?.connected ? "Publish spot" : "Claim rank"}</button>
      </form>
      <div className="claim-subline"><span>{me?.connected ? `Connected as ${me.athlete?.firstname ?? "runner"}` : "No payment. No followers. Just miles."}</span><span>{status || "Clicks and visitors are counted on every link."}</span></div>
    </section>

    <section id="categories" className="category-strip"><nav aria-label="Ranking categories">{categories.map((item) => <button className={category === item ? "selected" : ""} key={item} onClick={() => setCategory(item)}>{item === "All" && <span>⊞</span>}{item}</button>)}<button className="explore">Explore <span>›</span></button></nav></section>

    <section id="board" className="ranking-list" aria-label="Top runners">
      {loading ? <div className="empty-state">Loading today’s runners…</div> : top.map((entry, index) => <a className={`rank-card card-${index + 1}`} href={`/api/redirect/${entry.id}`} target="_blank" rel="noreferrer" key={entry.id}>
        <span className="rank-badge">#{index + 1}</span><span className="rank-avatar">{initials(entry.name)}</span><span className="rank-copy"><b>{entry.name} · {host(entry.link)}</b><span>{entry.headline}</span><small><strong>{entry.category}</strong> · {timeSince(entry.updatedAt)} · {host(entry.link)} · {entry.clicks.toLocaleString()} clicks · see details</small></span><strong className="rank-distance">{distance(entry.distanceKm)}</strong>
      </a>)}
    </section>

    <section id="daily" className="daily-preview">
      <div className="subsection-heading"><h2>Today’s top ranking</h2><a href="#board">See all</a></div>
      <div className="mini-grid">{top.map((entry, index) => <a className="mini-card" href={`/api/redirect/${entry.id}`} target="_blank" rel="noreferrer" key={entry.id}><span className="mini-rank">#{index + 1}</span><span className="mini-avatar">{initials(entry.name)}</span><span><b>{entry.name}</b><small>{entry.headline}</small><em>{distance(entry.distanceKm)}</em></span></a>)}</div>
    </section>

    <section className="activity"><h2><span /> Latest activity</h2><div className="activity-list">{entries.slice(0, 5).map((entry, index) => <a href={`/api/redirect/${entry.id}`} target="_blank" rel="noreferrer" key={`${entry.id}-activity`}><span>{entry.name} claimed #{index + 1}</span><small>{distance(entry.distanceKm)} · {timeSince(entry.updatedAt)}</small><b>↗</b></a>)}</div></section>

    <section id="about" className="about"><p>This <a href="#rules">simple side project</a> turns today’s running miles into a public place to be seen.</p><div id="rules" className="about-grid"><p><b>01</b> Connect Strava. We read your running activities for today only.</p><p><b>02</b> Your total distance sets your place. Ties go to the latest sync.</p><p><b>03</b> Add one link. Every click and visitor is counted.</p></div></section>
    <footer><a href="#top" className="logo"><span className="logo-glyph"><i /><i /><i /></span>outrun.lol</a><span>Built for the daily miles.</span><span><a href="#rules">Rules</a> · <a href="mailto:hello@outrun.lol">Say hello</a></span></footer>
    {!me?.connected && <div className="demo-float"><button onClick={() => void demo()}>Try demo mode</button>{!me?.configured && <small>Strava OAuth is ready — add app keys in Vercel to connect for real.</small>}</div>}
  </main>;
}
