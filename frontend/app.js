const API = "https://college-football-game-tracker-part2-1.onrender.com/api";

let allGames = [];
let page = 1;
let pageSize = Number(getCookie("pageSize")) || 10;
let search = "";
let sortField = "week";
let sortDir = "asc";
let editingId = null;

/* DOM */
const tbody = document.getElementById("gamesTbody");
const pageLabel = document.getElementById("pageLabel");
const searchInput = document.getElementById("searchInput");
const filterResult = document.getElementById("filterResult");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const form = document.getElementById("gameForm");

/* Stats DOM */
const statTotal = document.getElementById("statTotal");
const statRecord = document.getElementById("statRecord");
const statAvgPF = document.getElementById("statAvgPF");
const statHighPF = document.getElementById("statHighPF");

/* Inject controls */
document.querySelector(".tools").insertAdjacentHTML(
  "beforeend",
  `
<select id="sortSelect" class="input">
  <option value="week">Sort: Week</option>
  <option value="team">Sort: Team</option>
</select>

<select id="pageSizeSelect" class="input">
  <option>5</option>
  <option>10</option>
  <option>20</option>
  <option>50</option>
</select>
`
);

const sortSelect = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
pageSizeSelect.value = String(pageSize);

/* Cookies */
function setCookie(n, v) {
  document.cookie = `${n}=${v};path=/`;
}
function getCookie(n) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(n + "="))
    ?.split("=")[1];
}

/* Helpers */
function getField(obj, snake, camel) {
  return obj?.[snake] ?? obj?.[camel];
}

function normalizeGame(g) {
  return {
    id: g.id,
    week: Number(g.week) || 0,
    team: g.team || "",
    opponent: g.opponent || "",
    home_away: g.home_away || "",
    team_score: Number(g.pointsfor ?? g.team_score ?? 0),
    opponent_score: Number(g.pointsagainst ?? g.opponent_score ?? 0),
    image_url: g.imageurl || g.image_url || ""
  };
}

/* Load */
async function loadAllGames() {
  const res = await fetch(`${API}/games`);
  const data = await res.json();
  allGames = (data.items || []).map(normalizeGame);
  render();
  updateStats();
}

/* Stats */
function updateStats() {
  const total = allGames.length;

  const wins = allGames.filter(g => g.team_score > g.opponent_score).length;
  const losses = total - wins;

  const totalPF = allGames.reduce((s, g) => s + g.team_score, 0);
  const avgPF = total ? (totalPF / total).toFixed(1) : "0.0";

  const high = allGames.reduce((m, g) => g.team_score > (m?.team_score || 0) ? g : m, null);

  if (statTotal) statTotal.innerText = total;
  if (statRecord) statRecord.innerText = `${wins} / ${losses}`;
  if (statAvgPF) statAvgPF.innerText = avgPF;
  if (statHighPF) statHighPF.innerText = high ? `${high.team} (${high.team_score})` : "—";
}

/* Render */
function render() {
  let games = [...allGames];

  if (search) {
    const s = search.toLowerCase();
    games = games.filter(g =>
      g.team.toLowerCase().includes(s) ||
      g.opponent.toLowerCase().includes(s)
    );
  }

  if (filterResult.value !== "ALL") {
    games = games.filter(
      g => (g.team_score > g.opponent_score ? "W" : "L") === filterResult.value
    );
  }

  games.sort((a, b) => {
    let x = a[sortField];
    let y = b[sortField];
    if (typeof x === "string") x = x.toLowerCase();
    if (typeof y === "string") y = y.toLowerCase();
    return sortDir === "asc" ? x > y ? 1 : -1 : x < y ? 1 : -1;
  });

  const totalPages = Math.max(1, Math.ceil(games.length / pageSize));
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * pageSize;
  const pageItems = games.slice(start, start + pageSize);

  tbody.innerHTML = "";

  pageItems.forEach(g => {
    tbody.innerHTML += `
<tr>
<td>${g.week}</td>
<td>${g.team}</td>
<td>${g.opponent}</td>
<td>${g.home_away || "-"}</td>
<td>${g.team_score}</td>
<td>${g.opponent_score}</td>
<td>${g.team_score > g.opponent_score ? "W" : "L"}</td>
<td>
<button onclick="editGame(${g.id})">Edit</button>
<button onclick="delGame(${g.id})">Delete</button>
</td>
</tr>`;
  });

  pageLabel.innerText = `Page ${page} of ${totalPages}`;
}

/* CRUD */
window.delGame = async id => {
  if (!confirm("Delete?")) return;
  await fetch(`${API}/games/${id}`, { method: "DELETE" });
  loadAllGames();
};

window.editGame = id => {
  const g = allGames.find(x => x.id === id);
  editingId = id;

  team.value = g.team;
  opponent.value = g.opponent;
  week.value = g.week;
  pointsFor.value = g.team_score;
  pointsAgainst.value = g.opponent_score;

  switchView("formView");
};

form.addEventListener("submit", async e => {
  e.preventDefault();

  const payload = {
    team: team.value,
    opponent: opponent.value,
    week: Number(week.value),
    team_score: Number(pointsFor.value),
    opponent_score: Number(pointsAgainst.value),
    image_url: "https://via.placeholder.com/300x150"
  };

  const url = editingId ? `${API}/games/${editingId}` : `${API}/games`;
  const method = editingId ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  editingId = null;
  form.reset();
  switchView("listView");
  loadAllGames();
});

/* Controls */
prevBtn.onclick = () => { if (page > 1) { page--; render(); }};
nextBtn.onclick = () => { page++; render(); };

searchInput.oninput = e => { search = e.target.value; page = 1; render(); };
filterResult.onchange = () => { page = 1; render(); };
sortSelect.onchange = e => { sortField = e.target.value; render(); };
pageSizeSelect.onchange = e => { pageSize = Number(e.target.value); page = 1; render(); };

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => switchView(btn.dataset.view);
});

function switchView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* Init */
loadAllGames();
