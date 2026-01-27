from flask import Flask, request, jsonify
from flask_cors import CORS
import os, json, uuid

app = Flask(__name__)
CORS(app)  # allow frontend to call API (local + Netlify)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")

PAGE_DEFAULT = 1
PAGE_SIZE_DEFAULT = 10
PAGE_SIZE_MAX = 50

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

    # create starter dataset (30+)
    starter = []
    seeds = [
        ("Clemson", "Georgia Tech", "Home", 1, 31, 17, "W"),
        ("Clemson", "Florida State", "Away", 2, 24, 28, "L"),
        ("Alabama", "Auburn", "Home", 1, 35, 14, "W"),
        ("Georgia", "Florida", "Home", 1, 29, 13, "W"),
        ("Michigan", "Ohio State", "Home", 1, 27, 24, "W"),
        ("USC", "UCLA", "Home", 1, 24, 31, "L"),
        ("Texas", "Oklahoma", "Away", 1, 38, 35, "W"),
        ("Arizona", "Utah", "Home", 1, 24, 21, "W"),
        ("Oregon State", "Washington State", "Home", 1, 21, 17, "W"),
        ("LSU", "Texas A&M", "Away", 2, 28, 24, "W"),
    ]

    # expand to 30 by repeating with week shifts
    week = 1
    while len(starter) < 30:
        base = seeds[len(starter) % len(seeds)]
        t, o, ha, w, pf, pa, r = base
        starter.append({
            "id": str(uuid.uuid4()),
            "team": title_case_words(t),
            "opponent": title_case_words(o),
            "homeAway": ha,
            "week": week,
            "pointsFor": int(pf),
            "pointsAgainst": int(pa),
            "result": r
        })
        week = 1 if week >= 12 else week + 1

    save_data(starter)

def validate_game(payload, require_id=False):
    errors = []

    team = title_case_words(payload.get("team", ""))
    opponent = title_case_words(payload.get("opponent", ""))
    homeAway = payload.get("homeAway", "")
    result = payload.get("result", "")

    try:
        week = int(payload.get("week", -1))
    except Exception:
        week = -1

    try:
        pf = int(payload.get("pointsFor", -1))
    except Exception:
        pf = -1

    try:
        pa = int(payload.get("pointsAgainst", -1))
    except Exception:
        pa = -1

    if require_id and not payload.get("id"):
        errors.append("Missing id.")

    if not team or len(team) < 2:
        errors.append("Team is required.")
    if not opponent or len(opponent) < 2:
        errors.append("Opponent is required.")
    if homeAway not in ["Home", "Away"]:
        errors.append("Home/Away must be Home or Away.")
    if week < 1 or week > 20:
        errors.append("Week must be 1–20.")
    if pf < 0 or pf > 100:
        errors.append("PointsFor must be 0–100.")
    if pa < 0 or pa > 100:
        errors.append("PointsAgainst must be 0–100.")
    if result not in ["W", "L"]:
        errors.append("Result must be W or L.")

    cleaned = {
        "id": payload.get("id"),
        "team": team,
        "opponent": opponent,
        "homeAway": homeAway,
        "week": week,
        "pointsFor": pf,
        "pointsAgainst": pa,
        "result": result
    }
    return errors, cleaned


def boot():
    ensure_starter_data()

@app.get("/api/health")
def health():
    return jsonify({"ok": True})

@app.get("/api/games")
def list_games():
    items = load_data()

    # optional server-side filtering
    q = (request.args.get("q") or "").strip().lower()
    rf = (request.args.get("result") or "").strip().upper()

    if q:
        items = [
            g for g in items
            if q in (g.get("team","").lower()) or q in (g.get("opponent","").lower())
        ]

    if rf in ["W", "L"]:
        items = [g for g in items if (g.get("result") == rf)]

    # stable sort: week then team
    items.sort(key=lambda g: (g.get("week", 0), g.get("team", "")))

    # paging
    try:
        page = int(request.args.get("page", PAGE_DEFAULT))
    except Exception:
        page = PAGE_DEFAULT

    try:
        page_size = int(request.args.get("page_size", PAGE_SIZE_DEFAULT))
    except Exception:
        page_size = PAGE_SIZE_DEFAULT

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = PAGE_SIZE_DEFAULT
    if page_size > PAGE_SIZE_MAX:
        page_size = PAGE_SIZE_MAX

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return jsonify({
        "items": page_items,
        "total": total,
        "page": page,
        "page_size": page_size
    })

@app.get("/api/games/<game_id>")
def get_game(game_id):
    items = load_data()
    for g in items:
        if g.get("id") == game_id:
            return jsonify(g)
    return jsonify({"error": "Not found"}), 404

@app.post("/api/games")
def create_game():
    payload = request.get_json(force=True, silent=True) or {}
    errors, cleaned = validate_game(payload, require_id=False)
    if errors:
        return jsonify({"error": " | ".join(errors)}), 400

    items = load_data()
    cleaned["id"] = str(uuid.uuid4())
    items.append(cleaned)
    save_data(items)

    return jsonify(cleaned), 201

@app.put("/api/games/<game_id>")
def update_game(game_id):
    payload = request.get_json(force=True, silent=True) or {}
    payload["id"] = game_id
    errors, cleaned = validate_game(payload, require_id=True)
    if errors:
        return jsonify({"error": " | ".join(errors)}), 400

    items = load_data()
    for i, g in enumerate(items):
        if g.get("id") == game_id:
            items[i] = cleaned
            save_data(items)
            return jsonify(cleaned)

    return jsonify({"error": "Not found"}), 404

@app.delete("/api/games/<game_id>")
def delete_game(game_id):
    items = load_data()
    new_items = [g for g in items if g.get("id") != game_id]
    if len(new_items) == len(items):
        return jsonify({"error": "Not found"}), 404
    save_data(new_items)
    return jsonify({"ok": True})

@app.get("/api/stats")
def stats():
    items = load_data()
    total = len(items)
    wins = sum(1 for g in items if g.get("result") == "W")
    losses = sum(1 for g in items if g.get("result") == "L")
    avg_pf = (sum(int(g.get("pointsFor", 0)) for g in items) / total) if total else 0.0

    high = None
    for g in items:
        if high is None or int(g.get("pointsFor", 0)) > int(high.get("pointsFor", 0)):
            high = g

    return jsonify({
        "totalGames": total,
        "wins": wins,
        "losses": losses,
        "avgPF": avg_pf,
        "highPFGame": high
    })

if __name__ == "__main__":
    ensure_starter_data()
    import os
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
