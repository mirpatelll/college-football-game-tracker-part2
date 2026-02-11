const API_URL = "https://college-football-game-tracker-part2-1.onrender.com/api";

let currentPage = 1;
let pageSize = 10;
let editingId = null;

async function loadGames(page = 1) {
  currentPage = page;

  const res = await fetch(`${API_URL}/games?page=${page}&page_size=${pageSize}`);
  const data = await res.json();

  renderTable(data.items);
  renderPagination(data.total);
}

function renderTable(games) {
  const tbody = document.querySelector("tbody");
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
      <td>
        <button onclick="editGame('${g.id}')">Edit</button>
        <button onclick="deleteGame('${g.id}')">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function renderPagination(total) {
  document.getElementById("pageInfo").innerText =
    `Page ${currentPage} of ${Math.ceil(total/pageSize)}`;
}

async function editGame(id) {
  const res = await fetch(`${API_URL}/games/${id}`);
  const g = await res.json();

  editingId = id;

  week.value = g.week;
  team.value = g.team;
  opponent.value = g.opponent;
  homeAway.value = g.homeAway;
  pf.value = g.pointsFor;
  pa.value = g.pointsAgainst;
  result.value = g.result;
}

async function deleteGame(id) {
  await fetch(`${API_URL}/games/${id}`, { method: "DELETE" });
  loadGames(currentPage);
}

document.getElementById("saveBtn").onclick = async () => {

  const game = {
    week: parseInt(week.value),
    team: team.value,
    opponent: opponent.value,
    homeAway: homeAway.value,
    pointsFor: parseInt(pf.value),
    pointsAgainst: parseInt(pa.value),
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

  loadGames(currentPage);
};

document.getElementById("prevBtn").onclick = () => {
  if (currentPage > 1) loadGames(currentPage - 1);
};

document.getElementById("nextBtn").onclick = () => {
  loadGames(currentPage + 1);
};

loadGames();
