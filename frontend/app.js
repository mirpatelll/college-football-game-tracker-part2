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

/* ---------- Cookies ---------- */
function setCookie(n, v) {
  document.cookie = `${n}=${v};path=/`;
}
function getCookie(n) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(n + "="))
    ?.split("=")[1];
}

/* ---------- Normalize DB response ---------- */
function normalizeGame(g) {
  return {
    id: g.id,
    week: Number(g.week) || 0,
    team: g.team || "",
    opponent: g.opponent || "",
    pointsfor: Number(g.pointsfor) || 0,
    pointsagainst: Number(g.pointsagainst) || 0,
    result: g.result || "",
    imageurl: g.imageurl || ""
  };
}

/* ---------- Load Games ---------- */
async function loadAllGames() {
  const res = await fetch(`${API}/games`);
  const data = await res.json();
  allGames = (data.items || []).map(normalizeGame);
  render();
  loadStats();
}

/* ---------- Render List ---------- */
function render() {
  let games = [...allGames];

  if (search) {
    const s = search.toLowerCase();
    games = games.filter(
      g =>
        g.team.toLowerCase().includes(s) ||
        g.opponent.toLowerCase().includes(s)
    );
  }

  games.sort((a, b) => {
    let x = a[sortField];
    let y = b[sortField];
    if (typeof x === "string") x = x.toLowerCase();
    if (typeof y === "string") y = y.toLowerCase();
    if (x === y) return 0;
    return sortDir === "asc" ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
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
        <td>${g.pointsfor}</td>
        <td>${g.pointsagainst}</td>
        <td>${g.pointsfor > g.pointsagainst ? "W" : "L"}</td>
        <td>
          <button onclick="editGame(${g.id})">Edit</button>
          <button onclick="delGame(${g.id})">Delete</button>
        </td>
      </tr>
    `;
  });

  pageLabel.innerText = `Page ${page} of ${totalPages}`;
  setCookie("pageSize", pageSize);
}

/* ---------- Stats ---------- */
async function loadStats() {
  const res = await fetch(`${API}/stats`);
  const s = await res.json();

  document.getElementById("totalGames").innerText = s.total || 0;
  document.getElementById("winsLosses").innerText = `${s.wins || 0} / ${s.losses || 0}`;
  document.getElementById("avgPF").innerText = Number(s.avg_pf || 0).toFixed(1);

  if (allGames.length > 0) {
    const highest = [...allGames].sort((a, b) => b.pointsfor - a.pointsfor)[0];
    document.getElementById("highestPF").innerText =
      `${highest.team} (${highest.pointsfor})`;
  } else {
    document.getElementById("highestPF").innerText = "-";
  }
}

/* ---------- Delete ---------- */
window.delGame = async (id) => {
  if (!confirm("Delete this game?")) return;
  await fetch(`${API}/games/${id}`, { method: "DELETE" });
  await loadAllGames();
};

/* ---------- Edit ---------- */
window.editGame = (id) => {
  const g = allGames.find(x => x.id === id);
  if (!g) return;

  editingId = id;

  team.value = g.team;
  opponent.value = g.opponent;
  week.value = g.week;
  pointsFor.value = g.pointsfor;
  pointsAgainst.value = g.pointsagainst;

  switchView("formView");
};

/* ---------- Submit ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    team: team.value.trim(),
    opponent: opponent.value.trim(),
    week: Number(week.value),
    teamScore: Number(pointsFor.value),
    opponentScore: Number(pointsAgainst.value),
    result: Number(pointsFor.value) > Number(pointsAgainst.value) ? "W" : "L",
    imageUrl: "https://via.placeholder.com/300x150?text=Game"
  };

  const url = editingId
    ? `${API}/games/${editingId}`
    : `${API}/games`;

  const method = editingId ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  editingId = null;
  form.reset();
  switchView("listView");
  await loadAllGames();
});

/* ---------- Paging ---------- */
prevBtn.onclick = () => {
  if (page > 1) {
    page--;
    render();
  }
};
nextBtn.onclick = () => {
  page++;
  render();
};

/* ---------- Search ---------- */
searchInput.oninput = (e) => {
  search = e.target.value;
  page = 1;
  render();
};

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => switchView(btn.dataset.view);
});

function switchView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ---------- Init ---------- */
loadAllGames();
