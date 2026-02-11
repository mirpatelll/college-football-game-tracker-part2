const API = "https://college-football-game-tracker-part2-1.onrender.com/api";

let page = 1;
let pageSize = getCookie("pageSize") || 10;
let search = "";
let editingId = null;

const tbody = document.getElementById("gamesTbody");
const pageLabel = document.getElementById("pageLabel");

const searchInput = document.getElementById("searchInput");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");

const form = document.getElementById("gameForm");

function setCookie(n,v){document.cookie=`${n}=${v};path=/`;}
function getCookie(n){return document.cookie.split("; ").find(r=>r.startsWith(n+"="))?.split("=")[1];}

async function loadGames() {
  setCookie("pageSize", pageSize);

  const res = await fetch(`${API}/games?page=${page}&size=${pageSize}&search=${search}`);
  const data = await res.json();

  tbody.innerHTML = "";

  data.items.forEach(g => {
    tbody.innerHTML += `
      <tr>
        <td>${g.week}</td>
        <td>${g.team}</td>
        <td>${g.opponent}</td>
        <td>${g.home_away || ""}</td>
        <td>${g.team_score}</td>
        <td>${g.opponent_score}</td>
        <td>${g.team_score > g.opponent_score ? "W" : "L"}</td>
        <td class="right">
          <button onclick="editGame(${g.id})">Edit</button>
          <button onclick="delGame(${g.id})">Delete</button>
        </td>
      </tr>
    `;
  });

  pageLabel.innerText = `Page ${page}`;
}

window.delGame = async id => {
  if (!confirm("Delete this game?")) return;
  await fetch(`${API}/games/${id}`, { method: "DELETE" });
  loadGames();
};

window.editGame = async id => {
  const res = await fetch(`${API}/games?page=1&size=500`);
  const data = await res.json();
  const g = data.items.find(x => x.id === id);

  editingId = id;

  document.getElementById("team").value = g.team;
  document.getElementById("opponent").value = g.opponent;
  document.getElementById("week").value = g.week;
  document.getElementById("pointsFor").value = g.team_score;
  document.getElementById("pointsAgainst").value = g.opponent_score;

  switchView("formView");
};

form.addEventListener("submit", async e => {
  e.preventDefault();

  const payload = {
    team: team.value,
    opponent: opponent.value,
    week: +week.value,
    team_score: +pointsFor.value,
    opponent_score: +pointsAgainst.value
  };

  await fetch(editingId ? `${API}/games/${editingId}` : `${API}/games`, {
    method: editingId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  editingId = null;
  form.reset();
  switchView("listView");
  loadGames();
});

prevBtn.onclick = () => {
  if (page > 1) {
    page--;
    loadGames();
  }
};

nextBtn.onclick = () => {
  page++;
  loadGames();
};

searchInput.oninput = e => {
  search = e.target.value;
  page = 1;
  loadGames();
};

/* Tabs */
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => switchView(btn.dataset.view);
});

function switchView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

loadGames();
