const API = "https://college-football-game-tracker-part2-1.onrender.com/api";

let allGames = [];
let page = 1;
let pageSize = 10;
let search = "";
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
const statTotalGames = document.getElementById("statTotalGames");
const statWL = document.getElementById("statWL");
const statAvgPF = document.getElementById("statAvgPF");
const statHighPF = document.getElementById("statHighPF");

/* ---------- Normalize ---------- */
function normalizeGame(g) {
  return {
    id: g.id,
    week: Number(g.week),
    team: g.team || "",
    opponent: g.opponent || "",
    team_score: Number(g.pointsfor),
    opponent_score: Number(g.pointsagainst)
  };
}

/* ---------- Load ---------- */
async function loadAllGames() {
  const res = await fetch(`${API}/games`);
  const data = await res.json();

  allGames = (data.items || []).map(normalizeGame);

  render();
  renderStats();
}

/* ---------- Render Table ---------- */
function render() {
  let games = [...allGames];

  if (search) {
    const s = search.toLowerCase();
    games = games.filter(
      g => g.team.toLowerCase().includes(s) || g.opponent.toLowerCase().includes(s)
    );
  }

  const start = (page - 1) * pageSize;
  const pageItems = games.slice(start, start + pageSize);

  tbody.innerHTML = "";

  pageItems.forEach(g => {
    tbody.innerHTML += `
      <tr>
        <td>${g.week}</td>
        <td>${g.team}</td>
        <td>${g.opponent}</td>
        <td>${g.team_score}</td>
        <td>${g.opponent_score}</td>
        <td>${g.team_score > g.opponent_score ? "W" : "L"}</td>
        <td>
          <button onclick="editGame(${g.id})">Edit</button>
          <button onclick="delGame(${g.id})">Delete</button>
        </td>
      </tr>
    `;
  });

  pageLabel.innerText = `Page ${page}`;
}

/* ---------- STATS ---------- */
function renderStats() {
  const total = allGames.length;

  let wins = 0;
  let totalPF = 0;
  let highGame = null;

  allGames.forEach(g => {
    if (g.team_score > g.opponent_score) wins++;
    totalPF += g.team_score;

    if (!highGame || g.team_score > highGame.team_score) {
      highGame = g;
    }
  });

  const losses = total - wins;
  const avg = total ? (totalPF / total).toFixed(1) : "0.0";

  statTotalGames.innerText = total;
  statWL.innerText = `${wins} / ${losses}`;
  statAvgPF.innerText = avg;

  if (highGame) {
    statHighPF.innerText = `${highGame.team} (${highGame.team_score})`;
  } else {
    statHighPF.innerText = "—";
  }
}

/* ---------- CRUD ---------- */
window.delGame = async (id) => {
  await fetch(`${API}/games/${id}`, { method: "DELETE" });
  loadAllGames();
};

window.editGame = (id) => {
  const g = allGames.find(x => x.id === id);
  if (!g) return;

  editingId = id;

  team.value = g.team;
  opponent.value = g.opponent;
  week.value = g.week;
  pointsFor.value = g.team_score;
  pointsAgainst.value = g.opponent_score;

  switchView("formView");
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    team: team.value,
    opponent: opponent.value,
    week: Number(week.value),
    teamScore: Number(pointsFor.value),
    opponentScore: Number(pointsAgainst.value)
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

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => switchView(btn.dataset.view);
});

function switchView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ---------- Search ---------- */
searchInput.oninput = e => {
  search = e.target.value;
  render();
};

/* ---------- Init ---------- */
loadAllGames();
