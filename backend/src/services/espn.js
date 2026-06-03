const fetch = require('node-fetch');
const { pool } = require('../db');
const { calculateMatchPoints } = require('./scoring');

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';

const mapStatus = (espnStatus) => {
  const s = espnStatus?.toLowerCase() || '';
  if (s.includes('final') || s === 'ft' || s === 'post') return 'final';
  if (s.includes('in progress') || s === 'in' || s.includes('live')) return 'live';
  if (s === 'pre' || s.includes('scheduled')) return 'scheduled';
  return espnStatus || 'scheduled';
};

const mapRound = (espnEvent) => {
  const name = espnEvent?.season?.slug || espnEvent?.competitions?.[0]?.type?.abbreviation || '';
  const n = name.toLowerCase();
  if (n.includes('group')) return 'group';
  if (n.includes('r32') || n.includes('round-of-32')) return 'round32';
  if (n.includes('r16') || n.includes('round-of-16')) return 'round16';
  if (n.includes('qf') || n.includes('quarter')) return 'quarterfinal';
  if (n.includes('sf') || n.includes('semi')) return 'semifinal';
  if (n.includes('3rd') || n.includes('third')) return 'third_place';
  if (n.includes('final')) return 'final';
  return 'group';
};

const fetchAndSyncScores = async () => {
  try {
    const res = await fetch(`${ESPN_BASE}/scoreboard?limit=200`);
    if (!res.ok) throw new Error(`ESPN API ${res.status}`);
    const data = await res.json();

    const events = data.events || [];
    const client = await pool.connect();

    try {
      for (const event of events) {
        const comp = event.competitions?.[0];
        if (!comp) continue;

        const homeComp = comp.competitors?.find(c => c.homeAway === 'home');
        const awayComp = comp.competitors?.find(c => c.homeAway === 'away');
        if (!homeComp || !awayComp) continue;

        const homeTeamEspnId = homeComp.team?.abbreviation?.toLowerCase();
        const awayTeamEspnId = awayComp.team?.abbreviation?.toLowerCase();

        // Find our team IDs by country code
        const { rows: homeTeams } = await client.query(
          'SELECT id FROM teams WHERE LOWER(country_code) = $1 OR LOWER(name) = $2 LIMIT 1',
          [homeTeamEspnId, homeComp.team?.displayName?.toLowerCase()]
        );
        const { rows: awayTeams } = await client.query(
          'SELECT id FROM teams WHERE LOWER(country_code) = $1 OR LOWER(name) = $2 LIMIT 1',
          [awayTeamEspnId, awayComp.team?.displayName?.toLowerCase()]
        );

        const homeTeamId = homeTeams[0]?.id || homeTeamEspnId;
        const awayTeamId = awayTeams[0]?.id || awayTeamEspnId;

        const status = mapStatus(comp.status?.type?.name);
        const homeScore = status !== 'scheduled' ? parseInt(homeComp.score) || 0 : null;
        const awayScore = status !== 'scheduled' ? parseInt(awayComp.score) || 0 : null;
        const round = mapRound(event);

        const matchDate = event.date ? new Date(event.date) : null;
        const groupName = event.competitions?.[0]?.groups?.[0]?.name || null;

        const { rows: existing } = await client.query(
          'SELECT * FROM matches WHERE id = $1', [event.id]
        );

        const wasFinished = existing[0]?.status === 'final';
        const nowFinished = status === 'final';

        await client.query(`
          INSERT INTO matches (id, home_team_id, away_team_id, home_score, away_score, status, match_date, round, group_name, venue, last_updated)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (id) DO UPDATE SET
            home_score = EXCLUDED.home_score,
            away_score = EXCLUDED.away_score,
            status = EXCLUDED.status,
            round = EXCLUDED.round,
            last_updated = NOW()
        `, [event.id, homeTeamId, awayTeamId, homeScore, awayScore, status, matchDate, round, groupName, comp.venue?.fullName]);

        // If match just finished, calculate points
        if (!wasFinished && nowFinished) {
          const match = { id: event.id, home_team_id: homeTeamId, away_team_id: awayTeamId, home_score: homeScore, away_score: awayScore, status, round };

          const { rows: picks } = await client.query('SELECT user_id, team_id FROM draft_picks');
          for (const pick of picks) {
            const result = calculateMatchPoints(match, pick.team_id);
            if (!result) continue;
            await client.query(`
              INSERT INTO points_log (user_id, team_id, match_id, points, reason)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (user_id, match_id, team_id) DO UPDATE SET points = EXCLUDED.points
            `, [pick.user_id, pick.team_id, match.id, result.points, result.reason]);
          }
        }
      }
    } finally {
      client.release();
    }

    console.log(`Synced ${events.length} matches from ESPN`);
    return events.length;
  } catch (err) {
    console.error('ESPN sync error:', err.message);
    return 0;
  }
};

const fetchUpcomingMatches = async () => {
  try {
    const res = await fetch(`${ESPN_BASE}/schedule?limit=200`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
};

module.exports = { fetchAndSyncScores, fetchUpcomingMatches };
