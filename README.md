# outrun.lol

The daily running leaderboard. Link a public Strava activity, verify today’s running distance, and publish one link on the board.

The launch flow does not require an account or Strava API credentials. A runner submits a public activity URL; the server reads the activity from Strava’s embed page and only accepts a Run dated today. The promotion link is tracked separately.

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

The proof verifier accepts full activity URLs such as `https://www.strava.com/activities/1234567890`. The activity must be public and embeddable. Strava’s mobile `strava.app.link` short links do not contain the activity ID, so copy the full activity URL from the web app when submitting proof.

The optional Strava OAuth connector needs an app at [strava.com/settings/api](https://www.strava.com/settings/api). Set the callback to:

```text
http://localhost:3000/api/strava/callback
```

For Vercel, set `STRAVA_REDIRECT_URI` to `https://outrunlol.vercel.app/api/strava/callback` (or your custom domain) only if enabling the optional connector. `KV_REST_API_URL` and `KV_REST_API_TOKEN` are optional; without them, the app uses a process-local store suitable for the demo and local development. Add Vercel KV/Upstash REST persistence before inviting multiple people.

## Checks

```sh
npm run typecheck
npm run build
```
