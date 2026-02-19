# 🏈 College Football Game Tracker — Solo Project 3

Production-ready Collection Manager application built for CPSC 3750. This project allows users to create, view, edit, delete, and analyze college football games using a full client/server architecture with a PostgreSQL database.

The application is deployed publicly with a custom domain and supports full CRUD functionality.

---

## 🔗 Live Application

Frontend (Netlify):

https://collegefootballtracker.online

Backend API (Render):

https://college-football-game-tracker-part2-1.onrender.com

---

## 🧱 Tech Stack

### Frontend
- HTML  
- CSS  
- Vanilla JavaScript  
- Hosted on **Netlify**

### Backend
- Python  
- Flask  
- Flask-CORS  
- Hosted on **Render**

### Database
- PostgreSQL  
- Hosted on **Render**

---

## 🌐 Domain + Registrar

- Domain Provider: **Netlify**
- Custom domain connected directly through Netlify DNS

---

## ☁ Hosting Providers

| Layer | Provider |
|------|----------|
| Frontend | Netlify |
| Backend API | Render |
| Database | Render PostgreSQL |

---

## 🗄 Database

- Type: **PostgreSQL**
- Hosted on: **Render**
- Tables:
  - `games`

Each game record stores:

- id  
- team  
- opponent  
- week  
- pointsfor  
- pointsagainst  
- result  
- imageurl  

Seed data (30+ games) is inserted on initial deployment.

---

## 🔐 Environment Variables

Secrets and configuration values are stored using environment variables (never hardcoded).

### Backend (Render):

DATABASE_URL

This contains the PostgreSQL connection string automatically provided by Render.

Flask reads this value using:

```python
os.environ.get("DATABASE_URL")

