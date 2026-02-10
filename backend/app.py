import os
import psycopg2
from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import urlparse
import uuid

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

url = urlparse(DATABASE_URL)

conn = psycopg2.connect(
    dbname=url.path[1:],
    user=url.username,
    password=url.password,
    host=url.hostname,
    port=url.port
)

def init_db():
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            week INTEGER,
            team TEXT,
            opponent TEXT,
            homeAway TEXT,
            pointsFor INTEGER,
            pointsAgainst INTEGER,
            result TEXT
        );
    """)
    conn.commit()
    cur.close()

init_db()

@app.route("/api/games", methods=["GET"])
def get_games():
    cur = conn.cursor()
    cur.execute("SELECT * FROM games ORDER BY week;")
    rows = cur.fetchall()
    cur.close()

    games = []
    for r in rows:
        games.append({
            "id": r[0],
            "week": r[1],
            "team": r[2],
            "opponent": r[3],
            "homeAway": r[4],
            "pointsFor": r[5],
            "pointsAgainst": r[6],
            "result": r[7]
        })

    return jsonify({"items": games, "total": len(games)})

@app.route("/api/games", methods=["POST"])
def add_game():
    data = request.json
    cur = conn.cursor()

    gid = str(uuid.uuid4())

    cur.execute("""
        INSERT INTO games VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        gid,
        data["week"],
        data["team"],
        data["opponent"],
        data["homeAway"],
        data["pointsFor"],
        data["pointsAgainst"],
        data["result"]
    ))

    conn.commit()
    cur.close()

    return jsonify({"id": gid})

@app.route("/api/games/<id>", methods=["DELETE"])
def delete_game(id):
    cur = conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s", (id,))
    conn.commit()
    cur.close()
    return jsonify({"ok": True})

@app.route("/api/stats")
def stats():
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*), COALESCE(SUM(pointsFor),0) FROM games")
    total, pf = cur.fetchone()

    cur.execute("SELECT COUNT(*) FROM games WHERE result='W'")
    wins = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM games WHERE result='L'")
    losses = cur.fetchone()[0]

    cur.close()

    return jsonify({
        "totalGames": total or 0,
        "wins": wins,
        "losses": losses,
        "avgPF": (pf / total) if total else 0,
        "highPFGame": None
    })

# -------------------------------
# RENDER PORT FIX (IMPORTANT)
# -------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
