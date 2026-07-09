# 300 Miles for Cancer Research UK

A small static site that tracks my progress cycling 300 miles for Cancer
Research UK. It shows a progress ring, headline stats, a donation link, and a
list of recent rides — all pulled automatically from Strava.

The site is plain HTML, CSS, and JavaScript with no build step, so it runs
happily on GitHub Pages. Ride data is refreshed by a scheduled GitHub Action
that talks to the Strava API, so no secrets ever live in the page itself.

## How it fits together

| File | What it does |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | All styling |
| `app.js` | Reads `data/rides.json` and renders the ring, stats, and ride cards |
| `data/rides.json` | The ride data the page displays (written by the Action) |
| `scripts/fetch-strava.mjs` | Fetches rides from Strava and writes `data/rides.json` |
| `.github/workflows/strava.yml` | Runs the fetch script on a schedule and commits the result |
| `profile.jpg` | Profile photo shown in the header |

## Changing the challenge (dates, target, distance)

Everything you'll want to tweak lives in the `env:` block near the top of
`.github/workflows/strava.yml`:

```yaml
TARGET_MILES: "300"       # the goal
START_DATE: "2026-07-01"  # first day that counts (inclusive)
END_DATE: "2026-07-31"    # last day that counts (inclusive)
```

Edit those, commit, and the next run picks them up. Only outdoor cycling
counts (Ride, GravelRide, MountainBikeRide, EBikeRide); virtual/turbo rides are
excluded. To change that, edit `OUTDOOR_RIDE_TYPES` in `scripts/fetch-strava.mjs`.

## One-time Strava setup

The Action needs three values, stored as encrypted repository secrets (never in
the code). In GitHub: **Settings → Secrets and variables → Actions → New
repository secret**:

- `STRAVA_CLIENT_ID` — from your Strava API application
- `STRAVA_CLIENT_SECRET` — from your Strava API application
- `STRAVA_REFRESH_TOKEN` — from authorising the app with the `activity:read`
  scope (use `activity:read_all` if you want private/followers-only rides to
  count)

The short-lived access token is **not** stored — the Action mints a fresh one
each run using the refresh token.

## Running the update

- **Automatically:** the workflow runs every 6 hours.
- **Manually:** GitHub **Actions** tab → **Update Strava ride data** → **Run
  workflow**. Use this for the first run so the page has real data straight away.

If a run comes back with zero rides, the usual cause is the refresh token not
having the `activity:read` scope.

## Publishing with GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment.**
3. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Save, then open the URL GitHub gives you.

An empty `.nojekyll` file is included so Pages serves the files as-is without
running Jekyll.

## Running locally

Serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Locally the page shows whatever is in
`data/rides.json` (sample data until the Action has run for real).
