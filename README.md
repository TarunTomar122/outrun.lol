# outrunn.lol

**Promote your product by going for a run.**

A leaderboard for founders who run. Link a public Strava run, get it verified,
and your product link rides the board for 7 days. Furthest verified run sits at
#1, so the harder you run, the more people see your thing. One run, a whole week
of free traffic.

No account. No Strava API key. No paywall. Just run.

## Demo

- **Try it live:** https://outrunn.lol
- **Watch the 30s walkthrough:** https://outrunn.lol/how-to-submit.mp4

## How it works

- **Verified from Strava, no API key.** Paste a public Strava run (full activity
  URL, mobile `strava.app.link` share link, or embed snippet). The server reads
  distance, type, and date straight from Strava's public embed. No login, no
  OAuth, no account.
- **Runs from the last 7 days count**, and each run holds its spot on the board
  for 7 days from when it was submitted, then drops off. Run again to refresh it.
- **Your link, auto-branded.** Site name, logo, and tagline are scraped from the
  link you submit, so there's nothing to fill in.
- **Climb by going further.** To take a rank, post a run just 0.1 km longer than
  the entry above you.
- **One run, one link.** The same activity can't be reused to claim two spots.
- **Outbound clicks are tracked** per entry and shown on the board.

Runs must be **public and embeddable** (activity visibility set to Everyone, and
a public profile). Private or followers-only runs need the desktop embed snippet,
which carries an access token.

## Tech

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Upstash Redis](https://upstash.com) for the board, click counts, and visits
  (optional — falls back to in-memory storage for local dev)
- Zero UI dependencies; hand-rolled CSS and a tiny canvas confetti

## Run it locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 (or set `PORT=3001` if that port is busy).

### Environment

Everything works with no config — without Redis the app keeps the board in
process memory (counts reset on restart). For durable, shared storage, add an
Upstash Redis database and set either the `outrun_KV_REST_API_URL` /
`outrun_KV_REST_API_TOKEN` pair or the standard `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` names.

Set `SESSION_SECRET` to any random string for signed sessions.

The Strava OAuth connector is optional (the core flow needs no Strava app). To
enable it, create an app at [strava.com/settings/api](https://www.strava.com/settings/api)
with callback `http://localhost:3000/api/strava/callback` and set the client id,
secret, and redirect uri env vars.

## Checks

```sh
npm run typecheck
npm run build
node --test lib/*.test.ts  # unit tests for parsing + retention
```

## Contributing

It's a small, free, open-source side project — issues and PRs are very welcome.
Good first things to poke at: the Strava proof parser (`lib/strava-proof.ts`),
site-metadata scraping (`lib/site-metadata.ts`), and the rolling-board store
(`lib/store.ts`).

## License

MIT. See [LICENSE](LICENSE).
