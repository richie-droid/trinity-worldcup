# ⚽ World Cup Draft 2026

A real-time office fantasy draft app for the 2026 FIFA World Cup. Snake draft, live scoring via ESPN API, WebSocket-powered draft room.

---

## Features

- **Sign up** — simple name + emoji profile, no passwords
- **Live snake draft** — real-time WebSocket draft room, commissioner-controlled
- **Auto scoring** — ESPN API synced every 2 minutes, points awarded automatically
- **Scoreboard** — live leaderboard, match results, upcoming fixtures, per-user points history

## Scoring

| Round | Win | Draw |
|---|---|---|
| Group Stage | 2 pts | 1 pt |
| Round of 32 | 3 pts | — |
| Round of 16 | 4 pts | — |
| Quarterfinal | 6 pts | — |
| Semifinal | 8 pts | — |
| 3rd Place | 6 pts | — |
| Final | 12 pts | — |

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (local or Docker)

### 1. Clone and install

```bash
git clone <your-repo>
cd worldcup-draft

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Set up environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your local DATABASE_URL

# Frontend — for local dev, the proxy in package.json handles /api
# No .env needed locally unless you want to override
```

### 3. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm start
```

App runs at `http://localhost:3000`, API at `http://localhost:3001`.

---

## Deploy to Railway

### Step 1: Create Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Add a **PostgreSQL** database (Railway provides this natively)
3. Copy the `DATABASE_URL` from the PostgreSQL service

### Step 2: Deploy backend

1. New Service → GitHub Repo → select your repo, set **Root Directory** to `backend`
2. Add environment variables:
   ```
   DATABASE_URL=<from Railway Postgres>
   NODE_ENV=production
   FRONTEND_URL=https://<your-frontend-domain>.up.railway.app
   ```
3. Railway auto-detects `railway.toml` and deploys

### Step 3: Deploy frontend

1. New Service → GitHub Repo → same repo, **Root Directory** = `frontend`
2. Add environment variables:
   ```
   REACT_APP_API_URL=https://<your-backend-domain>.up.railway.app/api
   REACT_APP_WS_URL=wss://<your-backend-domain>.up.railway.app/ws
   ```
3. Deploy

### Step 4: Wire up CORS

Go back to your backend service and set:
```
FRONTEND_URL=https://<your-actual-frontend-domain>.up.railway.app
```
Then redeploy the backend.

---

## How to Run the Draft

1. Share the frontend URL with your office
2. Everyone signs up with their name + emoji
3. The **first person to sign up** is the commissioner (shown with 👑)
4. Commissioner clicks **Start Draft** when everyone has joined
5. Snake draft proceeds in real time — each person picks one team per turn
6. With 48 teams and N players, everyone gets `floor(48/N)` teams
7. After the draft, the scoreboard auto-updates every 2 minutes from ESPN

---

## Architecture

```
frontend/          React app (CRA)
  src/
    pages/         SignUp, DraftRoom, Scoreboard
    hooks/         useWebSocket (real-time draft)
    services/      api.js (REST calls + flag/scoring helpers)
    context/       AppContext (user session via localStorage)

backend/           Node/Express
  src/
    db/            PostgreSQL pool, schema init, team seed data
    routes/        /api/users, /api/teams, /api/scoreboard
    services/      espn.js (score sync), scoring.js (points calc)
    websocket/     Draft room WS server (join, start, pick, pause)
```

### WebSocket events

| Client → Server | Description |
|---|---|
| `join` | Register connection for this user |
| `start_draft` | Commissioner starts the draft |
| `make_pick` | Pick a team (only valid on your turn) |
| `pause_draft` | Commissioner pauses |
| `resume_draft` | Commissioner resumes |

| Server → Client | Description |
|---|---|
| `draft_state` | Full state snapshot on join |
| `draft_started` | Draft has begun |
| `pick_made` | A pick was made (includes full updated state) |
| `scores_updated` | ESPN sync triggered a leaderboard update |
| `user_joined` / `user_left` | Presence updates |

---

## Notes

- No authentication — users are identified by UUID stored in `localStorage`. Fine for an office context.
- ESPN API is unofficial but free and reliable for major tournaments. It does not require an API key.
- The `serve` package is used to serve the React build in production on Railway. It's auto-installed via `npx`.
- Scores sync every 2 minutes via cron. You can also trigger a manual sync from the scoreboard (commissioner only) or via `POST /api/scoreboard/sync`.
