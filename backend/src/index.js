require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const cron = require('node-cron');
const { initDB } = require('./db');
const { seedTeams } = require('./db/seed');
const { pool } = require('./db');
const { setupWebSocket } = require('./websocket');
const { fetchAndSyncScores } = require('./services/espn');
const { broadcastAll } = require('./websocket');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/scoreboard', require('./routes/scoreboard'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// WebSocket
setupWebSocket(server);

// Sync ESPN scores every 2 minutes during tournament
cron.schedule('*/2 * * * *', async () => {
  const count = await fetchAndSyncScores();
  if (count > 0) {
    // Broadcast updated leaderboard to all clients
    try {
      const { rows: leaderboard } = await pool.query(`
        SELECT u.id, u.name, u.emoji,
               COALESCE(SUM(pl.points), 0) as total_points
        FROM users u
        LEFT JOIN points_log pl ON pl.user_id = u.id
        GROUP BY u.id ORDER BY total_points DESC
      `);
      broadcastAll({ type: 'scores_updated', leaderboard });
    } catch (e) {
      console.error('Broadcast error:', e.message);
    }
  }
});

const PORT = process.env.PORT || 3001;

const start = async () => {
  await initDB();
  await seedTeams(pool);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Initial sync
    fetchAndSyncScores().catch(console.error);
  });
};

start().catch(console.error);
