const API = "https://college-football-game-tracker-part2-1.onrender.com/api";

let allGames = [];
let page = 1;
let pageSize = Number(getCookie("pageSize")) || 10;
let search = "";
let editingId = null;

/* Conference Logos (LOCAL FILES) */
const CONF_LOGOS = {
  ACC: "logos/acc.png",
  SEC: "logos/sec.png",
  B1G: "logos/b1g.png",
  BIG12: "logos/big12.png",
  PAC12: "logos/pac12.png",
  NCAA: "logos/ncaa.png"
};

/* Team → Conference (LOWERCASE KEYS so spacing/casing won’t break it) */
const TEAM_CONF = {
  "clemson": "ACC",
  "florida state": "ACC",
  "virginia tech": "ACC",

  "georgia": "SEC",
  "lsu": "SEC",
  "alabama": "SEC",

  "michigan": "B1G",
  "ohio state": "B1G",

  "texas": "SEC",

  "oregon": "B1G",
  "usc": "B1G"
};

function cleanTeamName(s) {
  return String(s || "").trim();
}
function teamKey(s) {
  return cleanTeamName(s).toLowerCase();
}
function getLogo(team) {
  const conf = TEAM_CONF[teamKey(team)] || "NCAA";
  return CONF_LOGOS[conf] || CONF_LOGOS.NCAA;
}

/* DOM */
const tbody = document.getElementById("gamesTbody");
const pageLabel = document.getElementById("pageLabel");
const searchInput = document.getElementById("searchInput");
const filterResult = document.getElementById("filterResult");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const form = document.getElementById("gameForm");

/* Stats */
const statTotal = document.getElementById("statTotalGames");
const statWL = document.getElementById("statWL");
const statAvg = document.getElementById("statAvgPF");
const statHigh = document.getElementById("statHighPF");

/* Page size selector */
document.querySelector(".tools").insertAdjacentHTML(
  "beforeend",
  `
<select id="pageSizeSelect" class="input">
  <option>5</option>
  <option>10</option>
  <option>20</option>
  <option>50</option>
</select>
`
);
const pageSizeSelect = document.getElementById("pageSizeSelect");
pageSizeSelect.value = pageSize;

/* Cookies */
function setCookie(n, v) {
  document.cookie = `${n}=${v};path=/`;
}
function getCookie(n) {
  return document.cookie
    .split("; ")
    .find(r => r.startsWith(n + "="))
    ?.split("=")[1];
}

/* Normalize backend (supports MANY possible field names) */
function normalizeGame(g) {
  const ha =
    g.home_away ??
    g.homeAway ??
    g.homeaway ??
    g.home ??
    g.ha ??
    "-";

  const pf =
    g.team_score ??
    g.teamScore ??
    g.pointsfor ??
    g.pointsFor ??
    g.pf ??
    0;

  const pa =
    g.opponent_score ??
    g.opponentScore ??
    g.pointsagainst ??
    g.pointsAgainst ??
    g.pa ??
    0;

  return {
    id: g.id,
    week: Number(g.week),
    team: cleanTeamName(g.team),
    opponent: cleanTeamName(g.opponent),
    ha: cleanTeamName(ha) || "-",
    pf: Number(pf || 0),
    pa: Number(pa || 0)
  };
}

/* Load */
async function loadAllGames() {
  const r = await fetch(`${API}/games`);
  const d = await r.json();
  allGames = (d.items || []).map(normalizeGame);
  render();
  updateStats();
}

/* Render */
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

  if (filterResult.value !== "ALL") {
    games = games.filter(g => (g.pf > g.pa ? "W" : "L") === filterResult.value);
  }

  games.sort((a, b) => a.week - b.week);

  const totalPages = Math.max(1, Math.ceil(games.length / pageSize));
  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;

  const slice = games.slice((page - 1) * pageSize, page * pageSize);

  tbody.innerHTML = "";

  slice.forEach(g => {
    tbody.innerHTML += `
<tr>
  <td>${g.week}</td>

  <td>
    <img src="${getLogo(g.team)}" width="40" onerror="this.src='${CONF_LOGOS.NCAA}'"><br>
    ${g.team}
  </td>

  <td>
    <img src="${getLogo(g.opponent)}" width="40" onerror="this.src='${CONF_LOGOS.NCAA}'"><br>
    ${g.opponent}
  </td>

  <td>${g.ha}</td>
  <td>${g.pf}</td>
  <td>${g.pa}</td>
  <td>${g.pf > g.pa ? "W" : "L"}</td>

  <td>
    <button onclick="editGame(${g.id})">Edit</button>
    <button onclick="delGame(${g.id})">Delete</button>
  </td>
</tr>`;
  });

  pageLabel.innerText = `Page ${page} of ${totalPages}`;
  setCookie("pageSize", pageSize);
}

/* Stats */
function updateStats() {
  const t = allGames.length;
  const w = allGames.filter(g => g.pf > g.pa).length;
  const avg = (allGames.reduce((a, b) => a + b.pf, 0) / Math.max(1, t)).toFixed(1);
  const high = allGames.reduce((m, g) => (g.pf > m.pf ? g : m), { pf: -1 });

  statTotal.innerText = t;
  statWL.innerText = `${w}/${t - w}`;
  statAvg.innerText = avg;
  statHigh.innerText = high.team ? `${high.team} (${high.pf})` : "—";
}

/* Delete */
window.delGame = async id => {
  if (!confirm("Delete?")) return;
  await fetch(`${API}/games/${id}`, { method: "DELETE" });
  loadAllGames();
};

/* Edit */
window.editGame = id => {
  const g = allGames.find(x => x.id === id);
  if (!g) return;

  editingId = id;

  team.value = g.team;
  opponent.value = g.opponent;
  week.value = g.week;
  pointsFor.value = g.pf;
  pointsAgainst.value = g.pa;

  // ✅ IMPORTANT: set the Home/Away dropdown
  homeAway.value = (g.ha === "Home" || g.ha === "Away") ? g.ha : "";

  switchView("formView");
};

/* Save (send BOTH snake_case + camelCase so your backend definitely accepts it) */
form.addEventListener("submit", async e => {
  e.preventDefault();

  const haValue = cleanTeamName(homeAway.value);

  const payload = {
    team: cleanTeamName(team.value),
    opponent: cleanTeamName(opponent.value),
    week: Number(week.value),

    // scores (send multiple aliases)
    team_score: Number(pointsFor.value),
    opponent_score: Number(pointsAgainst.value),
    teamScore: Number(pointsFor.value),
    opponentScore: Number(pointsAgainst.value),

    // home/away (send multiple aliases)
    home_away: haValue,
    homeAway: haValue
  };

  const url = editingId ? `${API}/games/${editingId}` : `${API}/games`;
  const method = editingId ? "PUT" : "POST";

  const resp = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  // If backend rejects, show it in console (helps debugging instantly)
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Save failed:", resp.status, text);
    alert("Save failed. Open Console (Inspect) to see why.");
    return;
  }

  editingId = null;
  form.reset();
  switchView("listView");
  loadAllGames();
});

/* Controls */
prevBtn.onclick = () => { if (page > 1) { page--; render(); } };
nextBtn.onclick = () => {
  const totalPages = Math.max(1, Math.ceil(allGames.length / pageSize));
  if (page < totalPages) { page++; render(); }
};

searchInput.oninput = e => { search = e.target.value; page = 1; render(); };
filterResult.onchange = () => { page = 1; render(); };
pageSizeSelect.onchange = e => { pageSize = Number(e.target.value); page = 1; render(); };

/* Tabs */
document.querySelectorAll(".tab").forEach(b => (b.onclick = () => switchView(b.dataset.view)));
function switchView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* Init */
loadAllGames();

