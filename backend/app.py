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

def seed_games():
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM games;")
    count = cur.fetchone()[0]

    if count == 0:
        print("Seeding 30 games...")

        games = []

        for i in range(30):
            games.append((
                str(uuid.uuid4()),
                (i % 5) + 1,
                "Team " + str(i+1),
                "Opponent " + str(i+1),
                "Home",
                24 + i,
                17,
                "W"
            ))

        cur.executemany("""
            INSERT INTO games VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, games)

        conn.commit()

    cur.close()

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
seed_games()

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

    cur.execute("SELECT COUNT(*), SUM(pointsFor) FROM games")
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

if __name__ == "__main__":
    app.run()
