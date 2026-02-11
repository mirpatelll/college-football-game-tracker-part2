import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")
PORT = int(os.environ.get("PORT", 5000))

PLACEHOLDER = "https://via.placeholder.com/300x150?text=Game"


def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


@app.before_request
def options():
    if request.method == "OPTIONS":
        return "", 200


# ---------- LIST ----------
@app.route("/api/games", methods=["GET"])
def list_games():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM games ORDER BY week, game_id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"items": rows})


# ---------- STATS ----------
@app.route("/api/stats", methods=["GET"])
def stats():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*)::int AS total FROM games")
    total = cur.fetchone()["total"]

    cur.execute("SELECT AVG(team_score)::float AS avg FROM games")
    avg = cur.fetchone()["avg"] or 0

    cur.execute("SELECT COUNT(*)::int AS wins FROM games WHERE team_score > opponent_score")
    wins = cur.fetchone()["wins"]
    losses = total - wins

    cur.close()
    conn.close()

    return jsonify({"total": total, "wins": wins, "losses": losses, "avg_pf": round(avg,2)})


# ---------- CREATE ----------
@app.route("/api/games", methods=["POST"])
def create():
    d = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO games(team,opponent,home_away,week,team_score,opponent_score,image_url)
        VALUES(%s,%s,%s,%s,%s,%s,%s)
        RETURNING game_id
    """,(
        d["team"],
        d["opponent"],
        d.get("homeAway","Home"),
        int(d["week"]),
        int(d["teamScore"]),
        int(d["opponentScore"]),
        d.get("imageUrl",PLACEHOLDER)
    ))

    gid = cur.fetchone()["game_id"]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"game_id":gid})


# ---------- UPDATE ----------
@app.route("/api/games/<int:gid>", methods=["PUT"])
def update(gid):
    d = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE games
        SET team=%s, opponent=%s, home_away=%s, week=%s,
            team_score=%s, opponent_score=%s, image_url=%s
        WHERE game_id=%s
        RETURNING game_id
    """,(
        d["team"],
        d["opponent"],
        d.get("homeAway","Home"),
        int(d["week"]),
        int(d["teamScore"]),
        int(d["opponentScore"]),
        d.get("imageUrl",PLACEHOLDER),
        gid
    ))

    row = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    if not row:
        return jsonify({"error":"not found"}),404

    return jsonify({"ok":True})


# ---------- DELETE ----------
@app.route("/api/games/<int:gid>", methods=["DELETE"])
def delete(gid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM games WHERE game_id=%s RETURNING game_id",(gid,))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        return jsonify({"error":"not found"}),404

    return jsonify({"deleted":True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
