const API = "https://college-football-game-tracker-part2-1.onrender.com/api";

let allGames = [];
let page = 1;
let pageSize = Number(getCookie("pageSize")) || 10;
let search = "";
let sortField = "week";
let sortDir = "asc";
let editingId = null;

const tbody = document.getElementById("gamesTbody");
const pageLabel = document.getElementById("pageLabel");
const searchInput = document.getElementById("searchInput");
const filterResult = document.getElementById("filterResult");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const form = document.getElementById("gameForm");

const statTotal = document.getElementById("statTotalGames");
const statWL = document.getElementById("statWL");
const statAvg = document.getElementById("statAvgPF");
const statHigh = document.getElementById("statHighPF");

function setCookie(n, v) {
  document.cookie = `${n}=${v};path=/`;
}

function getCookie(n) {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith(n + "="))
    ?.split("=")[1];
}

function normalize(g) {
  return {
    id: g.id,
    week: Number(g.week),
    team: g.team,
    opponent: g.opponent,
    pf: Number(g.pointsfor),
    pa: Number(g.pointsagainst),
  };
}

async function loadAllGames() {
  const res = await fetch(`${API}/games`);
  const data = await res.json();
  allGames = data.items.map(normalize);
  render();
  loadStats();
}

function render() {
  let games = [...allGames];

  if (search) {
    games = games.filter(
      g =>
        g.team.toLowerCase().includes(search.toLowerCase()) ||
        g.opponent.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (filterResult.value !== "ALL") {
    games = games.filter(g =>
      (g.pf > g.pa ? "W" : "L") === filterResult.value
    );
  }

  games.sort((a,b)=>a.week-b.week);

  const totalPages = Math.max(1, Math.ceil(games.length / pageSize));
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * pageSize;
  const slice = games.slice(start, start + pageSize);

  tbody.innerHTML = "";
  slice.forEach(g=>{
    tbody.innerHTML += `
      <tr>
        <td>${g.week}</td>
        <td>${g.team}</td>
        <td>${g.opponent}</td>
        <td>${g.pf}</td>
        <td>${g.pa}</td>
        <td>${g.pf>g.pa?"W":"L"}</td>
        <td>
          <button onclick="editGame(${g.id})">Edit</button>
          <button onclick="delGame(${g.id})">Delete</button>
        </td>
      </tr>`;
  });

  pageLabel.innerText = `Page ${page} of ${totalPages}`;
}

async function loadStats() {
  const res = await fetch(`${API}/stats`);
  const s = await res.json();

  statTotal.innerText = s.total;
  statWL.innerText = `${s.wins} / ${s.losses}`;
  statAvg.innerText = s.avg_pf;

  let top = allGames.sort((a,b)=>b.pf-a.pf)[0];
  if(top){
    statHigh.innerText = `${top.team} (${top.pf})`;
  }
}

window.delGame = async id=>{
  await fetch(`${API}/games/${id}`,{method:"DELETE"});
  loadAllGames();
};

window.editGame = id=>{
  const g = allGames.find(x=>x.id===id);
  editingId=id;
  team.value=g.team;
  opponent.value=g.opponent;
  week.value=g.week;
  pointsFor.value=g.pf;
  pointsAgainst.value=g.pa;
  switchView("formView");
};

form.addEventListener("submit", async e=>{
  e.preventDefault();

  const payload={
    team:team.value,
    opponent:opponent.value,
    week:Number(week.value),
    teamScore:Number(pointsFor.value),
    opponentScore:Number(pointsAgainst.value)
  };

  const url = editingId?`${API}/games/${editingId}`:`${API}/games`;
  const method = editingId?"PUT":"POST";

  await fetch(url,{
    method,
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });

  editingId=null;
  form.reset();
  switchView("listView");
  loadAllGames();
});

prevBtn.onclick=()=>{if(page>1){page--;render();}};
nextBtn.onclick=()=>{page++;render();};
searchInput.oninput=e=>{search=e.target.value;page=1;render();};
filterResult.onchange=()=>{page=1;render();};

function switchView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

loadAllGames();
