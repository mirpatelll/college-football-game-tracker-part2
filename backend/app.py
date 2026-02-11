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

PLACEHOLDER_IMAGE = "https://via.placeholder.com/120x80?text=No+Image"

starter_games = [
("Clemson","Georgia Tech","Home",1,31,17,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/228.png"),
("Alabama","Auburn","Home",1,35,14,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/333.png"),
("Georgia","Florida","Home",1,29,13,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/61.png"),
("Michigan","Ohio State","Home",1,27,24,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/130.png"),
("Texas","Oklahoma","Away",1,38,35,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/251.png"),
("USC","UCLA","Home",1,24,31,"L","https://a.espncdn.com/i/teamlogos/ncaa/500/30.png"),
("LSU","Texas A&M","Away",2,28,24,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/99.png"),
("Arizona","Utah","Home",1,24,21,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/12.png"),
("Oregon State","Washington State","Home",1,21,17,"W","https://a.espncdn.com/i/teamlogos/ncaa/500/204.png"),
("Clemson","Florida State","Away",2,24,28,"L","https://a.espncdn.com/i/teamlogos/ncaa/500/228.png"),
]*3

def init_db():
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        team TEXT,
        opponent TEXT,
        homeAway TEXT,
        week INTEGER,
        pointsFor INTEGER,
        pointsAgainst INTEGER,
        result TEXT,
        imageUrl TEXT
    )
    """)

    cur.execute("SELECT COUNT(*) FROM games")
    count = cur.fetchone()[0]

    if count == 0:
        for g in starter_games[:30]:
            cur.execute("""
            INSERT INTO games VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,(str(uuid.uuid4()),g[0],g[1],g[2],g[3],g[4],g[5],g[6],g[7]))

        conn.commit()

    cur.close()

init_db()

@app.get("/api/games")
def get_games():
    page=int(request.args.get("page",1))
    size=int(request.args.get("page_size",10))
    offset=(page-1)*size

    cur=conn.cursor()

    cur.execute("SELECT COUNT(*) FROM games")
    total=cur.fetchone()[0]

    cur.execute("""
    SELECT * FROM games ORDER BY week LIMIT %s OFFSET %s
    """,(size,offset))

    rows=cur.fetchall()
    cur.close()

    games=[{
        "id":r[0],
        "team":r[1],
        "opponent":r[2],
        "homeAway":r[3],
        "week":r[4],
        "pointsFor":r[5],
        "pointsAgainst":r[6],
        "result":r[7],
        "imageUrl":r[8]
    } for r in rows]

    return jsonify({"items":games,"total":total})

@app.get("/api/games/<gid>")
def get_one(gid):
    cur=conn.cursor()
    cur.execute("SELECT * FROM games WHERE id=%s",(gid,))
    r=cur.fetchone()
    cur.close()

    if not r:
        return jsonify({"error":"Not found"}),404

    return jsonify({
        "id":r[0],
        "team":r[1],
        "opponent":r[2],
        "homeAway":r[3],
        "week":r[4],
        "pointsFor":r[5],
        "pointsAgainst":r[6],
        "result":r[7],
        "imageUrl":r[8]
    })

@app.post("/api/games")
def add_game():
    d=request.json
    gid=str(uuid.uuid4())
    cur=conn.cursor()

    cur.execute("""
    INSERT INTO games VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """,(gid,d["team"],d["opponent"],d["homeAway"],d["week"],
         d["pointsFor"],d["pointsAgainst"],d["result"],
         d.get("imageUrl") or PLACEHOLDER_IMAGE))

    conn.commit()
    cur.close()
    return jsonify({"id":gid})

@app.put("/api/games/<gid>")
def update_game(gid):
    d=request.json
    cur=conn.cursor()

    cur.execute("""
    UPDATE games SET team=%s,opponent=%s,homeAway=%s,week=%s,
    pointsFor=%s,pointsAgainst=%s,result=%s,imageUrl=%s WHERE id=%s
    """,(d["team"],d["opponent"],d["homeAway"],d["week"],
         d["pointsFor"],d["pointsAgainst"],d["result"],
         d.get("imageUrl") or PLACEHOLDER_IMAGE,gid))

    conn.commit()
    cur.close()
    return jsonify({"ok":True})

@app.delete("/api/games/<gid>")
def delete_game(gid):
    cur=conn.cursor()
    cur.execute("DELETE FROM games WHERE id=%s",(gid,))
    conn.commit()
    cur.close()
    return jsonify({"ok":True})

@app.get("/api/stats")
def stats():
    cur=conn.cursor()

    cur.execute("SELECT COUNT(*),AVG(pointsFor) FROM games")
    total,avgpf=cur.fetchone()

    cur.execute("SELECT COUNT(*) FROM games WHERE result='W'")
    wins=cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM games WHERE result='L'")
    losses=cur.fetchone()[0]

    cur.execute("SELECT team,opponent,pointsFor FROM games ORDER BY pointsFor DESC LIMIT 1")
    h=cur.fetchone()

    cur.close()

    return jsonify({
        "totalGames":total,
        "wins":wins,
        "losses":losses,
        "avgPF":float(avgpf or 0),
        "highPFGame":{
            "team":h[0],
            "opponent":h[1],
            "pointsFor":h[2]
        } if h else None
    })

if __name__=="__main__":
    app.run(host="0.0.0.0",port=int(os.environ.get("PORT",5000)))
