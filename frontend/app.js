/* 
   CONFIG
*/

// Render backend
const API_BASE = "https://college-football-game-tracker-part2.onrender.com/api";

/* =========================
COOKIE
========================= */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000`;
}

let PAGE_SIZE = parseInt(getCookie("pageSize")) || 10;

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
const pageSizeSelect = document.getElementById("pageSizeSelect");

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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiSend(url, method, bodyObj) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* =========================
LIST + PAGING
========================= */
async function loadPage(page) {
  currentPage = page;
  listMsg.textContent = "Loading...";

  const params = new URLSearchParams();
  params.set("page", currentPage);
  params.set("page_size", PAGE_SIZE);
  if (lastQuery) params.set("q", lastQuery);
  if (lastResultFilter !== "ALL") params.set("result", lastResultFilter);

  const data = await apiGet(`${API_BASE}/games?${params}`);

  totalRecords = data.total;
  renderTable(data.items);
  updatePaging();
  countLabel.textContent = `Showing ${data.items.length} of ${data.total}`;
  listMsg.textContent = "";
}

function updatePaging() {
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function renderTable(items) {
  gamesTbody.innerHTML = "";
  items.forEach(g => {
    gamesTbody.innerHTML += `
      <tr>
        <td>${escapeHtml(g.week)}</td>
        <td>${escapeHtml(g.team)}</td>
        <td>${escapeHtml(g.opponent)}</td>
        <td>${escapeHtml(g.homeAway)}</td>
        <td>${escapeHtml(g.pointsFor)}</td>
        <td>${escapeHtml(g.pointsAgainst)}</td>
        <td><b>${escapeHtml(g.result)}</b></td>
        <td>
          <button data-action="edit" data-id="${g.id}">Edit</button>
          <button data-action="delete" data-id="${g.id}">Delete</button>
        </td>
      </tr>`;
  });
}

/* =========================
EVENTS
========================= */

pageSizeSelect.value = PAGE_SIZE;
pageSizeSelect.addEventListener("change", () => {
  PAGE_SIZE = parseInt(pageSizeSelect.value);
  setCookie("pageSize", PAGE_SIZE);
  loadPage(1);
});

tabs.forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));

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

/* =========================
BOOT
========================= */
loadPage(1);
