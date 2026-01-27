# College Football Game Tracker (Cloud Version)

This project is a client/server web application for tracking college football games.  
It uses a cloud-hosted backend API and a static frontend deployed separately.

---

## 🌐 Live Application

Frontend (Netlify):  
https://collegegametracker.netlify.app  

Backend API (Render):  
https://college-football-game-tracker-part2.onrender.com  

---

## 🖥 Backend Language Used

The backend is written in **Python** using the **Flask** framework.

Flask provides the REST API endpoints used by the frontend to:
- Retrieve games  
- Add new games  
- Edit existing games  
- Delete games  
- Return paginated results  

---

## 💾 JSON Persistence Explanation

Game data is stored using a JSON file (`data.json`) on the backend.

How persistence works:

- When the server starts, it loads game records from `data.json` into memory.
- All API operations (add, edit, delete) modify this in-memory data.
- After every change, the updated data is written back to `data.json`.
- This allows the data to persist between requests and server restarts.

On deployment (Render), starter data is automatically initialized so the application always begins with a populated dataset.
 Technology Stack

Frontend:
- HTML  
- CSS  
- JavaScript  
- Hosted on Netlify  

Backend:
- Python  
- Flask  
- Hosted on Render  
- JSON file for persistence  



 ✅ Features

- View all games with pagination  
- Add and edit games  
- Delete games  
- Filter by result  
- Search by team or opponent  
- Statistics view  


