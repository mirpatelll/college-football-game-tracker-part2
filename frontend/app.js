/* 
   CONFIG
*/

// Render backend (KEEP THIS)
const API_BASE = "https://college-football-game-tracker-part2.onrender.com/api";

/* =========================
   DOM
========================= */
const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

const gamesTbody = document.getElementById("gamesTbody");
const countLabel = document.getElementById("countLabel");
const pageLabel = document.getElementById("pageLabel");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const listMsg = document.getElementById("listMsg");

const searchInput = document.getElementById("searchInput");
const filterResult = document.getElementById("filterResult");

const gameForm = document.getElementById("gameForm");
const formTitle = document.getElementById("formTitle");
const formMsg = document.getElementById("formMsg");
const cancelBtn = document.getElementById("cancelBtn");

const gameId = document.getElementById("gameId");
const team = document.getElementById("team");
const opponent = document.getElementById("opponent");
const homeAway = document.getElementById("homeAway");
const week = document.getElementById("week");
const pointsFor = document.getElementById("pointsFor");
const pointsAgainst = document.getElementById("pointsAgainst");
const result = document.getElementById("result");

const teamErr = document.getElementById("teamErr");
const opponentErr = document.getElementById("opponentErr");
const homeAwayErr = document.getElementById("homeAwayErr");
const weekErr = document.getElementById("weekErr");
const pointsForErr = document.getElementById("pointsForErr");
const pointsAgainstErr = document.getElementById("pointsAgainstErr");
const resultErr = document.getElementById("resultErr");

const statTotalGames = document.getElementById("statTotalGames");
const statWL = document.getElementById("statWL");
const statAvgPF = document.getElementById("statAvgPF");
const statHighPF = document.getElementById("statHighPF");
const statHighPFDetail = document.getElementById("statHighPFDetail");
const statsMsg = document.getElementById("statsMsg");

/* =========================
   STATE
========================= */
let currentPage = 1;
let totalRecords = 0;
let lastQuery = "";
let lastResultFilter = "ALL";
let PAGE_SIZE = 10;

/* =========================
   HELPERS
========================= */
function showView(viewId) {
  views.forEach(v => v.classList.toggle("active", v.id === viewId));
  tabs.forEach(t => t.classList.toggle("active", t.dataset.view === viewId));

  if (viewId === "listView") loadPage(1);
  if (viewId === "statsView") loadStats();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function titleCaseWords(s) {
  return String(s ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function clearErrors() {
  [teamErr, opponentErr, homeAwayErr, weekErr, pointsForErr, pointsAgainstErr, resultErr]
    .forEach(e => e.textContent = "");
}

/* =========================
   API
========================= */
async function apiGet(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

async function apiSend(url, method, bodyObj) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

/* =========================
   LIST + PAGING
========================= */
async function loadPage(page) {
  currentPage = page;
  listMsg.textContent = "Loading...";

  const params = new URLSearchParams({
    page: currentPage,
    page_size: PAGE_SIZE
  });

  if (lastQuery) params.set("q", lastQuery);
  if (lastResultFilter !== "ALL") params.set("result", lastResultFilter);

  try {
    const data = await apiGet(`${API_BASE}/games?${params.toString()}`);
    totalRecords = data.total;
    renderTable(data.items);
    updatePaging();
    countLabel.textContent = `Showing ${data.items.length} of ${data.total}`;
    listMsg.textContent = "";
  } catch (err) {
    listMsg.textContent = err.message;
  }
}

function updatePaging() {
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function renderTable(items) {
  gamesTbody.innerHTML = "";

  items.forEach(g => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.week}</td>
      <td>${escapeHtml(g.team)}</td>
      <td>${escapeHtml(g.opponent)}</td>
      <td>${g.homeAway}</td>
      <td>${g.pointsFor}</td>
      <td>${g.pointsAgainst}</td>
      <td><b>${g.result}</b></td>
      <td>
        <button data-id="${g.id}">Edit</button>
        <button data-id="${g.id}">Delete</button>
      </td>
    `;
    gamesTbody.appendChild(tr);
  });
}

/* =========================
   FORM
========================= */
function getFormData() {
  return {
    team: titleCaseWords(team.value),
    opponent: titleCaseWords(opponent.value),
    homeAway: homeAway.value,
    week: Number(week.value),
    pointsFor: Number(pointsFor.value),
    pointsAgainst: Number(pointsAgainst.value),
    result: result.value
  };
}

function resetForm() {
  gameId.value = "";
  team.value = "";
  opponent.value = "";
  homeAway.value = "";
  week.value = "";
  pointsFor.value = "";
  pointsAgainst.value = "";
  result.value = "";
  clearErrors();
  formTitle.textContent = "Add Game";
}

/* =========================
   EDIT / DELETE (FIXED)
========================= */
gamesTbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.textContent.trim().toLowerCase();
  const id = btn.dataset.id;

  if (action === "edit") {
    const g = await apiGet(`${API_BASE}/games/${id}`);
    gameId.value = g.id;
    team.value = g.team;
    opponent.value = g.opponent;
    homeAway.value = g.homeAway;
    week.value = g.week;
    pointsFor.value = g.pointsFor;
    pointsAgainst.value = g.pointsAgainst;
    result.value = g.result;
    formTitle.textContent = "Edit Game";
    showView("formView");
  }

  if (action === "delete") {
    if (!confirm("Delete this game?")) return;
    await apiSend(`${API_BASE}/games/${id}`, "DELETE", {});
    loadPage(currentPage);
  }
});

/* =========================
   STATS
========================= */
async function loadStats() {
  statsMsg.textContent = "Loading...";
  try {
    const s = await apiGet(`${API_BASE}/stats`);
    statTotalGames.textContent = s.totalGames;
    statWL.textContent = `${s.wins} / ${s.losses}`;
    statAvgPF.textContent = s.avgPF.toFixed(1);

    if (s.highPFGame) {
      statHighPF.textContent = s.highPFGame.pointsFor;
      statHighPFDetail.textContent =
        `${s.highPFGame.team} vs ${s.highPFGame.opponent} (Week ${s.highPFGame.week})`;
    }
    statsMsg.textContent = "";
  } catch (err) {
    statsMsg.textContent = err.message;
  }
}

/* =========================
   EVENTS
========================= */
tabs.forEach(t => t.addEventListener("click", () => showView(t.dataset.view)));

prevPageBtn.addEventListener("click", () => loadPage(currentPage - 1));
nextPageBtn.addEventListener("click", () => loadPage(currentPage + 1));

searchInput.addEventListener("input", () => {
  lastQuery = searchInput.value;
  loadPage(1);
});

filterResult.addEventListener("change", () => {
  lastResultFilter = filterResult.value;
  loadPage(1);
});

cancelBtn.addEventListener("click", () => {
  resetForm();
  showView("listView");
});

gameForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = getFormData();

  if (gameId.value) {
    await apiSend(`${API_BASE}/games/${gameId.value}`, "PUT", d);
  } else {
    await apiSend(`${API_BASE}/games`, "POST", d);
  }

  resetForm();
  showView("listView");
});

/* =========================
   INIT
========================= */
resetForm();
loadPage(1);
