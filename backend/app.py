import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}})

DATABASE_URL = os.environ.get("DATABASE_URL")
PORT = int(os.environ.get("PORT", 5000))

PLACEHOLDER = "https://via.placeholder.com/300x150?text=Game"


def get_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL env var missing.")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


# ---------------- OPTIONS PREFLIGHT ----------------
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return "", 200


# ---------------- LIST ----------------
@app.route("/api/games", methods=["GET"])
def list_games():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM games ORDER BY week,id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"items": rows})


# ---------------- STATS ----------------
@app.route("/api/stats", methods=["GET"])
def stats():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*)::int AS total FROM games")
    total = cur.fetchone()["total"]

    cur.execute("SELECT AVG(team_score)::float AS avg FROM games")
    avg_pf = cur.fetchone()["avg"] or 0

    cur.execute("""
        SELECT COUNT(*)::int AS wins
        FROM games
        WHERE team_score > opponent_score
    """)
    wins = cur.fetchone()["wins"]
    losses = total - wins

    cur.close()
    conn.close()

    return jsonify({
        "total": total,
        "wins": wins,
        "losses": losses,
        "avg_pf": round(avg_pf, 2)
    })


# ---------------- CREATE ----------------
@app.route("/api/games", methods=["POST"])
def create_game():
    data = request.json or {}

    team = data.get("team","").strip()
    opponent = data.get("opponent","").strip()
    home_away = data.get("homeAway") or data.get("home_away") or "Home"
    week = data.get("week")
    team_score = data.get("teamScore", data.get("team_score"))
    opponent_score = data.get("opponentScore", data.get("opponent_score"))
    image_url = data.get("imageUrl", data.get("image_url")) or PLACEHOLDER

    if not team or not opponent or week is None:
        return jsonify({"error":"Missing fields"}),400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO games(team,opponent,home_away,week,team_score,opponent_score,image_url)
        VALUES(%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """,(team,opponent,home_away,int(week),int(team_score),int(opponent_score),image_url))

    new_id = cur.fetchone()["id"]

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"id":new_id}),201


# ---------------- UPDATE ----------------
@app.route("/api/games/<int:game_id>", methods=["PUT"])
def update_game(game_id):
    data = request.json or {}

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE games
        SET team=%s, opponent=%s, home_away=%s, week=%s,
            team_score=%s, opponent_score=%s, image_url=%s
        WHERE id=%s
        RETURNING id
    """,(
        data["team"],
        data["opponent"],
        data.get("homeAway") or data.get("home_away"),
        int(data["week"]),
        int(data.get("teamScore",data.get("team_score"))),
        int(data.get("opponentScore",data.get("opponent_score"))),
        data.get("imageUrl",data.get("image_url")) or PLACEHOLDER,
        game_id
    ))

    updated = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    if not updated:
        return jsonify({"error":"Not found"}),404

    return jsonify({"status":"ok"})


# ---------------- DELETE ----------------
@app.route("/api/games/<int:game_id>", methods=["DELETE"])
def delete_game(game_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s RETURNING id",(game_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not deleted:
        return jsonify({"error":"Not found"}),404

    return jsonify({"status":"deleted"})


# ---------------- KEEP RENDER ALIVE ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
