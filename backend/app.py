import os
import psycopg2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Export your Render External Database URL.")

def conn():
    return psycopg2.connect(DATABASE_URL)

# -------------------------------------------------
# FORCE RESET + SCHEMA (NUCLEAR OPTION)
# -------------------------------------------------

def hard_reset():
    c = conn()
    cur = c.cursor()

    cur.execute("DROP TABLE IF EXISTS games")

    cur.execute("""
    CREATE TABLE games(
        id SERIAL PRIMARY KEY,
        week INT,
        team TEXT,
        opponent TEXT,
        pointsfor INT,
        pointsagainst INT,
        result TEXT,
        imageurl TEXT
    )
    """)

    c.commit()
    c.close()

# -------------------------------------------------
# SEED
# -------------------------------------------------

def seed_games(n=30):
    teams = [
        "Clemson","Georgia","Alabama","Ohio State","Michigan",
        "Texas","USC","Oregon","LSU","Florida State"
    ]

    rows = []

    for i in range(n):
        pf = 20 + (i % 25)
        pa = 10 + (i % 20)
        result = "Win" if pf > pa else "Loss"

        rows.append((
            i + 1,
            teams[i % len(teams)],
            teams[(i + 3) % len(teams)],
            pf,
            pa,
            result,
            "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png"
        ))

    c = conn()
    cur = c.cursor()

    cur.executemany("""
        INSERT INTO games
        (week,team,opponent,pointsfor,pointsagainst,result,imageurl)
        VALUES(%s,%s,%s,%s,%s,%s,%s)
    """, rows)

    c.commit()
    c.close()

# -------------------------------------------------
# API
# -------------------------------------------------

@app.route("/api/reset", methods=["POST"])
def api_reset():
    hard_reset()
    seed_games(30)
    return jsonify({"ok": True})

@app.route("/api/games")
def games():
    sort = request.args.get("sort","week")
    order = request.args.get("order","asc")

    if sort not in ["week","pointsfor","pointsagainst"]:
        sort = "week"

    c = conn()
    cur = c.cursor()
    cur.execute(f"SELECT * FROM games ORDER BY {sort} {order}")
    rows = cur.fetchall()
    c.close()

    out = []
    for r in rows:
        out.append({
            "id": r[0],
            "week": r[1],
            "team": r[2],
            "opponent": r[3],
            "pointsfor": r[4],
            "pointsagainst": r[5],
            "result": r[6],
            "imageurl": r[7]
        })

    return jsonify(out)

@app.route("/api/games/<int:id>", methods=["PUT"])
def update_game(id):
    d = request.json

    c = conn()
    cur = c.cursor()
    cur.execute("""
        UPDATE games
        SET team=%s, opponent=%s, pointsfor=%s, pointsagainst=%s
        WHERE id=%s
    """,(d["team"], d["opponent"], d["pointsfor"], d["pointsagainst"], id))

    c.commit()
    c.close()

    return jsonify({"ok": True})

@app.route("/api/stats")
def stats():
    c = conn()
    cur = c.cursor()
    cur.execute("SELECT COUNT(*) FROM games")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM games WHERE result='Win'")
    wins = cur.fetchone()[0]
    c.close()

    return jsonify({"total": total, "wins": wins})

# -------------------------------------------------
# BOOT (FORCE RESET EVERY START)
# -------------------------------------------------

hard_reset()
seed_games(30)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
