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

starter_games = [
    (1,"Alabama","Auburn","Home",35,14,"W"),
    (1,"Clemson","Georgia Tech","Home",31,17,"W"),
    (1,"Michigan","Ohio State","Home",27,24,"W"),
    (1,"Texas","Oklahoma","Away",38,35,"W"),
    (2,"Georgia","Florida","Home",29,13,"W"),
    (2,"USC","UCLA","Home",24,31,"L"),
    (2,"Clemson","Florida State","Away",24,28,"L"),
    (3,"Alabama","LSU","Home",42,21,"W"),
    (3,"Michigan","Penn State","Away",30,20,"W"),
    (3,"Texas","Baylor","Home",41,17,"W"),
] * 3

def auto_seed():
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
    )
    """)

    cur.execute("SELECT COUNT(*) FROM games")
    count = cur.fetchone()[0]

    if count == 0:
        for g in starter_games[:30]:
            cur.execute("""
            INSERT INTO games VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                str(uuid.uuid4()),
                g[0], g[1], g[2], g[3], g[4], g[5], g[6]
            ))
        conn.commit()

    cur.close()

auto_seed()

@app.route("/api/games")
def get_games():
    page = int(request.args.get("page", 1))
    size = int(request.args.get("page_size", 10))
    offset = (page-1)*size

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM games")
    total = cur.fetchone()[0]

    cur.execute("SELECT * FROM games ORDER BY week LIMIT %s OFFSET %s",(size,offset))
    rows = cur.fetchall()
    cur.close()

    games=[]
    for r in rows:
        games.append({
            "id":r[0],
            "week":r[1],
            "team":r[2],
            "opponent":r[3],
            "homeAway":r[4],
            "pointsFor":r[5],
            "pointsAgainst":r[6],
            "result":r[7]
        })

    return jsonify({"items":games,"total":total})

@app.route("/api/games", methods=["POST"])
def add_game():
    d=request.json
    gid=str(uuid.uuid4())
    cur=conn.cursor()

    cur.execute("""
    INSERT INTO games VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """,(gid,d["week"],d["team"],d["opponent"],d["homeAway"],d["pointsFor"],d["pointsAgainst"],d["result"]))

    conn.commit()
    cur.close()
    return jsonify({"id":gid})

@app.route("/api/games/<id>",methods=["PUT"])
def update_game(id):
    d=request.json
    cur=conn.cursor()

    cur.execute("""
    UPDATE games SET week=%s,team=%s,opponent=%s,homeAway=%s,
    pointsFor=%s,pointsAgainst=%s,result=%s WHERE id=%s
    """,(d["week"],d["team"],d["opponent"],d["homeAway"],
         d["pointsFor"],d["pointsAgainst"],d["result"],id))

    conn.commit()
    cur.close()
    return jsonify({"ok":True})

@app.route("/api/games/<id>",methods=["DELETE"])
def delete_game(id):
    cur=conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s",(id,))
    conn.commit()
    cur.close()
    return jsonify({"ok":True})

@app.route("/api/stats")
def stats():
    cur=conn.cursor()
    cur.execute("SELECT COUNT(*),SUM(pointsFor) FROM games")
    total,pf=cur.fetchone()

    cur.execute("SELECT COUNT(*) FROM games WHERE result='W'")
    wins=cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM games WHERE result='L'")
    losses=cur.fetchone()[0]

    cur.close()

    return jsonify({
        "totalGames":total,
        "wins":wins,
        "losses":losses,
        "avgPF":(pf/total) if total else 0
    })

if __name__=="__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT",5000)))
