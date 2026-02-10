const API_URL = "https://college-football-game-tracker-part2-1.onrender.com/api";

let currentPage = 1;
let pageSize = parseInt(localStorage.getItem("pageSize")) || 10;

document.getElementById("pageSize").value = pageSize;

async function loadGames(page = 1) {
  currentPage = page;

  const res = await fetch(`${API_URL}/games`);
  const data = await res.json();

  renderTable(data.items.slice((page-1)*pageSize, page*pageSize));
  renderPagination(data.items.length);
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

async function deleteGame(id) {
  if (!confirm("Delete this game?")) return;

  await fetch(`${API_URL}/games/${id}`, { method: "DELETE" });
  loadGames(currentPage);
}

document.getElementById("saveBtn").addEventListener("click", async () => {

  const game = {
    week: parseInt(document.getElementById("week").value),
    team: document.getElementById("team").value,
    opponent: document.getElementById("opponent").value,
    homeAway: document.getElementById("homeAway").value,
    pointsFor: parseInt(document.getElementById("pf").value),
    pointsAgainst: parseInt(document.getElementById("pa").value),
    result: document.getElementById("result").value
  };

  await fetch(`${API_URL}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(game)
  });

  alert("Saved!");
  loadGames();
});

document.getElementById("pageSize").addEventListener("change", e => {
  pageSize = parseInt(e.target.value);
  localStorage.setItem("pageSize", pageSize);
  loadGames(1);
});

document.getElementById("prevBtn").onclick = () => {
  if (currentPage > 1) loadGames(currentPage-1);
};

document.getElementById("nextBtn").onclick = () => {
  loadGames(currentPage+1);
};

loadGames();
