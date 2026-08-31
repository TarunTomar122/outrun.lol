# outrun.lol

The daily running leaderboard. Connect Strava, total today’s running distance, and publish one link on the board.

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

Strava OAuth needs an app at [strava.com/settings/api](https://www.strava.com/settings/api). Set the callback to:

```text
http://localhost:3000/api/strava/callback
```

For Vercel, set the same variables with the production callback URL. `KV_REST_API_URL` and `KV_REST_API_TOKEN` are optional; without them, the app uses a process-local store suitable for the demo and local development. Add Vercel KV/Upstash REST persistence before inviting multiple people.

## Checks

```sh
npm run typecheck
npm run build
```
