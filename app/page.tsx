"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useState } from "react";
import type { Entry } from "@/lib/types";

type Me = { entry: Entry | null };
type Feedback = { tone: "info" | "success" | "error"; title: string; detail: string };

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

function logoFallback(link: string) {
  return host(link).split(".")[0].slice(0, 2).toUpperCase();
}

function BrandMark() {
  return <svg className="brand-mark" viewBox="0 0 40 30" fill="none" aria-hidden="true"><path className="brand-speed" d="M3 24h12M3 17h17M7 10h11" /><circle className="brand-runner" cx="29" cy="5" r="2.5" fill="currentColor" /><path className="brand-runner" d="m27 10 5 3-4 6 5 3m-6-11 7-3m-1 14 4 5m-4-5-7 5" /></svg>;
}

function SiteLogo({ entry }: { entry: Entry }) {
  const [failed, setFailed] = useState(false);
  if (entry.siteLogo && !failed) return <img className="site-logo" src={entry.siteLogo} alt="" width="42" height="42" onError={() => setFailed(true)} />;
  return <span className="site-logo site-logo-fallback" aria-hidden="true">{logoFallback(entry.link)}</span>;
}

function timeSince(date: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function failureFeedback(result: { code?: string; error?: string; activityDate?: string; expectedDate?: string }): Feedback {
  if (result.code === "wrong-day" && result.activityDate) {
    const yesterday = result.expectedDate && Date.parse(`${result.expectedDate}T00:00:00Z`) - Date.parse(`${result.activityDate}T00:00:00Z`) === 86_400_000;
    return { tone: "error", title: yesterday ? "That Run was yesterday." : `That Run was on ${dateLabel(result.activityDate)}.`, detail: `Submit a Run from ${result.expectedDate ? dateLabel(result.expectedDate) : "today"} to join this board.` };
  }
  const messages: Record<string, Feedback> = {
    invalid: { tone: "error", title: "That proof link needs a check.", detail: "Paste a full Strava activity URL or the complete embed snippet." },
    unavailable: { tone: "error", title: "We couldn’t open that activity.", detail: "Make sure the activity is public and embeddable, then try again." },
    "not-run": { tone: "error", title: "That activity isn’t a Run.", detail: "Link a Strava Run to join today’s board." },
    "no-distance": { tone: "error", title: "Distance wasn’t available.", detail: "Use a Run with a visible distance in its Strava embed." },
    "date-unavailable": { tone: "error", title: "We couldn’t confirm the date.", detail: "Try the full activity URL or a fresh embed snippet." },
    "run-claimed": { tone: "error", title: "That run is already on the board.", detail: "Each Strava run holds one link. Post a different run to claim a spot." },
  };
  return messages[result.code ?? ""] ?? { tone: "error", title: "We couldn’t verify that activity.", detail: result.error ?? "Try a public Run from today." };
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [boardDate, setBoardDate] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [proofLink, setProofLink] = useState("");
  const [link, setLink] = useState("");
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [leaderboard, profile] = await Promise.all([
        fetch("/api/leaderboard", { cache: "no-store" }).then((response) => response.json()),
        fetch("/api/me", { cache: "no-store" }).then((response) => response.json()),
      ]);
      setEntries(leaderboard.entries);
      setBoardDate(leaderboard.date);
      setMe(profile);
      if (profile.entry) {
        setProofLink(profile.entry.proofLink ?? "");
        setLink(profile.entry.link);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback({ tone: "info", title: "Checking your Run…", detail: "We’re reading the activity, date, and distance from Strava." });
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proofLink, link }),
      });
      const result = await response.json() as { entry?: Entry; error?: string; code?: string; activityDate?: string; expectedDate?: string };
      if (!response.ok) {
        setFeedback(failureFeedback(result));
        return;
      }
      await load();
      setFeedback({ tone: "success", title: "You’re on today’s board.", detail: `${result.entry?.name ?? "Your result"} · ${result.entry ? distance(result.entry.distanceKm) : "Distance verified"}. Your link is live.` });
    } catch {
      setFeedback({ tone: "error", title: "The check timed out.", detail: "Strava took too long to respond. Try again in a moment." });
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="logo" href="#top" aria-label="outrunn.lol home"><BrandMark />outrunn.lol</a>
    </header>

    <section id="top" className="intro">
      <div className="live-pill"><span>{entries.length} runners</span></div>
      <h1>{entries.length ? <>Run <span className="accent">{distance(entries[0].distanceKm + 1)}</span> and claim <span className="accent">#1</span>.</> : <>Post any Run today and claim <span className="accent">#1</span>.</>}</h1>
      <p className="intro-copy">Link your public Strava Run, get verified, and put one link in front of the board.</p>
    </section>

    <section id="claim" className="claim-block">
      <form className="claim-form" onSubmit={save}>
        <label className="text-field"><input value={proofLink} onChange={(event) => setProofLink(event.target.value)} placeholder="Strava activity URL or embed snippet" type="text" required aria-label="Strava activity URL or embed snippet" /></label>
        <label className="url-field"><span aria-hidden="true">◎</span><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Your link — https://yourthing.com" type="url" required aria-label="Your link" /></label>
        <button className="claim-button" type="submit" disabled={submitting}>{submitting ? "Checking…" : me?.entry ? "Update result" : "Claim #1"}</button>
      </form>
      {feedback && <div className={`feedback feedback-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"} aria-live="polite"><span className="feedback-mark" aria-hidden="true">{feedback.tone === "success" ? "✓" : feedback.tone === "error" ? "!" : "…"}</span><div><strong>{feedback.title}</strong><p>{feedback.detail}</p></div><button className="feedback-dismiss" type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">×</button></div>}
      <div className="claim-subline"><span>Public Runs only · no account required</span><span>Distance is verified from the public activity.</span></div>
    </section>

    <section id="board" className="board" aria-label="Daily running leaderboard">
      <div className="board-heading"><div><h2>Daily</h2><p>{boardDate ? dateLabel(boardDate) : "Today"} · Furthest verified Run wins the day.</p></div><span>Live · {entries.length} runners</span></div>
      <div className="ranking-list">
        {loading ? Array.from({ length: 3 }, (_, index) => <div className="rank-card skeleton" key={index} aria-hidden="true"><span className="sk sk-badge" /><span className="sk sk-logo" /><div className="sk-copy"><span className="sk sk-line" /><span className="sk sk-line short" /><span className="sk sk-line tiny" /></div><span className="sk sk-distance" /></div>) : loadError ? <div className="empty-state empty-error"><p>The board didn’t load.</p><button type="button" className="retry-button" onClick={() => { setLoading(true); void load(); }}>Try again</button></div> : entries.length === 0 ? <div className="empty-state">No runs yet. Be the first on the board.</div> : entries.map((entry, index) => <div className={`rank-card card-${Math.min(index + 1, 3)}`} style={{ "--i": index } as CSSProperties} key={entry.id}>
          <span className="rank-badge">#{index + 1}</span>
          <SiteLogo entry={entry} />
          <a className="rank-copy" href={`/api/redirect/${entry.id}`} target="_blank" rel="noreferrer">
            <b>{host(entry.link)}</b>
            <span>{entry.headline}</span>
            <small>{timeSince(entry.updatedAt)} · {entry.clicks.toLocaleString()} clicks</small>
          </a>
          <strong className="rank-distance">{distance(entry.distanceKm)}</strong>
          {entry.proofLink && <a className="proof-link" href={entry.proofLink} target="_blank" rel="noreferrer">proof ↗</a>}
        </div>)}
      </div>
    </section>

    <footer><a href="#top" className="logo"><BrandMark />outrunn.lol</a><span>Public proof · daily distance · tracked clicks</span></footer>
  </main>;
}
