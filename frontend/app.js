const API = "https://college-football-game-tracker-part2-1.onrender.com/api";



let page=1;
let editing=null;

const gamesDiv=document.getElementById("games");
const statsDiv=document.getElementById("statsCards");

const team=document.getElementById("team");
const opponent=document.getElementById("opponent");
const week=document.getElementById("week");
const teamScore=document.getElementById("teamScore");
const oppScore=document.getElementById("oppScore");
const imageUrl=document.getElementById("imageUrl");

const search=document.getElementById("search");
const sort=document.getElementById("sort");
const sizeSelect=document.getElementById("pageSize");

sizeSelect.value=getCookie("size")||10;

function setCookie(n,v){document.cookie=`${n}=${v};path=/`;}
function getCookie(n){return document.cookie.split("; ").find(r=>r.startsWith(n+"="))?.split("=")[1];}

async function load(){
setCookie("size",sizeSelect.value);

const r=await fetch(`${API}/games?page=${page}&size=${sizeSelect.value}&search=${search.value}&sort=${sort.value}`);
const d=await r.json();

gamesDiv.innerHTML="";

d.items.forEach(g=>{
gamesDiv.innerHTML+=`
<div class="card">
<img src="${g.image_url}" onerror="this.src='https://via.placeholder.com/300x150?text=No+Image'">
<div class="card-body">
<b>${g.team}</b> vs ${g.opponent}<br>
Week ${g.week}<br>
${g.team_score} - ${g.opponent_score}<br><br>
<button onclick="edit(${g.id})">Edit</button>
<button onclick="del(${g.id})">Delete</button>
</div>
</div>`;
});

document.getElementById("page").innerText=page;

const s=await fetch(`${API}/stats`).then(r=>r.json());

statsDiv.innerHTML=`
<div class="stat">Total Games: ${s.total}</div>
<div class="stat">Average Score: ${s.average_score}</div>
<div class="stat">Page Size: ${sizeSelect.value}</div>
`;
}

window.edit=id=>{
fetch(`${API}/games?page=1&size=500`).then(r=>r.json()).then(d=>{
const g=d.items.find(x=>x.id===id);
editing=id;
team.value=g.team;
opponent.value=g.opponent;
week.value=g.week;
teamScore.value=g.team_score;
oppScore.value=g.opponent_score;
imageUrl.value=g.image_url;
});
};

window.del=id=>{
if(!confirm("Delete game?"))return;
fetch(`${API}/games/${id}`,{method:"DELETE"}).then(load);
};

document.getElementById("form").onsubmit=e=>{
e.preventDefault();

fetch(editing?`${API}/games/${editing}`:`${API}/games`,{
method:editing?"PUT":"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
team:team.value,
opponent:opponent.value,
week:+week.value,
team_score:+teamScore.value,
opponent_score:+oppScore.value,
image_url:imageUrl.value
})
}).then(()=>{
editing=null;
e.target.reset();
load();
});
};

document.getElementById("prev").onclick=()=>{if(page>1){page--;load();}};
document.getElementById("next").onclick=()=>{page++;load();};

search.oninput=()=>{page=1;load();}
sort.onchange=()=>load();
sizeSelect.onchange=()=>load();

document.getElementById("gamesTab").onclick=()=>{
document.getElementById("gamesView").classList.remove("hidden");
document.getElementById("statsView").classList.add("hidden");
};

document.getElementById("statsTab").onclick=()=>{
document.getElementById("statsView").classList.remove("hidden");
document.getElementById("gamesView").classList.add("hidden");
};

load();