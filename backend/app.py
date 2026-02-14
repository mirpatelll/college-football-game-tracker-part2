import os
import psycopg2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db():
    return psycopg2.connect(DATABASE_URL, sslmode="require")

# ---------------- GET ALL ----------------

@app.route("/api/games", methods=["GET"])
def get_games():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, week, team, opponent,
               pointsfor, pointsagainst,
               imageurl, home_away
        FROM games
        ORDER BY week
    """)

    rows = cur.fetchall()

    items = []
    for r in rows:
        items.append({
            "id": r[0],
            "week": r[1],
            "team": r[2],
            "opponent": r[3],
            "team_score": r[4],
            "opponent_score": r[5],
            "image_url": r[6],
            "home_away": r[7]
        })

    cur.close()
    conn.close()

    return jsonify({"items": items})

# ---------------- ADD ----------------

@app.route("/api/games", methods=["POST"])
def add_game():
    d = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO games(
            team, opponent, week,
            pointsfor, pointsagainst,
            imageurl, home_away
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
    """, (
        d.get("team"),
        d.get("opponent"),
        d.get("week"),
        d.get("team_score"),
        d.get("opponent_score"),
        d.get("image_url",""),
        d.get("home_away","")
    ))

    gid = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"id": gid})

# ---------------- UPDATE ----------------

@app.route("/api/games/<int:gid>", methods=["PUT"])
def update_game(gid):
    d = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE games
        SET team=%s,
            opponent=%s,
            week=%s,
            pointsfor=%s,
            pointsagainst=%s,
            imageurl=%s,
            home_away=%s
        WHERE id=%s
    """, (
        d.get("team"),
        d.get("opponent"),
        d.get("week"),
        d.get("team_score"),
        d.get("opponent_score"),
        d.get("image_url",""),
        d.get("home_away",""),
        gid
    ))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"status": "ok"})

# ---------------- DELETE ----------------

@app.route("/api/games/<int:gid>", methods=["DELETE"])
def delete_game(gid):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM games WHERE id=%s", (gid,))
    conn.commit()

    cur.close()
    conn.close()

    return jsonify({"status": "deleted"})

if __name__ == "__main__":
    app.run()

