const API_URL = "https://college-football-game-tracker-part2-1.onrender.com/api";


let page = 1;
let editing = null;

const gamesDiv = document.getElementById("games");
const form = document.getElementById("form");

const team = document.getElementById("team");
const opponent = document.getElementById("opponent");
const week = document.getElementById("week");
const teamScore = document.getElementById("teamScore");
const oppScore = document.getElementById("oppScore");
const imageUrl = document.getElementById("imageUrl");

const search = document.getElementById("search");
const sort = document.getElementById("sort");
const sizeSelect = document.getElementById("pageSize");

sizeSelect.value = getCookie("size") || 10;

function setCookie(name,val){
document.cookie=`${name}=${val};path=/`;
}

function getCookie(name){
return document.cookie.split("; ").find(r=>r.startsWith(name+"="))?.split("=")[1];
}

async function load(){
setCookie("size",sizeSelect.value);

const res = await fetch(`${API}/games?page=${page}&size=${sizeSelect.value}&search=${search.value}&sort=${sort.value}`);
const data = await res.json();

gamesDiv.innerHTML="";

data.items.forEach(g=>{
const div=document.createElement("div");
div.className="card";

div.innerHTML=`
<img src="${g.image_url}" onerror="this.src='https://via.placeholder.com/120x80?text=No+Image'">
<div>
<b>${g.team}</b> vs ${g.opponent}<br>
Week ${g.week}<br>
${g.team_score} - ${g.opponent_score}<br>
<button onclick="edit(${g.id})">Edit</button>
<button onclick="del(${g.id})">Delete</button>
</div>
`;

gamesDiv.appendChild(div);
});

document.getElementById("page").innerText = page;

const stats = await fetch(`${API}/stats`).then(r=>r.json());
document.getElementById("stats").innerText =
`Total Games: ${stats.total} | Avg Score: ${stats.average_score}`;
}

window.edit = id=>{
fetch(`${API}/games?page=1&size=1000`).then(r=>r.json()).then(d=>{
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

window.del = id=>{
if(!confirm("Delete this game?")) return;
fetch(`${API}/games/${id}`,{method:"DELETE"}).then(load);
};

form.onsubmit=e=>{
e.preventDefault();

const payload={
team:team.value,
opponent:opponent.value,
week:+week.value,
team_score:+teamScore.value,
opponent_score:+oppScore.value,
image_url:imageUrl.value
};

fetch(editing?`${API}/games/${editing}`:`${API}/games`,{
method:editing?"PUT":"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(payload)
}).then(()=>{
editing=null;
form.reset();
load();
});
};

document.getElementById("prev").onclick=()=>{if(page>1){page--;load();}};
document.getElementById("next").onclick=()=>{page++;load();};

search.oninput=()=>{page=1;load();};
sort.onchange=()=>load();
sizeSelect.onchange=()=>load();

load();