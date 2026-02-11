const API_URL = "https://college-football-game-tracker-part2-1.onrender.com/api";

let currentPage = 1;
let pageSize = 10;
let editingId = null;

/* ---------------- LOAD ---------------- */
async function loadGames(page = 1) {
  currentPage = page;

  const res = await fetch(`${API_URL}/games?page=${page}&page_size=${pageSize}`);
  const data = await res.json();

  renderTable(data.items);
  renderPagination(data.total);
}

/* ---------------- TABLE ---------------- */
function renderTable(games) {
  const tbody = document.getElementById("gamesTbody");
  tbody.innerHTML = "";

  games.forEach(g => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.week}</td>
      <td>${g.team}</td>
      <td>${g.opponent}</td>
      <td>${g.homeAway}</td>
      <td>${g.pointsFor}</td>
      <td>${g.pointsAgainst}</td>
      <td>${g.result}</td>
      <td class="right">
        <button class="btn btn-ghost" onclick="editGame('${g.id}')">Edit</button>
        <button class="btn btn-ghost" onclick="deleteGame('${g.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ---------------- PAGING ---------------- */
function renderPagination(total) {
  document.getElementById("pageLabel").innerText =
    `Page ${currentPage} of ${Math.ceil(total / pageSize)}`;

  document.getElementById("countLabel").innerText =
    `${total} total games`;
}

/* ---------------- EDIT ---------------- */
async function editGame(id) {
  const res = await fetch(`${API_URL}/games/${id}`);
  const g = await res.json();

  editingId = id;

  document.getElementById("formTitle").innerText = "Edit Game";

  team.value = g.team;
  opponent.value = g.opponent;
  homeAway.value = g.homeAway;
  week.value = g.week;
  pointsFor.value = g.pointsFor;
  pointsAgainst.value = g.pointsAgainst;
  result.value = g.result;

  switchView("formView");
}

/* ---------------- DELETE ---------------- */
async function deleteGame(id) {
  if (!confirm("Delete this game?")) return;

  await fetch(`${API_URL}/games/${id}`, { method: "DELETE" });
  loadGames(currentPage);
}

/* ---------------- SAVE ---------------- */
document.getElementById("gameForm").addEventListener("submit", async e => {
  e.preventDefault();

  const game = {
    team: team.value,
    opponent: opponent.value,
    homeAway: homeAway.value,
    week: parseInt(week.value),
    pointsFor: parseInt(pointsFor.value),
    pointsAgainst: parseInt(pointsAgainst.value),
    result: result.value
  };

  if (editingId) {
    await fetch(`${API_URL}/games/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(game)
    });
    editingId = null;
  } else {
    await fetch(`${API_URL}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(game)
    });
  }

  document.getElementById("gameForm").reset();
  switchView("listView");
  loadGames(currentPage);
});

/* ---------------- PAGING BUTTONS ---------------- */
document.getElementById("prevPageBtn").onclick = () => {
  if (currentPage > 1) loadGames(currentPage - 1);
};

document.getElementById("nextPageBtn").onclick = () => {
  loadGames(currentPage + 1);
};

/* ---------------- PAGE SIZE ---------------- */
document.getElementById("pageSizeSelect").onchange = e => {
  pageSize = parseInt(e.target.value);
  loadGames(1);
};

/* ---------------- TABS ---------------- */
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => switchView(btn.dataset.view);
});

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

  document.getElementById(viewId).classList.add("active");
  document.querySelector(`[data-view="${viewId}"]`).classList.add("active");
}

/* ---------------- INIT ---------------- */
loadGames();

