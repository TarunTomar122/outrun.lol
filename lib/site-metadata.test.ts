import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMetadata } from "./site-metadata.ts";

const base = new URL("https://example.com/");

test("reads og tags, decodes entities, resolves relative icon", () => {
  const html = `
    <meta property="og:site_name" content="Acme &amp; Co">
    <meta property="og:description" content="Fast &amp; simple">
    <link rel="icon" href="/icon.svg">`;
  assert.deepEqual(parseMetadata(html, base), {
    siteName: "Acme & Co",
    headline: "Fast & simple",
    siteLogo: "https://example.com/icon.svg",
  });
});

test("prefers apple-touch-icon over a plain favicon", () => {
  const html = `<link rel="icon" href="/fav.ico"><link rel="apple-touch-icon" href="/touch.png">`;
  assert.equal(parseMetadata(html, base).siteLogo, "https://example.com/touch.png");
});

test("falls back through description then og:image then /favicon.ico", () => {
  const html = `<meta name="description" content="Plain desc"><meta property="og:image" content="https://cdn.x/og.png">`;
  const result = parseMetadata(html, base);
  assert.equal(result.headline, "Plain desc");
  assert.equal(result.siteLogo, "https://cdn.x/og.png");
  assert.equal(parseMetadata("<html></html>", base).siteLogo, "https://example.com/favicon.ico");
});
