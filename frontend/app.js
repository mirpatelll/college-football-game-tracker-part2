/* CONFIG */

const API_BASE = "https://college-football-game-tracker-part2-1.onrender.com/api";

/* DOM */

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
const pageSizeSelect = document.getElementById("pageSizeSelect");

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

const statTotalGames = document.getElementById("statTotalGames");
const statWL = document.getElementById("statWL");
const statAvgPF = document.getElementById("statAvgPF");
const statHighPF = document.getElementById("statHighPF");
const statHighPFDetail = document.getElementById("statHighPFDetail");
const statsMsg = document.getElementById("statsMsg");

/* STATE */

let currentPage = 1;
let totalRecords = 0;
let lastQuery = "";
let lastResultFilter = "ALL";
let PAGE_SIZE = 10;

/* PAGE SIZE DROPDOWN FIX */

if (pageSizeSelect) {
  PAGE_SIZE = parseInt(pageSizeSelect.value);

  pageSizeSelect.addEventListener("change", () => {
    PAGE_SIZE = parseInt(pageSizeSelect.value);
    loadPage(1);
  });
}

/* HELPERS */

function showView(viewId) {
  views.forEach(v => v.classList.toggle("active", v.id === viewId));
  tabs.forEach(t => t.classList.toggle("active", t.dataset.view === viewId));

  if (viewId === "listView") loadPage(1);
  if (viewId === "statsView") loadStats();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m])
  );
}

function titleCaseWords(s) {
  return String(s ?? "").split(/\s+/).map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/* API */

async function apiGet(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiSend(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* LIST */

async function loadPage(page) {
  currentPage = page;
  listMsg.textContent = "Loading...";

  const params = new URLSearchParams({
    page: currentPage,
    page_size: PAGE_SIZE,
    q: lastQuery,
    result: lastResultFilter === "ALL" ? "" : lastResultFilter
  });

  const data = await apiGet(`${API_BASE}/games?${params}`);

  totalRecords = data.total;

  gamesTbody.innerHTML = "";

  data.items.forEach(g => {
    gamesTbody.innerHTML += `
      <tr>
        <td>${g.week}</td>
        <td>${g.team}</td>
        <td>${g.opponent}</td>
        <td>${g.homeAway}</td>
        <td>${g.pointsFor}</td>
        <td>${g.pointsAgainst}</td>
        <td><b>${g.result}</b></td>
        <td>
          <button data-action="edit" data-id="${g.id}">Edit</button>
          <button data-action="delete" data-id="${g.id}">Delete</button>
        </td>
      </tr>`;
  });

  updatePaging();
  countLabel.textContent = `Showing ${data.items.length} of ${data.total}`;
  listMsg.textContent = "";
}

function updatePaging() {
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
}

/* EVENTS */

tabs.forEach(t => t.addEventListener("click", () => showView(t.dataset.view)));

prevPageBtn.onclick = () => currentPage > 1 && loadPage(currentPage - 1);
nextPageBtn.onclick = () => loadPage(currentPage + 1);

searchInput.oninput = () => {
  lastQuery = searchInput.value;
  loadPage(1);
};

filterResult.onchange = () => {
  lastResultFilter = filterResult.value;
  loadPage(1);
};

gamesTbody.onclick = e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "edit") loadOneGame(id);
  if (btn.dataset.action === "delete") deleteGame(id);
};

/* EDIT */

async function loadOneGame(id) {
  const g = await apiGet(`${API_BASE}/games/${id}`);
  gameId.value = g.id;
  team.value = g.team;
  opponent.value = g.opponent;
  homeAway.value = g.homeAway;
  week.value = g.week;
  pointsFor.value = g.pointsFor;
  pointsAgainst.value = g.pointsAgainst;
  result.value = g.result;
  showView("formView");
}

async function deleteGame(id) {
  if (!confirm("Delete?")) return;
  await apiSend(`${API_BASE}/games/${id}`, "DELETE", {});
  loadPage(currentPage);
}

/* STATS */

async function loadStats() {
  const s = await apiGet(`${API_BASE}/stats`);
  statTotalGames.textContent = s.totalGames;
  statWL.textContent = `${s.wins}/${s.losses}`;
  statAvgPF.textContent = s.avgPF.toFixed(1);

  if (s.highPFGame) {
    statHighPF.textContent = s.highPFGame.pointsFor;
    statHighPFDetail.textContent = `${s.highPFGame.team} vs ${s.highPFGame.opponent}`;
  }
}

/* FORM */

gameForm.onsubmit = async e => {
  e.preventDefault();

  const d = {
    id: gameId.value || null,
    team: titleCaseWords(team.value),
    opponent: titleCaseWords(opponent.value),
    homeAway: homeAway.value,
    week: Number(week.value),
    pointsFor: Number(pointsFor.value),
    pointsAgainst: Number(pointsAgainst.value),
    result: result.value
  };

  if (!d.id) await apiSend(`${API_BASE}/games`, "POST", d);
  else await apiSend(`${API_BASE}/games/${d.id}`, "PUT", d);

  showView("listView");
};

/* INIT */

loadPage(1);
