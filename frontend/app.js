/* 
   CONFIG
   */

// LOCAL: Flask running on your computer
// const API_BASE = "http://127.0.0.1:5001/api";

// DEPLOYED: change this later to your deployed backend URL (Render/Fly/etc.)
// Example: const API_BASE = "https://your-backend.onrender.com/api";
const API_BASE = "http://127.0.0.1:5001/api";

const PAGE_SIZE = 10;

/* =========================x
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

/* =========================
   HELPERS
   ========================= */
function showView(viewId) {
  views.forEach(v => v.classList.toggle("active", v.id === viewId));
  tabs.forEach(t => t.classList.toggle("active", t.dataset.view === viewId));

  // auto refresh when switching
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
  [teamErr, opponentErr, homeAwayErr, weekErr, pointsForErr, pointsAgainstErr, resultErr].forEach(e => e.textContent = "");
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

  const q = (lastQuery || "").trim();
  const rf = lastResultFilter || "ALL";

  const params = new URLSearchParams();
  params.set("page", String(currentPage));
  params.set("page_size", String(PAGE_SIZE));
  if (q) params.set("q", q);
  if (rf !== "ALL") params.set("result", rf);

  try {
    const data = await apiGet(`${API_BASE}/games?${params.toString()}`);
    totalRecords = data.total;

    renderTable(data.items);
    updatePaging();
    countLabel.textContent = `Showing ${data.items.length} of ${data.total} total record(s)`;
    listMsg.textContent = "";
  } catch (err) {
    gamesTbody.innerHTML = "";
    countLabel.textContent = "";
    listMsg.textContent = `Error: ${err.message}`;
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
      <td>${escapeHtml(g.week)}</td>
      <td>${escapeHtml(g.team)}</td>
      <td>${escapeHtml(g.opponent)}</td>
      <td>${escapeHtml(g.homeAway)}</td>
      <td>${escapeHtml(g.pointsFor)}</td>
      <td>${escapeHtml(g.pointsAgainst)}</td>
      <td><b>${escapeHtml(g.result)}</b></td>
      <td class="right">
        <button class="btn btn-ghost" data-action="edit" data-id="${escapeHtml(g.id)}">Edit</button>
        <button class="btn btn-danger" data-action="delete" data-id="${escapeHtml(g.id)}">Delete</button>
      </td>
    `;

    gamesTbody.appendChild(tr);
  });
}

/* =========================
   FORM + VALIDATION
   ========================= */
function getFormData() {
  return {
    id: gameId.value || null,
    team: titleCaseWords(team.value),
    opponent: titleCaseWords(opponent.value),
    homeAway: homeAway.value,
    week: Number(week.value),
    pointsFor: Number(pointsFor.value),
    pointsAgainst: Number(pointsAgainst.value),
    result: result.value
  };
}

function clientValidate(d) {
  clearErrors();
  let ok = true;

  if (!d.team || d.team.length < 2) { teamErr.textContent = "Team is required."; ok = false; }
  if (!d.opponent || d.opponent.length < 2) { opponentErr.textContent = "Opponent is required."; ok = false; }
  if (!d.homeAway) { homeAwayErr.textContent = "Choose Home or Away."; ok = false; }

  if (!Number.isFinite(d.week) || d.week < 1 || d.week > 20) { weekErr.textContent = "Week must be 1–20."; ok = false; }
  if (!Number.isFinite(d.pointsFor) || d.pointsFor < 0 || d.pointsFor > 100) { pointsForErr.textContent = "PF must be 0–100."; ok = false; }
  if (!Number.isFinite(d.pointsAgainst) || d.pointsAgainst < 0 || d.pointsAgainst > 100) { pointsAgainstErr.textContent = "PA must be 0–100."; ok = false; }

  if (!d.result) { resultErr.textContent = "Pick W or L."; ok = false; }

  return ok;
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
  formMsg.textContent = "";
  formTitle.textContent = "Add Game";
}

/* 
   EDIT/DELETE
  */
async function loadOneGame(id) {
  const g = await apiGet(`${API_BASE}/games/${encodeURIComponent(id)}`);
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

async function deleteGame(id) {
  const sure = confirm("Delete this record? This cannot be undone.");
  if (!sure) return;

  listMsg.textContent = "Deleting...";

  try {
    await apiSend(`${API_BASE}/games/${encodeURIComponent(id)}`, "DELETE", {});
    await loadPage(currentPage);
    listMsg.textContent = "Deleted.";
    setTimeout(() => (listMsg.textContent = ""), 900);
  } catch (err) {
    listMsg.textContent = `Error: ${err.message}`;
  }
}

/*
STATS
*/
async function loadStats() {
  statsMsg.textContent = "Loading...";
  try {
    const s = await apiGet(`${API_BASE}/stats`);

    statTotalGames.textContent = s.totalGames;
    statWL.textContent = `${s.wins} / ${s.losses}`;
    statAvgPF.textContent = Number(s.avgPF).toFixed(1);

    if (s.highPFGame) {
      statHighPF.textContent = `${s.highPFGame.pointsFor} PF`;
      statHighPFDetail.textContent =
        `${s.highPFGame.team} vs ${s.highPFGame.opponent} (Week ${s.highPFGame.week})`;
    } else {
      statHighPF.textContent = "—";
      statHighPFDetail.textContent = "";
    }

    statsMsg.textContent = "";
  } catch (err) {
    statsMsg.textContent = `Error: ${err.message}`;
  }
}

/* =========================
   EVENTS
   ========================= */
tabs.forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) loadPage(currentPage - 1);
});
nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  if (currentPage < totalPages) loadPage(currentPage + 1);
});

searchInput.addEventListener("input", () => {
  lastQuery = searchInput.value;
  loadPage(1);
});
filterResult.addEventListener("change", () => {
  lastResultFilter = filterResult.value;
  loadPage(1);
});

gamesTbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === "edit") loadOneGame(id);
  if (action === "delete") deleteGame(id);
});

cancelBtn.addEventListener("click", () => {
  resetForm();
  showView("listView");
});

gameForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMsg.textContent = "";

  const d = getFormData();
  if (!clientValidate(d)) return;

  try {
    if (!d.id) {
      await apiSend(`${API_BASE}/games`, "POST", d);
      formMsg.textContent = "Saved.";
    } else {
      await apiSend(`${API_BASE}/games/${encodeURIComponent(d.id)}`, "PUT", d);
      formMsg.textContent = "Updated.";
    }

    resetForm();
    showView("listView");
  } catch (err) {
    
    formMsg.textContent = `Error: ${err.message}`;
  }
});


resetForm();
loadPage(1);
