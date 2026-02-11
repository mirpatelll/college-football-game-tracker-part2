College Football Game Tracker (Cloud Version)

This project is a full-stack client/server web application for tracking college football games.
It uses a cloud-hosted Flask REST API with a PostgreSQL database and a static frontend deployed separately.

Live Application

Frontend (Netlify):
https://collegegametracker.netlify.app

Backend API (Render):
https://college-football-game-tracker-part2-1.onrender.com

Domain Name + Registrar

No custom domain is used.

Frontend domain is provided by Netlify.
Backend domain is provided by Render.

Both platforms automatically generate secure HTTPS URLs.

Tech Stack

Frontend:
HTML
CSS
JavaScript
Hosted on Netlify

Backend:
Python
Flask
psycopg2 (PostgreSQL driver)
Hosted on Render

Database:
PostgreSQL 18
Hosted on Render (Managed PostgreSQL instance)

Database & Persistence

Game data is stored in a PostgreSQL database hosted on Render.

How persistence works:

When the server starts, Flask connects to Render’s PostgreSQL database using an environment variable.

A games table is automatically created if it does not exist.

If the table is empty, 30 starter games are automatically seeded.

All create, read, and delete operations directly modify the PostgreSQL database.

Data persists across deployments and server restarts.

Configuration & Secrets Management

Sensitive configuration values are stored as environment variables on Render.

Example:

DATABASE_URL

This variable contains the PostgreSQL connection string and is never committed to GitHub.

Render injects this variable automatically at runtime.

The Flask app reads it using:

os.environ.get("DATABASE_URL")

No secrets are stored in source control.

Hosting Providers

Frontend: Netlify
Backend API: Render Web Service
Database: Render PostgreSQL

How to Deploy and Update the App

Backend (Render):

Make changes locally

Commit and push to GitHub:

git add .
git commit -m "Update backend"
git push

Go to the Render dashboard

Select the backend service

Click:

Manual Deploy → Deploy latest

Render automatically rebuilds and redeploys the Flask server.

Frontend (Netlify):

Update frontend files locally

Push changes to GitHub

Netlify automatically redeploys the site

Features

View all games with pagination
Add games
Delete games
Search by team or opponent
Filter by result
Statistics dashboard
Persistent PostgreSQL storage
Automatic seeding of 30 starter games

API Endpoints

GET /api/games
POST /api/games
DELETE /api/games/<id>
GET /api/stats

