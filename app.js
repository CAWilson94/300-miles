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
