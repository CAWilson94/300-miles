# Monthly Strava Cycling Progress

A small static site for GitHub Pages. It shows:

- a monthly progress banner with a donut indicator
- miles completed out of a configurable monthly target
- a donation link for the Cancer Research UK challenge
- one embedded Strava card for each ride in the month

## Update Your Rides

Edit `data/rides.json`.

```json
{
  "month": "2026-07",
  "targetMiles": 300,
  "rides": [
    {
      "title": "Richmond Park laps",
      "date": "2026-07-09",
      "miles": 31.4,
      "embedUrl": "https://www.strava.com/activities/YOUR_ACTIVITY_ID/embed/YOUR_EMBED_TOKEN"
    }
  ]
}
```

To get the Strava `embedUrl`, open a public activity on Strava, choose Share,
copy the embed code, and paste only the `src` URL from the iframe.

## Linking Strava Automatically

The current GitHub Pages version is static, so it cannot privately connect to
Strava by itself in the browser. Automatic ride updates need one extra piece:

- a Strava API app
- your Strava refresh token
- a scheduled GitHub Action or small backend that fetches activities
- a script that updates `data/rides.json` and commits the result

That keeps your Strava token out of the public website while still letting the
published page stay on GitHub Pages.

## Run Locally

Use any static web server from the project folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish With GitHub Pages

1. Create a new GitHub repository.
2. Push these files to the repository.
3. In GitHub, open Settings > Pages.
4. Set the source to Deploy from a branch.
5. Choose the `main` branch and `/root` folder.
6. Save, then open the Pages URL GitHub gives you.

Every time you update `data/rides.json` and push to `main`, GitHub Pages will
update the public page.
