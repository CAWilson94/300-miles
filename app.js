const rideGrid = document.querySelector("#ride-grid");
const template = document.querySelector("#ride-card-template");
const donut = document.querySelector("#progress-donut");
const donutFill = document.querySelector("#donut-fill");

const milesDone = document.querySelector("#miles-done");
const milesTarget = document.querySelector("#miles-target");
const milesLeft = document.querySelector("#miles-left");
const percentDone = document.querySelector("#percent-done");
const rideCount = document.querySelector("#ride-count");
const monthLabel = document.querySelector("#month-label");
const rideSummary = document.querySelector("#ride-summary");

const circumference = 2 * Math.PI * 100;

async function loadRideData() {
  const response = await fetch("data/rides.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load ride data: ${response.status}`);
  }

  return response.json();
}

function monthName(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatMiles(value) {
  return Number(value).toLocaleString("en-GB", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
}

function renderProgress(totalMiles, targetMiles, rides, month) {
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
  monthLabel.textContent = monthName(month);

  donut.setAttribute(
    "aria-label",
    `${formatMiles(totalMiles)} miles completed out of ${formatMiles(targetMiles)}`
  );

  rideSummary.textContent =
    rides.length === 1
      ? `1 ride logged for ${monthName(month)}.`
      : `${rides.length} rides logged for ${monthName(month)}.`;
}

function renderRides(rides) {
  rideGrid.textContent = "";

  if (rides.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "No rides have been added for this month yet. Add your first Strava embed in data/rides.json.";
    rideGrid.append(empty);
    return;
  }

  for (const ride of rides) {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector("h3").textContent = ride.title;
    card.querySelector(".date").textContent = formatDate(ride.date);
    card.querySelector(".distance").textContent = `${formatMiles(ride.miles)} mi`;

    const embedWrap = card.querySelector(".embed-wrap");

    if (isValidStravaEmbed(ride.embedUrl)) {
      const iframe = document.createElement("iframe");
      iframe.title = `Strava activity: ${ride.title}`;
      iframe.loading = "lazy";
      iframe.allowTransparency = "true";
      iframe.scrolling = "no";
      iframe.src = ride.embedUrl;
      embedWrap.append(iframe);
    } else {
      embedWrap.append(createEmbedPlaceholder());
    }

    rideGrid.append(card);
  }
}

function isValidStravaEmbed(url) {
  return /^https:\/\/www\.strava\.com\/activities\/\d+\/embed\/[a-zA-Z0-9]+/.test(
    url || ""
  );
}

function createEmbedPlaceholder() {
  const placeholder = document.createElement("div");
  placeholder.className = "embed-placeholder";
  placeholder.innerHTML = `
    <strong>Strava embed URL needed</strong>
    <span>Paste a Strava iframe src, or wire up Strava sync later.</span>
  `;
  return placeholder;
}

function ridesForMonth(rides, month) {
  return rides
    .filter((ride) => ride.date.startsWith(month))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

try {
  const data = await loadRideData();
  const activeMonth = data.month || new Date().toISOString().slice(0, 7);
  const targetMiles = Number(data.targetMiles || 300);
  const rides = ridesForMonth(data.rides || [], activeMonth);
  const totalMiles = rides.reduce((total, ride) => total + Number(ride.miles || 0), 0);

  renderProgress(totalMiles, targetMiles, rides, activeMonth);
  renderRides(rides);
} catch (error) {
  rideSummary.textContent = "Ride data could not be loaded.";
  rideGrid.innerHTML = `<p class="empty-state">${error.message}</p>`;
}
