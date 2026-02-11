import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

PLACEHOLDER = "https://via.placeholder.com/300x150?text=Game"

# ---------------- LIST ----------------

@app.get("/api/games")
def list_games():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM games ORDER BY week")
    rows = cur.fetchall()
    conn.close()
    return jsonify({"items": rows})

# ---------------- STATS ----------------

@app.get("/api/stats")
def stats():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM games")
    total = cur.fetchone()["count"]

    cur.execute("SELECT AVG(team_score) FROM games")
    avg = cur.fetchone()["avg"]

    conn.close()

    return jsonify({
        "total": total,
        "average_score": round(avg or 0, 2)
    })

# ---------------- CREATE ----------------

@app.post("/api/games")
def create_game():
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO games
        (team, opponent, home_away, week, team_score, opponent_score, image_url)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (
        data["team"],
        data["opponent"],
        data.get("homeAway") or data.get("home_away") or "Home",
        int(data["week"]),
        int(data["team_score"]),
        int(data["opponent_score"]),
        data.get("image_url") or PLACEHOLDER
    ))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

# ---------------- UPDATE ----------------

@app.put("/api/games/<int:id>")
def update_game(id):
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE games SET
        team=%s,
        opponent=%s,
        home_away=%s,
        week=%s,
        team_score=%s,
        opponent_score=%s,
        image_url=%s
        WHERE id=%s
    """, (
        data["team"],
        data["opponent"],
        data.get("homeAway") or data.get("home_away") or "Home",
        int(data["week"]),
        int(data["team_score"]),
        int(data["opponent_score"]),
        data.get("image_url") or PLACEHOLDER,
        id
    ))

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

# ---------------- DELETE ----------------

@app.delete("/api/games/<int:id>")
def delete_game(id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s", (id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})
