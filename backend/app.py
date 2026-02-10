from flask import Flask, request, jsonify
from flask_cors import CORS
import os, json, uuid

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")

PAGE_DEFAULT = 1
PAGE_SIZE_DEFAULT = 10
PAGE_SIZE_MAX = 50

PLACEHOLDER_IMAGE = "https://via.placeholder.com/120x80?text=No+Image"

def title_case_words(s: str) -> str:
    s = (s or "").strip()
    parts = [p for p in s.split() if p]
    return " ".join([p[:1].upper() + p[1:].lower() for p in parts])

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []

def save_data(items):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

def ensure_starter_data():
    items = load_data()
    if len(items) >= 30:
        return

    starter = []
    seeds = [
        ("Clemson","Georgia Tech","Home",1,31,17,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/228.png"),
        ("Clemson","Florida State","Away",2,24,28,"L","https://a.espncdn.com/i/teamlogos/ncaa/500/228.png"),
        ("Alabama","Auburn","Home",1,35,14,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/333.png"),
        ("Georgia","Florida","Home",1,29,13,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/61.png"),
        ("Michigan","Ohio State","Home",1,27,24,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/130.png"),
        ("USC","UCLA","Home",1,24,31,"L","https://a.espncdn.com/i/teamlogos/ncaa/500/30.png"),
        ("Texas","Oklahoma","Away",1,38,35,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/251.png"),
        ("Arizona","Utah","Home",1,24,21,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/12.png"),
        ("Oregon State","Washington State","Home",1,21,17,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/204.png"),
        ("LSU","Texas A&M","Away",2,28,24,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/99.png"),
    ]

    week = 1
    while len(starter) < 30:
        t,o,ha,w,pf,pa,r,img = seeds[len(starter)%len(seeds)]
        starter.append({
            "id": str(uuid.uuid4()),
            "team": title_case_words(t),
            "opponent": title_case_words(o),
            "homeAway": ha,
            "week": week,
            "pointsFor": pf,
            "pointsAgainst": pa,
            "result": r,
            "imageUrl": img or PLACEHOLDER_IMAGE
        })
        week = 1 if week >= 12 else week + 1

    save_data(starter)

def validate_game(payload, require_id=False):
    errors = []

    team = title_case_words(payload.get("team", ""))
    opponent = title_case_words(payload.get("opponent", ""))
    homeAway = payload.get("homeAway", "")
    result = payload.get("result", "")
    imageUrl = (payload.get("imageUrl", "") or "").strip()

    try:
        week = int(payload.get("week", -1))
        pf = int(payload.get("pointsFor", -1))
        pa = int(payload.get("pointsAgainst", -1))
    except Exception:
        week = pf = pa = -1

    if require_id and not payload.get("id"):
        errors.append("Missing id.")
    if not team:
        errors.append("Team is required.")
    if not opponent:
        errors.append("Opponent is required.")
    if homeAway not in ["Home","Away"]:
        errors.append("Home/Away must be Home or Away.")
    if week < 1 or week > 20:
        errors.append("Week must be 1–20.")
    if pf < 0 or pf > 100:
        errors.append("PointsFor must be 0–100.")
    if pa < 0 or pa > 100:
        errors.append("PointsAgainst must be 0–100.")
    if result not in ["W","L"]:
        errors.append("Result must be W or L.")
    if not imageUrl:
        errors.append("Image URL is required.")

    cleaned = {
        "id": payload.get("id"),
        "team": team,
        "opponent": opponent,
        "homeAway": homeAway,
        "week": week,
        "pointsFor": pf,
        "pointsAgainst": pa,
        "result": result,
        "imageUrl": imageUrl
    }
    return errors, cleaned

@app.get("/api/games")
def list_games():
    items = load_data()

    q = (request.args.get("q") or "").lower()
    rf = (request.args.get("result") or "").upper()

    if q:
        items = [g for g in items if q in g["team"].lower() or q in g["opponent"].lower()]
    if rf in ["W","L"]:
        items = [g for g in items if g["result"] == rf]

    sort_by = request.args.get("sort_by","week")
    sort_dir = request.args.get("sort_dir","asc")
    reverse = sort_dir == "desc"

    if sort_by == "team":
        items.sort(key=lambda g:g["team"], reverse=reverse)
    elif sort_by == "pointsFor":
        items.sort(key=lambda g:g["pointsFor"], reverse=reverse)
    else:
        items.sort(key=lambda g:g["week"], reverse=reverse)

    page = int(request.args.get("page", PAGE_DEFAULT))
    page_size = int(request.args.get("page_size", PAGE_SIZE_DEFAULT))
    page_size = min(max(page_size,1), PAGE_SIZE_MAX)

    start = (page-1)*page_size
    end = start+page_size

    return jsonify({
        "items": items[start:end],
        "total": len(items),
        "page": page,
        "page_size": page_size
    })

@app.get("/api/games/<game_id>")
def get_game(game_id):
    for g in load_data():
        if g["id"] == game_id:
            return jsonify(g)
    return jsonify({"error":"Not found"}),404

@app.post("/api/games")
def create_game():
    payload = request.get_json(force=True) or {}
    errors, cleaned = validate_game(payload)
    if errors:
        return jsonify({"error":" | ".join(errors)}),400
    cleaned["id"]=str(uuid.uuid4())
    items=load_data()
    items.append(cleaned)
    save_data(items)
    return jsonify(cleaned),201

@app.put("/api/games/<game_id>")
def update_game(game_id):
    payload=request.get_json(force=True) or {}
    payload["id"]=game_id
    errors,cleaned=validate_game(payload,True)
    if errors:
        return jsonify({"error":" | ".join(errors)}),400
    items=load_data()
    for i,g in enumerate(items):
        if g["id"]==game_id:
            items[i]=cleaned
            save_data(items)
            return jsonify(cleaned)
    return jsonify({"error":"Not found"}),404

@app.delete("/api/games/<game_id>")
def delete_game(game_id):
    items=load_data()
    new=[g for g in items if g["id"]!=game_id]
    if len(new)==len(items):
        return jsonify({"error":"Not found"}),404
    save_data(new)
    return jsonify({"ok":True})

@app.get("/api/stats")
def stats():
    items=load_data()
    total=len(items)
    wins=sum(1 for g in items if g["result"]=="W")
    losses=sum(1 for g in items if g["result"]=="L")
    avg_pf=(sum(g["pointsFor"] for g in items)/total) if total else 0
    high=max(items,key=lambda g:g["pointsFor"]) if items else None

    return jsonify({
        "totalGames":total,
        "wins":wins,
        "losses":losses,
        "avgPF":avg_pf,
        "highPFGame":high
    })

if __name__=="__main__":
    ensure_starter_data()
    app.run(host="0.0.0.0",port=5001)
