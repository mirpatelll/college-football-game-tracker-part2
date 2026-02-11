import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DATABASE_URL = os.environ.get("DATABASE_URL")
PLACEHOLDER = "https://via.placeholder.com/300x150?text=Game"


def get_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL missing")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return "", 200


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

    cur.execute("SELECT COUNT(*)::int AS wins FROM games WHERE team_score > opponent_score")
    wins = cur.fetchone()["wins"]

    conn.close()

    return jsonify({
        "total": total,
        "wins": wins,
        "losses": total - wins,
        "avg_pf": round(avg_pf, 2)
    })


# ---------- CREATE ----------
@app.route("/api/games", methods=["POST", "OPTIONS"])
def create_game():
    d = request.get_json() or {}

    team = d.get("team", "").strip()
    opponent = d.get("opponent", "").strip()
    week = d.get("week")
    team_score = d.get("teamScore") or d.get("team_score")
    opponent_score = d.get("opponentScore") or d.get("opponent_score")
    image_url = d.get("imageUrl") or d.get("image_url") or PLACEHOLDER

    if not team or not opponent or week is None:
        return jsonify({"error": "Missing fields"}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO games (team, opponent, week, team_score, opponent_score, image_url)
        VALUES (%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (team, opponent, int(week), int(team_score), int(opponent_score), image_url))

    new_id = cur.fetchone()["id"]
    conn.commit()
    conn.close()

    return jsonify({"id": new_id}), 201


# ---------- UPDATE ----------
@app.route("/api/games/<int:gid>", methods=["PUT", "OPTIONS"])
def update_game(gid):
    d = request.get_json() or {}

    team = d.get("team", "").strip()
    opponent = d.get("opponent", "").strip()
    week = d.get("week")
    team_score = d.get("teamScore") or d.get("team_score")
    opponent_score = d.get("opponentScore") or d.get("opponent_score")
    image_url = d.get("imageUrl") or d.get("image_url") or PLACEHOLDER

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE games
        SET team=%s,
            opponent=%s,
            week=%s,
            team_score=%s,
            opponent_score=%s,
            image_url=%s
        WHERE id=%s
    """, (team, opponent, int(week), int(team_score), int(opponent_score), image_url, gid))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})


# ---------- DELETE ----------
@app.route("/api/games/<int:gid>", methods=["DELETE", "OPTIONS"])
def delete_game(gid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s", (gid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})


if __name__ == "__main__":
    app.run()
