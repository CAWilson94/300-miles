const rideGrid = document.querySelector("#ride-grid");
const template = document.querySelector("#ride-card-template");
const donut = document.querySelector("#progress-donut");
const donutFill = document.querySelector("#donut-fill");

const milesDone = document.querySelector("#miles-done");
const milesTarget = document.querySelector("#miles-target");
const milesLeft = document.querySelector("#miles-left");
const percentDone = document.querySelector("#percent-done");
const rideCount = document.querySelector("#ride-count");
const rangeLabel = document.querySelector("#month-label");
const rideSummary = document.querySelector("#ride-summary");

const circumference = 2 * Math.PI * 100;

async function loadRideData() {
  const response = await fetch("data/rides.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load ride data: ${response.status}`);
  }

  return response.json();
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatRange(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();

  const startFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(start);

  const endFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(end);

  return `${startFmt} – ${endFmt}`;
}

function formatMiles(value) {
  return Number(value).toLocaleString("en-GB", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
}

function formatDuration(totalSeconds) {
  const minutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// Decodes a Google/Strava encoded polyline into [lat, lng] pairs.
function decodePolyline(str) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords = [];

  while (index < str.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}

// Builds an SVG route outline from an encoded polyline, or null if unusable.
function buildRouteSvg(polyline) {
  if (!polyline) return null;
  const points = decodePolyline(polyline);
  if (points.length < 2) return null;

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Equirectangular projection — accurate enough over a single ride.
  const cos = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const projected = points.map(([la, ln]) => [
    (ln - minLng) * cos,
    maxLat - la, // flip so north is up
  ]);

  const width = Math.max(...projected.map((p) => p[0])) || 1;
  const height = Math.max(...projected.map((p) => p[1])) || 1;

  const W = 320;
  const H = 150;
  const pad = 16;
  const scale = Math.min((W - 2 * pad) / width, (H - 2 * pad) / height);
  const offsetX = (W - width * scale) / 2;
  const offsetY = (H - height * scale) / 2;

  const d = projected
    .map(([x, y], i) => {
      const px = (offsetX + x * scale).toFixed(1);
      const py = (offsetY + y * scale).toFixed(1);
      return `${i === 0 ? "M" : "L"}${px} ${py}`;
    })
    .join(" ");

  const [sx, sy] = [
    (offsetX + projected[0][0] * scale).toFixed(1),
    (offsetY + projected[0][1] * scale).toFixed(1),
  ];

  return (
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">` +
    `<path d="${d}" fill="none" stroke="var(--pink)" stroke-width="3" ` +
    `stroke-linejoin="round" stroke-linecap="round"></path>` +
    `<circle cx="${sx}" cy="${sy}" r="4" fill="var(--pink)"></circle>` +
    `</svg>`
  );
}

function renderProgress(totalMiles, targetMiles, rides, startDate, endDate) {
  const progress = targetMiles > 0 ? Math.min(totalMiles / targetMiles, 1) : 0;
  const percent = Math.round(progress * 100);
  const remaining = Math.max(targetMiles - totalMiles, 0);

  donutFill.style.strokeDasharray = `${circumference}`;
  donutFill.style.strokeDashoffset = `${circumference * (1 - progress)}`;

  milesDone.textContent = formatMiles(totalMiles);
  milesTarget.textContent = `/ ${formatMiles(targetMiles)}`;
  milesLeft.textContent = formatMiles(remaining);
  percentDone.textContent = `${percent}%`;
  rideCount.textContent = rides.length.toString();

  if (startDate && endDate) {
    rangeLabel.textContent = formatRange(startDate, endDate);
  }

  donut.setAttribute(
    "aria-label",
    `${formatMiles(totalMiles)} miles completed out of ${formatMiles(targetMiles)}`
  );

  rideSummary.textContent =
    rides.length === 1
      ? "1 ride logged so far."
      : `${rides.length} rides logged so far.`;
}

function renderRides(rides) {
  rideGrid.textContent = "";

  if (rides.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "No rides logged yet — check back once the first one's in.";
    rideGrid.append(empty);
    return;
  }

  for (const ride of rides) {
    const card = template.content.firstElementChild.cloneNode(true);

    const route = card.querySelector(".route");
    const routeSvg = buildRouteSvg(ride.polyline);
    if (routeSvg) {
      route.innerHTML = routeSvg;
    } else {
      route.remove();
    }

    card.querySelector("h3").textContent = ride.title;
    card.querySelector(".date").textContent = formatDate(ride.date);
    card.querySelector(".distance").textContent = `${formatMiles(ride.miles)} mi`;

    const elev = card.querySelector(".elev");
    const time = card.querySelector(".time");
    elev.textContent =
      ride.elevationFt != null
        ? `${Number(ride.elevationFt).toLocaleString("en-GB")} ft`
        : "—";
    time.textContent =
      ride.movingSeconds != null ? formatDuration(ride.movingSeconds) : "—";

    const link = card.querySelector(".ride-link");
    if (ride.url) {
      link.href = ride.url;
    } else {
      link.remove();
    }

    rideGrid.append(card);
  }
}

try {
  const data = await loadRideData();
  const targetMiles = Number(data.targetMiles || 300);
  const rides = (data.rides || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalMiles =
    data.totalMiles != null
      ? Number(data.totalMiles)
      : rides.reduce((total, ride) => total + Number(ride.miles || 0), 0);

  renderProgress(totalMiles, targetMiles, rides, data.startDate, data.endDate);
  renderRides(rides);
} catch (error) {
  rideSummary.textContent = "Ride data could not be loaded.";
  rideGrid.innerHTML = `<p class="empty-state">${error.message}</p>`;
}
