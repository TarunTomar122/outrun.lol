# outrunn.lol

The daily running leaderboard. Link a public Strava activity, verify today’s running distance, and publish one link on the board.

The launch flow does not require an account or Strava API credentials. A runner submits a public activity URL; the server reads the activity from Strava’s embed page and only accepts a Run dated today. The promotion link is tracked separately.

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

The proof verifier accepts full activity URLs such as `https://www.strava.com/activities/1234567890` and Strava embed snippets containing `data-embed-id` and `data-token`. The activity must be public and embeddable. Strava’s mobile `strava.app.link` short links do not contain the activity ID, so copy the full activity URL or embed snippet when submitting proof.

The optional Strava OAuth connector needs an app at [strava.com/settings/api](https://www.strava.com/settings/api). Set the callback to:

```text
http://localhost:3000/api/strava/callback
```

For Vercel, set `STRAVA_REDIRECT_URI` to `https://outrunn.lol/api/strava/callback` (or your Vercel URL) only if enabling the optional connector. Attach an Upstash Redis database through Vercel Marketplace for durable leaderboard and click-count storage. Without Redis variables, the app falls back to process memory for local development.

## Deployment

- Repository: <https://github.com/TarunTomar122/outrun.lol>
- Production: <https://outrunlol.vercel.app>
- Custom domain: <https://outrunn.lol> (pending DNS configuration)
- Vercel project: <https://vercel.com/yourtraceonline-5491s-projects/outrun.lol>

### DNS

The custom domain is attached to Vercel. Add this record at the domain registrar:

```text
A  outrunn.lol  76.76.21.21
```

Vercel nameservers can be used instead:

```text
ns1.vercel-dns.com
ns2.vercel-dns.com
```

The domain will resolve after the registrar applies either configuration.

### Storage and click tracking

The Vercel project uses Upstash Redis through the Vercel Marketplace. The integration provides the Redis REST URL and token as environment variables. Secret values stay in Vercel and `.env.local`; they must never be committed.

The app accepts the project-prefixed `outrun_KV_REST_API_URL` and `outrun_KV_REST_API_TOKEN` variables, plus the standard `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` names. Redis stores the daily entries and click counts. Without Redis variables, local development uses process memory and resets counts on restart.

Each leaderboard promotion link goes through `/api/redirect/[id]`. The route atomically increments that entry’s daily click count, then returns a `307` redirect to the destination. Outrun tracks outbound clicks only; visitor analytics on the promoted sites belong to those sites.

### Daily board

The board date uses `Asia/Kolkata`, so a new board starts at 12:00 AM IST. No cron job is needed: date-scoped storage keys switch automatically on the first request after midnight.

### Local server

```sh
npm install
npm run dev
```

If port 3000 is occupied:

```sh
PORT=3001 npm run dev
```

Open <http://localhost:3000> or <http://localhost:3001>.

### Deploy

```sh
vercel --prod --yes
```

## Checks

```sh
npm run typecheck
npm run build
```
