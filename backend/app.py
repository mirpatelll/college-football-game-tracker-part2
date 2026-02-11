import os
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return "", 200

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

PLACEHOLDER = "https://via.placeholder.com/300x150?text=Game"

@app.route("/api/games", methods=["GET"])
def list_games():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM games ORDER BY week")
    rows = cur.fetchall()
    conn.close()
    return jsonify({"items": rows})

@app.route("/api/games", methods=["POST"])
def create_game():
    data = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO games(team, opponent, week, team_score, opponent_score, image_url)
        VALUES(%s,%s,%s,%s,%s,%s)
    """, (
        data["team"],
        data["opponent"],
        data["week"],
        data["team_score"],
        data["opponent_score"],
        data.get("image_url") or PLACEHOLDER
    ))

    conn.commit()
    conn.close()

    return jsonify({"status":"ok"})

@app.route("/api/games/<int:id>", methods=["PUT"])
def update_game(id):
    data = request.json

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE games SET team=%s, opponent=%s, week=%s,
        team_score=%s, opponent_score=%s, image_url=%s
        WHERE id=%s
    """, (
        data["team"],
        data["opponent"],
        data["week"],
        data["team_score"],
        data["opponent_score"],
        data.get("image_url") or PLACEHOLDER,
        id
    ))

    conn.commit()
    conn.close()

    return jsonify({"status":"ok"})

@app.route("/api/games/<int:id>", methods=["DELETE"])
def delete_game(id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s", (id,))
    conn.commit()
    conn.close()
    return jsonify({"status":"deleted"})
