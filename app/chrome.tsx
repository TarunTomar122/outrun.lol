"use client";

import { useEffect, useState } from "react";

export function BrandMark() {
  return <svg className="brand-mark" viewBox="0 0 40 30" fill="none" aria-hidden="true"><path className="brand-speed" d="M3 24h12M3 17h17M7 10h11" /><circle className="brand-runner" cx="29" cy="5" r="2.5" fill="currentColor" /><path className="brand-runner" d="m27 10 5 3-4 6 5 3m-6-11 7-3m-1 14 4 5m-4-5-7 5" /></svg>;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.getAttribute("data-theme") === "dark"), []);
  function toggle() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch { /* private mode */ }
    setDark(next === "dark");
  }
  return <button className="theme-toggle" type="button" onClick={toggle} aria-label="Toggle dark mode" aria-pressed={dark}>
    {dark
      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>}
  </button>;
}

export function SiteHeader({ active }: { active?: "rules" }) {
  return <header className="topbar">
    <a className="logo" href="/" aria-label="outrunn.lol home"><BrandMark />outrunn.lol</a>
    <div className="header-actions">
      <a className={`header-link${active === "rules" ? " active" : ""}`} href="/rules">Rules</a>
      <ThemeToggle />
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer>
    <div className="footer-top">
      <a href="/" className="logo"><BrandMark />outrunn.lol</a>
      <span>Public proof · daily distance · tracked clicks</span>
    </div>
    <div className="footer-credit">
      <span>Built by</span>
      <a className="credit-link" href="https://x.com/tarat_211" target="_blank" rel="noreferrer">
        <svg className="credit-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        @tarat_211
      </a>
      <span className="credit-dot" aria-hidden="true">·</span>
      <a className="credit-link" href="https://tarat.space" target="_blank" rel="noreferrer"><span aria-hidden="true">🌿</span> tarat.space</a>
    </div>
  </footer>;
}
