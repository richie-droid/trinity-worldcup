// Scoring rules
const POINTS = {
  group: { win: 2, draw: 1 },
  round32: { win: 3 },
  round16: { win: 4 },
  quarterfinal: { win: 6 },
  semifinal: { win: 8 },
  third_place: { win: 6 },
  final: { win: 12 },
};

const getRound = (match) => {
  const r = match.round?.toLowerCase() || 'group';
  if (r.includes('group')) return 'group';
  if (r.includes('32') || r.includes('round of 32')) return 'round32';
  if (r.includes('16') || r.includes('round of 16')) return 'round16';
  if (r.includes('quarter')) return 'quarterfinal';
  if (r.includes('semi')) return 'semifinal';
  if (r.includes('third') || r.includes('3rd')) return 'third_place';
  if (r.includes('final')) return 'final';
  return 'group';
};

const calculateMatchPoints = (match, teamId) => {
  if (match.status !== 'final' && match.status !== 'ft') return null;
  if (match.home_score === null || match.away_score === null) return null;

  const round = getRound(match);
  const rules = POINTS[round];
  const isHome = match.home_team_id === teamId;
  const isAway = match.away_team_id === teamId;

  if (!isHome && !isAway) return null;

  const teamScore = isHome ? match.home_score : match.away_score;
  const oppScore = isHome ? match.away_score : match.home_score;

  if (teamScore > oppScore) return { points: rules.win, reason: `Win (${round})` };
  if (teamScore === oppScore && round === 'group') return { points: rules.draw, reason: `Draw (group)` };
  return null;
};

const recalculateAllPoints = async (pool) => {
  const client = await pool.connect();
  try {
    // Get all finished matches
    const { rows: matches } = await client.query(`
      SELECT * FROM matches WHERE status IN ('final', 'ft')
    `);

    // Get all draft picks
    const { rows: picks } = await client.query(`
      SELECT dp.user_id, dp.team_id FROM draft_picks dp
    `);

    for (const match of matches) {
      for (const pick of picks) {
        const result = calculateMatchPoints(match, pick.team_id);
        if (!result) continue;

        await client.query(`
          INSERT INTO points_log (user_id, team_id, match_id, points, reason)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, match_id, team_id) DO UPDATE SET
            points = EXCLUDED.points,
            reason = EXCLUDED.reason
        `, [pick.user_id, pick.team_id, match.id, result.points, result.reason]);
      }
    }
  } finally {
    client.release();
  }
};

module.exports = { calculateMatchPoints, recalculateAllPoints, POINTS, getRound };
