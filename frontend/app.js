const API = "https://college-football-game-tracker-part2-1.onrender.com/api";

let allGames = [];
let page = 1;
let pageSize = Number(getCookie("pageSize")) || 10;
let search = "";
let editingId = null;

/* Conference Logos */
const CONF_LOGOS = {
  ACC: "logos/acc.png",
  SEC: "logos/sec.png",
  B1G: "logos/b1g.png",
  BIG12: "logos/big12.png",
  PAC12: "logos/pac12.png",
  NCAA: "logos/ncaa.png"
};

const TEAM_CONF = {
  "Clemson":"ACC",
  "Florida State":"ACC",
  "Virginia Tech":"ACC",

  "Georgia":"SEC",
  "LSU":"SEC",
  "Alabama":"SEC",

  "Michigan":"B1G",
  "Ohio State":"B1G",

  "Texas":"BIG12",

  "Oregon":"PAC12",
  "USC":"PAC12"
};

function getConferenceLogo(team){
  const conf = TEAM_CONF[team] || "NCAA";
  return CONF_LOGOS[conf];
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

/* Page size */
document.querySelector(".tools").insertAdjacentHTML("beforeend",`
<select id="pageSizeSelect" class="input">
<option>5</option>
<option>10</option>
<option>20</option>
<option>50</option>
</select>`);

const pageSizeSelect = document.getElementById("pageSizeSelect");
pageSizeSelect.value = pageSize;

/* Cookies */
function setCookie(n,v){document.cookie=`${n}=${v};path=/`;}
function getCookie(n){
 return document.cookie.split("; ").find(r=>r.startsWith(n+"="))?.split("=")[1];
}

/* Normalize backend */
function normalizeGame(g){
 return {
  id:g.id,
  week:Number(g.week),
  team:g.team,
  opponent:g.opponent,
  pf:Number(g.team_score || g.pointsfor || 0),
  pa:Number(g.opponent_score || g.pointsagainst || 0)
 };
}

/* Load */
async function loadAllGames(){
 const res=await fetch(`${API}/games`);
 const data=await res.json();
 allGames=data.items.map(normalizeGame);
 render();
 updateStats();
}

/* Render */
function render(){
 let games=[...allGames];

 if(search){
  const s=search.toLowerCase();
  games=games.filter(g=>g.team.toLowerCase().includes(s)||g.opponent.toLowerCase().includes(s));
 }

 if(filterResult.value!=="ALL"){
  games=games.filter(g=>(g.pf>g.pa?"W":"L")===filterResult.value);
 }

 games.sort((a,b)=>a.week-b.week);

 const totalPages=Math.max(1,Math.ceil(games.length/pageSize));
 if(page>totalPages) page=totalPages;

 const slice=games.slice((page-1)*pageSize,page*pageSize);

 tbody.innerHTML="";

 slice.forEach(g=>{
  tbody.innerHTML+=`
<tr>
<td>${g.week}</td>

<td>
<img src="${getConferenceLogo(g.team)}" width="45">
<br>${g.team}
</td>

<td>
<img src="${getConferenceLogo(g.opponent)}" width="45">
<br>${g.opponent}
</td>

<td>${g.pf}</td>
<td>${g.pa}</td>
<td>${g.pf>g.pa?"W":"L"}</td>
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
 statWL.innerText=`${wins}/${total-wins}`;
 statAvg.innerText=avg;
 statHigh.innerText=high.team?`${high.team} (${high.pf})`:"—";
}

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

/* Save (FIXED FIELD NAMES) */
form.addEventListener("submit",async e=>{
 e.preventDefault();

 const payload={
  team:team.value,
  opponent:opponent.value,
  week:Number(week.value),
  team_score:Number(pointsFor.value),      // FIXED
  opponent_score:Number(pointsAgainst.value) // FIXED
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
