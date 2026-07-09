// Fetches outdoor cycling rides from the Strava API and writes data/rides.json.
// Runs in GitHub Actions (see .github/workflows/strava.yml). No secrets live in
// this file — they are read from environment variables set by the workflow.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "data", "rides.json");

// ---- Challenge config (edit these to match your challenge) ----
const CONFIG = {
  targetMiles: Number(process.env.TARGET_MILES || 300),
  // Inclusive start/end dates (YYYY-MM-DD), interpreted in local time.
  startDate: process.env.START_DATE || "2026-07-01",
  endDate: process.env.END_DATE || "2026-07-31",
};

// Strava activity types that count as an outdoor ride.
const OUTDOOR_RIDE_TYPES = new Set([
  "Ride",
  "GravelRide",
  "MountainBikeRide",
  "EBikeRide",
]);

const METRES_PER_MILE = 1609.344;
const FEET_PER_METRE = 3.28084;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getAccessToken() {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("STRAVA_CLIENT_ID"),
      client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: requireEnv("STRAVA_REFRESH_TOKEN"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchActivities(accessToken, afterEpoch, beforeEpoch) {
  const activities = [];
  let page = 1;

  while (true) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", String(afterEpoch));
    url.searchParams.set("before", String(beforeEpoch));
    url.searchParams.set("per_page", "200");
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Activity fetch failed (${response.status}): ${detail}`);
    }

    const batch = await response.json();
    activities.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }

  return activities;
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toRide(activity) {
  return {
    id: activity.id,
    title: activity.name,
    date: activity.start_date_local.slice(0, 10),
    miles: round(activity.distance / METRES_PER_MILE, 1),
    elevationFt: round((activity.total_elevation_gain || 0) * FEET_PER_METRE),
    movingSeconds: activity.moving_time || 0,
    polyline: (activity.map && activity.map.summary_polyline) || "",
    url: `https://www.strava.com/activities/${activity.id}`,
  };
}

async function main() {
  const { startDate, endDate, targetMiles } = CONFIG;

  // Strava's before/after are exclusive epoch-second bounds. Pad by a day on
  // each side so rides on the first/last day aren't dropped by timezone offset.
  const afterEpoch = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000) - 86400;
  const beforeEpoch = Math.floor(new Date(`${endDate}T23:59:59Z`).getTime() / 1000) + 86400;

  const accessToken = await getAccessToken();
  const activities = await fetchActivities(accessToken, afterEpoch, beforeEpoch);

  const rides = activities
    .filter((a) => OUTDOOR_RIDE_TYPES.has(a.sport_type || a.type))
    .filter((a) => {
      const day = a.start_date_local.slice(0, 10);
      return day >= startDate && day <= endDate;
    })
    .map(toRide)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalMiles = round(
    rides.reduce((sum, ride) => sum + ride.miles, 0),
    1
  );

  const payload = {
    targetMiles,
    startDate,
    endDate,
    totalMiles,
    updatedAt: new Date().toISOString(),
    rides,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    `Wrote ${rides.length} rides totalling ${totalMiles} miles to data/rides.json`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
