const API_URL = "https://college-football-game-tracker-part2-1.onrender.com/api";

let currentPage = 1;
let pageSize = 10;
let editingId = null;

const tbody = document.getElementById("gamesTbody");
const pageLabel = document.getElementById("pageLabel");

const week = document.getElementById("week");
const team = document.getElementById("team");
const opponent = document.getElementById("opponent");
const homeAway = document.getElementById("homeAway");
const pointsFor = document.getElementById("pointsFor");
const pointsAgainst = document.getElementById("pointsAgainst");
const result = document.getElementById("result");

async function loadGames(page = 1) {
  currentPage = page;

  const res = await fetch(`${API_URL}/games?page=${page}&page_size=${pageSize}`);
  const data = await res.json();

  renderTable(data.items);
  pageLabel.innerText = `Page ${currentPage}`;
}

function renderTable(games) {
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

async function editGame(id) {
  const res = await fetch(`${API_URL}/games/${id}`);
  const g = await res.json();

  editingId = id;

  week.value = g.week;
  team.value = g.team;
  opponent.value = g.opponent;
  homeAway.value = g.homeAway;
  pointsFor.value = g.pointsFor;
  pointsAgainst.value = g.pointsAgainst;
  result.value = g.result;

  document.getElementById("formView").classList.add("active");
  document.getElementById("listView").classList.remove("active");
}

async function deleteGame(id) {
  await fetch(`${API_URL}/games/${id}`, { method: "DELETE" });
  loadGames(currentPage);
}

document.getElementById("saveBtn").onclick = async (e) => {
  e.preventDefault();

  const game = {
    week: parseInt(week.value),
    team: team.value,
    opponent: opponent.value,
    homeAway: homeAway.value,
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

  loadGames(currentPage);
};

document.getElementById("prevPageBtn").onclick = () => {
  if (currentPage > 1) loadGames(currentPage - 1);
};

document.getElementById("nextPageBtn").onclick = () => {
  loadGames(currentPage + 1);
};

loadGames();
