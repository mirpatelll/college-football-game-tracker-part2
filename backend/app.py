import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Allow Netlify (and others) to call your API
CORS(app, resources={r"/api/*": {"origins": "*"}})

DATABASE_URL = os.environ.get("DATABASE_URL")

PLACEHOLDER = "https://via.placeholder.com/300x150?text=Game"


def get_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL env var is missing on Render.")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


# ---------- OPTIONS preflight (prevents 405 on CORS preflight) ----------
@app.before_request
def _handle_options():
    if request.method == "OPTIONS":
        return ("", 200)


# ---------- LIST ----------
@app.route("/api/games", methods=["GET", "OPTIONS"])
def list_games():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM games ORDER BY week, id")
    rows = cur.fetchall()
    conn.close()
    return jsonify({"items": rows})


# ---------- STATS ----------
@app.route("/api/stats", methods=["GET", "OPTIONS"])
def stats():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*)::int AS total FROM games")
    total = cur.fetchone()["total"]

    cur.execute("SELECT AVG(team_score)::float AS avg_pf FROM games")
    avg_pf = cur.fetchone()["avg_pf"] or 0

    cur.execute("""
        SELECT COUNT(*)::int AS wins
        FROM games
        WHERE team_score > opponent_score
    """)
    wins = cur.fetchone()["wins"]
    losses = total - wins

    conn.close()

    return jsonify({
        "total": total,
        "wins": wins,
        "losses": losses,
        "avg_pf": round(avg_pf, 2),
    })


# ---------- CREATE ----------
@app.route("/api/games", methods=["POST", "OPTIONS"])
def create_game():
    data = request.get_json(silent=True) or {}

    # Accept both snake_case and camelCase
    team = (data.get("team") or "").strip()
    opponent = (data.get("opponent") or "").strip()
    home_away = (data.get("homeAway") or data.get("home_away") or "Home").strip()
    week = data.get("week")
    team_score = data.get("team_score", data.get("teamScore"))
    opponent_score = data.get("opponent_score", data.get("opponentScore"))
    image_url = data.get("image_url", data.get("imageUrl")) or PLACEHOLDER

    if not team or not opponent or week is None or team_score is None or opponent_score is None:
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO games (team, opponent, home_away, week, team_score, opponent_score, image_url)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        team,
        opponent,
        home_away,
        int(week),
        int(team_score),
        int(opponent_score),
        image_url
    ))

    new_id = cur.fetchone()["id"]
    conn.commit()
    conn.close()

    return jsonify({"status": "ok", "id": new_id}), 201


# ---------- UPDATE ----------
@app.route("/api/games/<int:game_id>", methods=["PUT", "OPTIONS"])
def update_game(game_id):
    data = request.get_json(silent=True) or {}

    team = (data.get("team") or "").strip()
    opponent = (data.get("opponent") or "").strip()
    home_away = (data.get("homeAway") or data.get("home_away") or "Home").strip()
    week = data.get("week")
    team_score = data.get("team_score", data.get("teamScore"))
    opponent_score = data.get("opponent_score", data.get("opponentScore"))
    image_url = data.get("image_url", data.get("imageUrl")) or PLACEHOLDER

    if not team or not opponent or week is None or team_score is None or opponent_score is None:
        return jsonify({"error": "Missing required fields"}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE games
        SET team=%s, opponent=%s, home_away=%s, week=%s,
            team_score=%s, opponent_score=%s, image_url=%s
        WHERE id=%s
    """, (
        team,
        opponent,
        home_away,
        int(week),
        int(team_score),
        int(opponent_score),
        image_url,
        game_id
    ))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})


# ---------- DELETE ----------
@app.route("/api/games/<int:game_id>", methods=["DELETE", "OPTIONS"])
def delete_game(game_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s", (game_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})
