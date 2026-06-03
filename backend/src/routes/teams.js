const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all teams
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM teams ORDER BY group_name, pot');
  res.json(rows);
});

// Get teams by group
router.get('/group/:group', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM teams WHERE group_name = $1 ORDER BY pot',
    [req.params.group.toUpperCase()]
  );
  res.json(rows);
});

module.exports = router;
