const API = "https://college-football-game-tracker-part2-1.onrender.com/api";

let allGames = [];
let page = 1;
let pageSize = Number(getCookie("pageSize")) || 10;
let search = "";
let sortField = "week";
let sortDir = "asc";
let editingId = null;

const PLACEHOLDER = "https://via.placeholder.com/80x50?text=Game";

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
  return document.cookie.split("; ").find(r => r.startsWith(n+"="))?.split("=")[1];
}

/* Normalize backend */
function normalizeGame(g) {
  return {
    id: g.id,
    week: Number(g.week),
    team: g.team,
    opponent: g.opponent,
    pf: Number(g.pointsfor || g.team_score || 0),
    pa: Number(g.pointsagainst || g.opponent_score || 0),
    image: g.imageurl || g.image_url || PLACEHOLDER
  };
}

/* Load */
async function loadAllGames() {
  const res = await fetch(`${API}/games`);
  const data = await res.json();
  allGames = data.items.map(normalizeGame);
  render();
  updateStats();
}

/* Render list */
function render() {
  let games = [...allGames];

  if (search) {
    const s = search.toLowerCase();
    games = games.filter(g => g.team.toLowerCase().includes(s) || g.opponent.toLowerCase().includes(s));
  }

  if (filterResult.value !== "ALL") {
    games = games.filter(g => (g.pf > g.pa ? "W" : "L") === filterResult.value);
  }

  games.sort((a,b)=>a.week-b.week);

  const totalPages = Math.max(1, Math.ceil(games.length/pageSize));
  if(page>totalPages) page=totalPages;

  const start=(page-1)*pageSize;
  const slice=games.slice(start,start+pageSize);

  tbody.innerHTML="";

  slice.forEach(g=>{
    tbody.innerHTML+=`
<tr>
<td>${g.week}</td>
<td><img src="${g.image}" width="60" onerror="this.src='${PLACEHOLDER}'"><br>${g.team}</td>
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

  pageLabel.innerText=`Page ${page} of ${totalPages}`;
  setCookie("pageSize",pageSize);
}

/* Stats */
function updateStats(){
  const total=allGames.length;
  const wins=allGames.filter(g=>g.pf>g.pa).length;
  const avg=(allGames.reduce((a,b)=>a+b.pf,0)/Math.max(1,total)).toFixed(1);
  const high=allGames.reduce((m,g)=>g.pf>m.pf?g:m,{pf:-1});

  statTotal.innerText=total;
  statWL.innerText=`${wins} / ${total-wins}`;
  statAvg.innerText=avg;
  statHigh.innerText=high.team?`${high.team} (${high.pf})`:"—";
}

/* Delete */
window.delGame=async(id)=>{
 if(!confirm("Delete this game?"))return;
 await fetch(`${API}/games/${id}`,{method:"DELETE"});
 loadAllGames();
};

/* Edit */
window.editGame=id=>{
 const g=allGames.find(x=>x.id===id);
 editingId=id;
 team.value=g.team;
 opponent.value=g.opponent;
 week.value=g.week;
 pointsFor.value=g.pf;
 pointsAgainst.value=g.pa;
 switchView("formView");
};

/* Save */
form.addEventListener("submit",async e=>{
 e.preventDefault();

 const payload={
 team:team.value,
 opponent:opponent.value,
 week:Number(week.value),
 teamScore:Number(pointsFor.value),
 opponentScore:Number(pointsAgainst.value),
 imageUrl:PLACEHOLDER
 };

 const url=editingId?`${API}/games/${editingId}`:`${API}/games`;
 const method=editingId?"PUT":"POST";

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

/* Controls */
prevBtn.onclick=()=>{if(page>1){page--;render();}};
nextBtn.onclick=()=>{page++;render();};

searchInput.oninput=e=>{search=e.target.value;page=1;render();};
filterResult.onchange=()=>{page=1;render();};
pageSizeSelect.onchange=e=>{pageSize=Number(e.target.value);page=1;render();};

/* Tabs */
document.querySelectorAll(".tab").forEach(b=>{
 b.onclick=()=>switchView(b.dataset.view);
});
function switchView(id){
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 document.getElementById(id).classList.add("active");
}

/* Init */
loadAllGames();
