const API_URL = "https://college-football-game-tracker-part2-1.onrender.com/api";

let currentPage = 1;

async function loadGames() {
  const pageSize = document.getElementById("pageSize").value;
  const search = document.getElementById("search").value;

  const res = await fetch(`${API_URL}/games?page=${currentPage}&pageSize=${pageSize}&search=${search}`);
  const data = await res.json();

  const tbody = document.getElementById("gamesBody");
  tbody.innerHTML = "";

  data.forEach(g => {
    tbody.innerHTML += `
      <tr>
        <td>${g.week}</td>
        <td>${g.team}</td>
        <td>${g.opponent}</td>
        <td>${g.pointsfor}</td>
        <td>${g.pointsagainst}</td>
        <td>${g.result}</td>
        <td><img src="${g.imageurl}" height="40" /></td>
        <td>
          <button class="edit-btn" data-id="${g.id}">Edit</button>
          <button class="delete-btn" data-id="${g.id}">Delete</button>
        </td>
      </tr>
    `;
  });

  bindButtons();
}

function bindButtons() {
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = () => deleteGame(btn.dataset.id);
  });

  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = () => editGame(btn.dataset.id);
  });
}

async function deleteGame(id) {
  await fetch(`${API_URL}/games/${id}`, { method: "DELETE" });
  loadGames();
}

async function editGame(id) {
  const res = await fetch(`${API_URL}/games/${id}`);
  const g = await res.json();

  document.getElementById("gameId").value = g.id;
  document.getElementById("week").value = g.week;
  document.getElementById("team").value = g.team;
  document.getElementById("opponent").value = g.opponent;
  document.getElementById("pointsfor").value = g.pointsfor;
  document.getElementById("pointsagainst").value = g.pointsagainst;
  document.getElementById("result").value = g.result;
  document.getElementById("imageurl").value = g.imageurl;
}

document.getElementById("gameForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = document.getElementById("gameId").value;

  const payload = {
    week: week.value,
    team: team.value,
    opponent: opponent.value,
    pointsfor: pointsfor.value,
    pointsagainst: pointsagainst.value,
    result: result.value,
    imageurl: imageurl.value
  };

  if (id) {
    await fetch(`${API_URL}/games/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`${API_URL}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  gameForm.reset();
  loadGames();
});

document.getElementById("next").onclick = () => {
  currentPage++;
  loadGames();
};

document.getElementById("prev").onclick = () => {
  if (currentPage > 1) currentPage--;
  loadGames();
};

document.getElementById("pageSize").onchange = loadGames;
document.getElementById("search").oninput = loadGames;

loadGames();
