const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Sign up / create user
router.post('/', async (req, res) => {
  const { name, emoji } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const client = await pool.connect();
  try {
    // First user becomes commissioner
    const { rows: existing } = await client.query('SELECT COUNT(*) FROM users');
    const isFirst = parseInt(existing[0].count) === 0;

    const { rows: [user] } = await client.query(`
      INSERT INTO users (name, emoji, is_commissioner)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name.trim(), emoji || '⚽', isFirst]);

    res.json(user);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Name taken' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all users
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
  res.json(rows);
});

// Get user by id
router.get('/:id', async (req, res) => {
  const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// Claim commissioner — only works if no commissioner exists yet
router.post('/:id/claim-commissioner', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: [existing] } = await client.query('SELECT id FROM users WHERE is_commissioner = true LIMIT 1');
    if (existing) return res.status(409).json({ error: 'A commissioner already exists' });
    const { rows: [user] } = await client.query(
      'UPDATE users SET is_commissioner = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } finally {
    client.release();
  }
});

// Reset everything — commissioner only
router.post('/reset', async (req, res) => {
  const { userId } = req.body;
  const client = await pool.connect();
  try {
    const { rows: [user] } = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user?.is_commissioner) return res.status(403).json({ error: 'Commissioner only' });

    await client.query('DELETE FROM points_log');
    await client.query('DELETE FROM draft_picks');
    await client.query(`
      UPDATE draft_state SET
        status = 'waiting', current_pick = 1, total_picks = 0,
        started_at = NULL, completed_at = NULL, draft_order = '[]', pending_order = '[]'
      WHERE id = 1
    `);
    res.json({ ok: true });
  } finally {
    client.release();
  }
});

module.exports = router;
