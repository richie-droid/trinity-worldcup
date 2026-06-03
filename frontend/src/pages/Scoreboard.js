import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api, getFlag, ROUND_LABELS } from '../services/api';

const REFRESH_INTERVAL = 30000; // 30 seconds

export default function Scoreboard() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [matches, setMatches] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard');
  const [expanded, setExpanded] = useState(null);
  const [userPoints, setUserPoints] = useState({});
  const [lastSync, setLastSync] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [lb, m, u] = await Promise.all([
        api.getLeaderboard(),
        api.getMatches(),
        api.getUpcoming(),
      ]);
      setLeaderboard(lb);
      setMatches(m);
      setUpcoming(u);
      setLastSync(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleExpanded = async (userId) => {
    if (expanded === userId) { setExpanded(null); return; }
    setExpanded(userId);
    if (!userPoints[userId]) {
      const pts = await api.getUserPoints(userId);
      setUserPoints(prev => ({ ...prev, [userId]: pts }));
    }
  };

  const liveMatches = matches.filter(m => m.status === 'live');
  const recentMatches = matches.filter(m => m.status === 'final').slice(0, 10);

  if (loading) return (
    <div style={styles.loading}>
      <span style={styles.loadingText}>Loading scores...</span>
    </div>
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>SCOREBOARD</h1>
          {lastSync && (
            <p style={styles.syncText}>Updated {lastSync.toLocaleTimeString()}</p>
          )}
        </div>
        <div style={styles.headerActions}>
          <button className="btn-secondary" onClick={() => navigate('/draft')} style={{ fontSize: 13, padding: '8px 16px' }}>
            ← Draft Room
          </button>
          <button className="btn-secondary" onClick={() => navigate('/profile')} style={{ fontSize: 13, padding: '8px 16px' }}>
            My Profile
          </button>
          {user?.is_commissioner && (
            <button className="btn-secondary" onClick={async () => { await api.syncScores(); fetchData(); }} style={{ fontSize: 13, padding: '8px 16px' }}>
              Sync Scores
            </button>
          )}
        </div>
      </div>

      {/* Live matches banner */}
      {liveMatches.length > 0 && (
        <div style={styles.liveBanner}>
          <span style={styles.livePill}>LIVE</span>
          <div style={styles.liveMatches}>
            {liveMatches.map(m => (
              <span key={m.id} style={styles.liveMatch}>
                {getFlag(m.home_country_code)} {m.home_team_name} {m.home_score} – {m.away_score} {m.away_team_name} {getFlag(m.away_country_code)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {['leaderboard', 'matches', 'upcoming'].map(t => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'leaderboard' ? '🏆 Leaderboard' :
             t === 'matches' ? '📋 Results' : '📅 Upcoming'}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div style={styles.leaderboardSection}>
          {leaderboard.map((entry, i) => (
            <div key={entry.id} style={styles.leaderboardEntry}>
              <div
                style={styles.entryHeader}
                onClick={() => toggleExpanded(entry.id)}
              >
                <div style={styles.entryRank}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                    <span style={styles.rankNum}>{i + 1}</span>
                  )}
                </div>
                <div style={styles.entryEmoji}>{entry.emoji}</div>
                <div style={styles.entryName}>
                  <span
                    style={{ fontWeight: entry.id === user?.id ? 700 : 400, cursor: 'pointer', textDecoration: 'none' }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${entry.id}`); }}
                  >
                    {entry.name}
                    {entry.id === user?.id ? ' (you)' : ''}
                    {entry.is_commissioner ? ' 👑' : ''}
                  </span>
                  <span style={styles.entryTeamCount}>
                    {entry.teams?.length || 0} teams
                  </span>
                </div>
                <div style={styles.entryStats}>
                  <div style={styles.entryPoints}>
                    <span style={styles.pointsNum}>{entry.total_points}</span>
                    <span style={styles.pointsLabel}>pts</span>
                  </div>
                  <div style={styles.entryGoals}>
                    <span style={styles.goalsNum}>{entry.total_goals}</span>
                    <span style={styles.goalsLabel}>goals</span>
                  </div>
                </div>
                <span style={styles.chevron}>{expanded === entry.id ? '▲' : '▼'}</span>
              </div>

              {/* Team breakdown */}
              {entry.teams && entry.teams.length > 0 && (
                <div style={styles.entryTeams}>
                  {entry.teams.map(team => {
                    const nextDate = team.next_match_date ? new Date(team.next_match_date) : null;
                    const nextStr = nextDate
                      ? nextDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                      : null;
                    return (
                      <div key={team.team_id} style={styles.teamRow}>
                        <span style={{ fontSize: 18 }}>{getFlag(team.country_code)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={styles.teamRowName}>{team.team_name}</span>
                            <span style={styles.teamRowGroup}>Grp {team.group_name}</span>
                            {team.eliminated && <span className="badge badge-red" style={{ fontSize: 10, padding: '1px 6px' }}>Out</span>}
                          </div>
                          {nextStr && team.next_match_opponent && (
                            <div style={styles.teamRowNext}>
                              Next: vs {team.next_match_opponent} · {nextStr}
                            </div>
                          )}
                        </div>
                        <div style={styles.teamRowStats}>
                          <span style={styles.teamRowPts}>{team.points} pts</span>
                          <span style={styles.teamRowGoals}>{team.goals} ⚽</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Detailed points log */}
              {expanded === entry.id && userPoints[entry.id] && (
                <div style={styles.pointsLog}>
                  <h4 style={styles.pointsLogTitle}>Points History</h4>
                  {userPoints[entry.id].length === 0 ? (
                    <p style={{ color: 'rgba(248,248,242,0.4)', fontSize: 13 }}>No points yet — tournament starts June 11!</p>
                  ) : (
                    userPoints[entry.id].map(row => (
                      <div key={row.id} style={styles.logRow}>
                        <span style={{ fontSize: 16 }}>{getFlag(row.country_code)}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 12 }}>{row.team_name}</span>
                          <span style={styles.logReason}>{row.reason}</span>
                        </div>
                        <span style={styles.logPoints}>+{row.points}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Match results */}
      {tab === 'matches' && (
        <div style={styles.matchesSection}>
          {recentMatches.length === 0 ? (
            <div style={styles.empty}>
              <p>No results yet. Tournament starts June 11, 2026!</p>
            </div>
          ) : (
            recentMatches.map(m => <MatchCard key={m.id} match={m} />)
          )}
        </div>
      )}

      {/* Upcoming */}
      {tab === 'upcoming' && (
        <div style={styles.matchesSection}>
          {upcoming.length === 0 ? (
            <div style={styles.empty}>
              <p>Schedule will appear once the tournament begins.</p>
            </div>
          ) : (
            upcoming.map(m => <MatchCard key={m.id} match={m} upcoming />)
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, upcoming }) {
  const date = match.match_date ? new Date(match.match_date) : null;
  const isLive = match.status === 'live';

  return (
    <div style={{ ...styles.matchCard, ...(isLive ? styles.matchCardLive : {}) }}>
      <div style={styles.matchMeta}>
        <span style={styles.matchRound}>{ROUND_LABELS[match.round] || match.round || 'Group Stage'}</span>
        {match.group_name && <span style={styles.matchGroup}>Group {match.group_name}</span>}
        {isLive && <span className="badge badge-green" style={{ fontSize: 10, animation: 'pulse 1.5s infinite' }}>LIVE</span>}
        {date && <span style={styles.matchDate}>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
      <div style={styles.matchTeams}>
        <div style={styles.matchTeam}>
          <span style={{ fontSize: 28 }}>{getFlag(match.home_country_code)}</span>
          <span style={styles.matchTeamName}>{match.home_team_name || match.home_team_id}</span>
        </div>
        <div style={styles.matchScore}>
          {upcoming ? (
            <span style={styles.vsText}>VS</span>
          ) : (
            <span style={styles.scoreText}>
              {match.home_score ?? '–'} – {match.away_score ?? '–'}
            </span>
          )}
        </div>
        <div style={{ ...styles.matchTeam, textAlign: 'right' }}>
          <span style={styles.matchTeamName}>{match.away_team_name || match.away_team_id}</span>
          <span style={{ fontSize: 28 }}>{getFlag(match.away_country_code)}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', padding: '16px 20px 60px', maxWidth: 900, margin: '0 auto' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  loadingText: { color: 'rgba(248,248,242,0.4)', fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, letterSpacing: 3 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  title: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 40, letterSpacing: 4, color: '#f5c518' },
  syncText: { fontSize: 11, color: 'rgba(248,248,242,0.3)', marginTop: 2 },
  headerActions: { display: 'flex', gap: 8 },
  liveBanner: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
    background: 'rgba(46,196,182,0.08)', border: '1px solid rgba(46,196,182,0.2)',
    borderRadius: 10, padding: '10px 16px',
  },
  livePill: {
    background: '#2ec4b6', color: '#0a2e1a', fontSize: 11, fontWeight: 800,
    padding: '2px 8px', borderRadius: 4, letterSpacing: 1, animation: 'pulse 1.5s infinite',
  },
  liveMatches: { display: 'flex', gap: 20, flexWrap: 'wrap' },
  liveMatch: { fontSize: 13, fontWeight: 600 },
  tabs: { display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  tab: {
    background: 'none', border: 'none', color: 'rgba(248,248,242,0.4)',
    fontSize: 14, fontWeight: 500, padding: '10px 16px', cursor: 'pointer',
    borderBottom: '2px solid transparent', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif',
  },
  tabActive: { color: '#f5c518', borderBottomColor: '#f5c518' },
  leaderboardSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  leaderboardEntry: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, overflow: 'hidden',
  },
  entryHeader: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  entryRank: { width: 32, textAlign: 'center', fontSize: 20 },
  rankNum: { fontFamily: 'DM Mono, monospace', fontSize: 16, color: 'rgba(248,248,242,0.4)', fontWeight: 600 },
  entryEmoji: { fontSize: 26 },
  entryName: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  entryTeamCount: { fontSize: 11, color: 'rgba(248,248,242,0.4)' },
  entryStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  entryPoints: { display: 'flex', alignItems: 'baseline', gap: 4 },
  pointsNum: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#f5c518', letterSpacing: 1 },
  pointsLabel: { fontSize: 11, color: 'rgba(248,248,242,0.4)' },
  entryGoals: { display: 'flex', alignItems: 'baseline', gap: 4 },
  goalsNum: { fontFamily: 'DM Mono, monospace', fontSize: 14, color: '#2ec4b6', fontWeight: 700 },
  goalsLabel: { fontSize: 10, color: 'rgba(248,248,242,0.3)' },
  chevron: { color: 'rgba(248,248,242,0.3)', fontSize: 12 },
  entryTeams: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 6, padding: '0 20px 12px', borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  teamRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
    background: 'rgba(255,255,255,0.03)', borderRadius: 8,
  },
  teamRowName: { fontSize: 12, fontWeight: 500 },
  teamRowGroup: { fontSize: 11, color: 'rgba(248,248,242,0.4)' },
  teamRowNext: { fontSize: 10, color: 'rgba(248,248,242,0.3)', marginTop: 2 },
  teamRowStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 },
  teamRowPts: { fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#f5c518', fontWeight: 600 },
  teamRowGoals: { fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#2ec4b6' },
  pointsLog: { borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 20px 16px' },
  pointsLogTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(248,248,242,0.4)', marginBottom: 8 },
  logRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  logReason: { fontSize: 11, color: 'rgba(248,248,242,0.4)', marginLeft: 6 },
  logPoints: { fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#2ec4b6', fontWeight: 700 },
  matchesSection: { display: 'flex', flexDirection: 'column', gap: 10 },
  matchCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '16px 20px',
  },
  matchCardLive: { border: '1px solid rgba(46,196,182,0.3)', background: 'rgba(46,196,182,0.04)' },
  matchMeta: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  matchRound: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(248,248,242,0.5)' },
  matchGroup: { fontSize: 11, color: 'rgba(248,248,242,0.3)' },
  matchDate: { fontSize: 11, color: 'rgba(248,248,242,0.4)', marginLeft: 'auto' },
  matchTeams: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' },
  matchTeam: { display: 'flex', alignItems: 'center', gap: 10 },
  matchTeamName: { fontSize: 15, fontWeight: 600 },
  matchScore: { textAlign: 'center', minWidth: 80 },
  scoreText: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#f5c518', letterSpacing: 2 },
  vsText: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: 'rgba(248,248,242,0.3)', letterSpacing: 3 },
  empty: { textAlign: 'center', padding: '60px 20px', color: 'rgba(248,248,242,0.3)', fontSize: 15 },
};
