const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { fetchAndSyncScores } = require('../services/espn');

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      WITH team_pts AS (
        SELECT user_id, team_id, SUM(points) as team_total
        FROM points_log
        GROUP BY user_id, team_id
      ),
      user_totals AS (
        SELECT user_id, SUM(points) as total_points
        FROM points_log
        GROUP BY user_id
      ),
      team_goals AS (
        SELECT dp.user_id, dp.team_id,
          COALESCE(SUM(
            CASE WHEN m.home_team_id = dp.team_id THEN COALESCE(m.home_score, 0)
                 ELSE COALESCE(m.away_score, 0) END
          ), 0) as goals
        FROM draft_picks dp
        LEFT JOIN matches m ON (m.home_team_id = dp.team_id OR m.away_team_id = dp.team_id)
          AND m.status = 'final'
        GROUP BY dp.user_id, dp.team_id
      ),
      user_goals AS (
        SELECT user_id, SUM(goals) as total_goals
        FROM team_goals
        GROUP BY user_id
      ),
      next_match AS (
        SELECT DISTINCT ON (team_id) team_id, match_date, opponent_name, opponent_code
        FROM (
          SELECT t.id as team_id, m.match_date,
            opp.name as opponent_name, opp.country_code as opponent_code
          FROM teams t
          JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
          LEFT JOIN teams opp ON opp.id = CASE
            WHEN m.home_team_id = t.id THEN m.away_team_id ELSE m.home_team_id END
          WHERE m.status = 'scheduled' AND m.match_date > NOW()
        ) sub
        ORDER BY team_id, match_date ASC
      )
      SELECT
        u.id,
        u.name,
        u.emoji,
        u.is_commissioner,
        COALESCE(ut.total_points, 0) as total_points,
        COALESCE(ug.total_goals, 0) as total_goals,
        json_agg(
          json_build_object(
            'team_id', t.id,
            'team_name', t.name,
            'country_code', t.country_code,
            'group_name', t.group_name,
            'pot', t.pot,
            'eliminated', t.eliminated,
            'fifa_rank', t.fifa_rank,
            'odds', t.odds,
            'points', COALESCE(tp.team_total, 0),
            'goals', COALESCE(tg.goals, 0),
            'next_match_date', nm.match_date,
            'next_match_opponent', nm.opponent_name,
            'next_match_opponent_code', nm.opponent_code
          ) ORDER BY COALESCE(tp.team_total, 0) DESC
        ) FILTER (WHERE t.id IS NOT NULL) as teams
      FROM users u
      LEFT JOIN draft_picks dp ON dp.user_id = u.id
      LEFT JOIN teams t ON dp.team_id = t.id
      LEFT JOIN user_totals ut ON ut.user_id = u.id
      LEFT JOIN user_goals ug ON ug.user_id = u.id
      LEFT JOIN team_pts tp ON tp.user_id = u.id AND tp.team_id = t.id
      LEFT JOIN team_goals tg ON tg.user_id = u.id AND tg.team_id = t.id
      LEFT JOIN next_match nm ON nm.team_id = t.id
      GROUP BY u.id, u.name, u.emoji, u.is_commissioner, ut.total_points, ug.total_goals
      ORDER BY total_points DESC, u.created_at ASC
    `);
    res.json(rows);
  } finally {
    client.release();
  }
});

// Get recent/live matches
router.get('/matches', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT
        m.*,
        ht.name as home_team_name, ht.country_code as home_country_code,
        at.name as away_team_name, at.country_code as away_country_code
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      ORDER BY
        CASE m.status
          WHEN 'live' THEN 1
          WHEN 'final' THEN 2
          ELSE 3
        END,
        m.match_date DESC
      LIMIT 50
    `);
    res.json(rows);
  } finally {
    client.release();
  }
});

// Get upcoming matches
router.get('/upcoming', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT
        m.*,
        ht.name as home_team_name, ht.country_code as home_country_code,
        at.name as away_team_name, at.country_code as away_country_code
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE m.status = 'scheduled' AND m.match_date > NOW()
      ORDER BY m.match_date ASC
      LIMIT 20
    `);
    res.json(rows);
  } finally {
    client.release();
  }
});

// Manual sync trigger
router.post('/sync', async (req, res) => {
  const count = await fetchAndSyncScores();
  res.json({ synced: count });
});

// Points breakdown for a user
router.get('/points/:userId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT pl.*, t.name as team_name, m.home_team_id, m.away_team_id,
             m.home_score, m.away_score, m.round, m.match_date
      FROM points_log pl
      JOIN teams t ON pl.team_id = t.id
      JOIN matches m ON pl.match_id = m.id
      WHERE pl.user_id = $1
      ORDER BY m.match_date DESC
    `, [req.params.userId]);
    res.json(rows);
  } finally {
    client.release();
  }
});

module.exports = router;
