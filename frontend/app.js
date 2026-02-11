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

/* ---------- Key helpers (snake_case OR camelCase) ---------- */
function getField(obj, snake, camel) {
  // Prefer snake_case, then camelCase, otherwise undefined
  return obj?.[snake] ?? obj?.[camel];
}
function normalizeGame(g) {
  return {
    id: getField(g, "id", "id"),
    week: Number(getField(g, "week", "week")) || 0,
    team: getField(g, "team", "team") || "",
    opponent: getField(g, "opponent", "opponent") || "",
    home_away: getField(g, "home_away", "homeAway") || "",
    team_score: Number(getField(g, "team_score", "teamScore")) ?? 0,
    opponent_score: Number(getField(g, "opponent_score", "opponentScore")) ?? 0,
    image_url: getField(g, "image_url", "imageUrl") || "",
  };
}

/* Load ALL games once */
async function loadAllGames() {
  const res = await fetch(`${API}/games`);
  const data = await res.json();
  const items = data.items || [];
  allGames = items.map(normalizeGame);
  render();
}

/* Render with filter/sort/paging */
function render() {
  let games = [...allGames];

  /* Search */
  if (search) {
    const s = search.toLowerCase();
    games = games.filter(
      (g) =>
        g.team.toLowerCase().includes(s) || g.opponent.toLowerCase().includes(s)
    );
  }

  /* Result filter */
  if (filterResult.value !== "ALL") {
    games = games.filter(
      (g) =>
        (Number(g.team_score) > Number(g.opponent_score) ? "W" : "L") ===
        filterResult.value
    );
  }

  /* Sort */
  games.sort((a, b) => {
    let x = a[sortField];
    let y = b[sortField];
    if (typeof x === "string") x = x.toLowerCase();
    if (typeof y === "string") y = y.toLowerCase();
    if (x === y) return 0;
    return sortDir === "asc" ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
  });

  /* Paging */
  const totalPages = Math.max(1, Math.ceil(games.length / pageSize));
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * pageSize;
  const pageItems = games.slice(start, start + pageSize);

  tbody.innerHTML = "";
  pageItems.forEach((g) => {
    const ha = g.home_away || "-";
    const pf = Number.isFinite(g.team_score) ? g.team_score : 0;
    const pa = Number.isFinite(g.opponent_score) ? g.opponent_score : 0;

    tbody.innerHTML += `
      <tr>
        <td>${g.week}</td>
        <td>${g.team}</td>
        <td>${g.opponent}</td>
        <td>${ha}</td>
        <td>${pf}</td>
        <td>${pa}</td>
        <td>${pf > pa ? "W" : "L"}</td>
        <td class="right">
          <button onclick="editGame(${g.id})">Edit</button>
          <button onclick="delGame(${g.id})">Delete</button>
        </td>
      </tr>
    `;
  });

  pageLabel.innerText = `Page ${page} of ${totalPages}`;
  setCookie("pageSize", pageSize);
}

/* CRUD */
window.delGame = async (id) => {
  if (!confirm("Delete this game?")) return;
  await fetch(`${API}/games/${id}`, { method: "DELETE" });
  await loadAllGames();
};

window.editGame = (id) => {
  const g = allGames.find((x) => x.id === id);
  if (!g) return;

  editingId = id;

  team.value = g.team;
  opponent.value = g.opponent;
  week.value = g.week;
  pointsFor.value = g.team_score;
  pointsAgainst.value = g.opponent_score;

  // these exist in HTML even if backend doesn't store them
  if (typeof homeAway !== "undefined") homeAway.value = g.home_away || "Home";
  if (typeof result !== "undefined") result.value = g.team_score > g.opponent_score ? "W" : "L";

  switchView("formView");
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Basic front-end guardrails (prevents empty strings becoming backend errors)
  const teamVal = team.value.trim();
  const oppVal = opponent.value.trim();

  const weekVal = Number(week.value);
  const pfVal = Number(pointsFor.value);
  const paVal = Number(pointsAgainst.value);

  if (!teamVal || !oppVal || !Number.isFinite(weekVal) || !Number.isFinite(pfVal) || !Number.isFinite(paVal)) {
    alert("Please fill out all required fields with valid numbers.");
    return;
  }

  // IMPORTANT: send BOTH snake_case and camelCase so either backend version accepts it.
  const payload = {
    team: teamVal,
    opponent: oppVal,
    week: weekVal,

    // snake_case
    team_score: pfVal,
    opponent_score: paVal,
    image_url: "https://via.placeholder.com/300x150?text=Game",

    // camelCase (for older backend versions)
    teamScore: pfVal,
    opponentScore: paVal,
    imageUrl: "https://via.placeholder.com/300x150?text=Game",
  };

  const url = editingId ? `${API}/games/${editingId}` : `${API}/games`;
  const method = editingId ? "PUT" : "POST";

  const resp = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    // show the REAL backend error so we never guess again
    const text = await resp.text().catch(() => "");
    alert(`Save failed (${resp.status}).\n\n${text || "Backend rejected data."}`);
    return;
  }

  editingId = null;
  form.reset();
  switchView("listView");
  await loadAllGames();
});

/* Controls */
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

searchInput.oninput = (e) => {
  search = e.target.value;
  page = 1;
  render();
};
filterResult.onchange = () => {
  page = 1;
  render();
};

sortSelect.onchange = (e) => {
  sortField = e.target.value;
  page = 1;
  render();
};
pageSizeSelect.onchange = (e) => {
  pageSize = Number(e.target.value);
  page = 1;
  render();
};

/* Tabs */
document.querySelectorAll(".tab").forEach((btn) => {
  btn.onclick = () => switchView(btn.dataset.view);
});
function switchView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* Init */
loadAllGames();
