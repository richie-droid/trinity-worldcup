import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api, getFlag } from '../services/api';

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser } = useApp();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const targetId = userId || currentUser?.id;

  useEffect(() => {
    if (!targetId) { navigate('/'); return; }
    Promise.all([api.getLeaderboard()])
      .then(([lb]) => {
        const entry = lb.find(e => e.id === targetId);
        setProfile(entry || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [targetId, navigate]);

  if (loading) return (
    <div style={styles.loading}>
      <span style={styles.loadingText}>Loading profile...</span>
    </div>
  );

  if (!profile) return (
    <div style={styles.loading}>
      <span style={styles.loadingText}>Profile not found</span>
    </div>
  );

  const isOwnProfile = currentUser?.id === targetId;
  const rank = profile._rank;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Back nav */}
        <div style={styles.nav}>
          <button className="btn-secondary" onClick={() => navigate('/scoreboard')} style={{ fontSize: 13, padding: '8px 16px' }}>
            ← Scoreboard
          </button>
          {isOwnProfile && (
            <button className="btn-secondary" onClick={() => navigate('/draft')} style={{ fontSize: 13, padding: '8px 16px' }}>
              Draft Room
            </button>
          )}
        </div>

        {/* Profile card */}
        <div className="card animate-in" style={styles.profileCard}>
          <div style={styles.avatar}>{profile.emoji}</div>
          <div style={styles.profileInfo}>
            <h1 style={styles.profileName}>
              {profile.name}
              {profile.is_commissioner ? ' 👑' : ''}
              {isOwnProfile ? ' (you)' : ''}
            </h1>
            <div style={styles.statRow}>
              <div style={styles.stat}>
                <span style={styles.statNum}>{profile.total_points}</span>
                <span style={styles.statLabel}>Points</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.stat}>
                <span style={styles.statNum}>{profile.total_goals}</span>
                <span style={styles.statLabel}>Goals Scored</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.stat}>
                <span style={styles.statNum}>{profile.teams?.length || 0}</span>
                <span style={styles.statLabel}>Teams</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teams */}
        {profile.teams && profile.teams.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Drafted Teams</h2>
            <div style={styles.teamsGrid}>
              {profile.teams.map(team => {
                const nextDate = team.next_match_date ? new Date(team.next_match_date) : null;
                const nextStr = nextDate
                  ? nextDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                  : null;
                return (
                  <div key={team.team_id} style={{ ...styles.teamCard, ...(team.eliminated ? styles.teamCardEliminated : {}) }}>
                    <div style={styles.teamCardTop}>
                      <span style={styles.teamFlag}>{getFlag(team.country_code)}</span>
                      <div style={styles.teamInfo}>
                        <div style={styles.teamName}>{team.team_name}</div>
                        <div style={styles.teamMeta}>Group {team.group_name}</div>
                      </div>
                      {team.eliminated && (
                        <span className="badge badge-red" style={{ fontSize: 10 }}>Eliminated</span>
                      )}
                    </div>

                    <div style={styles.teamStats}>
                      <div style={styles.teamStat}>
                        <span style={styles.teamStatNum}>{team.points}</span>
                        <span style={styles.teamStatLabel}>pts</span>
                      </div>
                      <div style={styles.teamStatDivider} />
                      <div style={styles.teamStat}>
                        <span style={{ ...styles.teamStatNum, color: '#2ec4b6' }}>{team.goals}</span>
                        <span style={styles.teamStatLabel}>goals</span>
                      </div>
                      {team.odds && (
                        <>
                          <div style={styles.teamStatDivider} />
                          <div style={styles.teamStat}>
                            <span style={{ ...styles.teamStatNum, color: '#f5c518', fontSize: 13 }}>{team.odds}</span>
                            <span style={styles.teamStatLabel}>to win</span>
                          </div>
                        </>
                      )}
                      {team.fifa_rank && (
                        <>
                          <div style={styles.teamStatDivider} />
                          <div style={styles.teamStat}>
                            <span style={{ ...styles.teamStatNum, fontSize: 13 }}>#{team.fifa_rank}</span>
                            <span style={styles.teamStatLabel}>FIFA</span>
                          </div>
                        </>
                      )}
                    </div>

                    {nextStr && team.next_match_opponent && !team.eliminated && (
                      <div style={styles.nextMatch}>
                        <span style={styles.nextMatchLabel}>Next</span>
                        <span style={styles.nextMatchText}>
                          vs {getFlag(team.next_match_opponent_code)} {team.next_match_opponent} · {nextStr}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!profile.teams || profile.teams.length === 0) && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(248,248,242,0.4)' }}>
            No teams drafted yet — the draft hasn't started.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '16px 20px 60px',
    background: 'radial-gradient(ellipse at top, #0d3d22 0%, #0a2e1a 40%, #1a1a2e 100%)',
  },
  container: { maxWidth: 700, margin: '0 auto' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  loadingText: { color: 'rgba(248,248,242,0.4)', fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, letterSpacing: 3 },
  nav: { display: 'flex', gap: 8, marginBottom: 24 },
  profileCard: {
    display: 'flex', alignItems: 'center', gap: 24, padding: '28px 32px',
    marginBottom: 28,
  },
  avatar: { fontSize: 64, lineHeight: 1 },
  profileInfo: { flex: 1 },
  profileName: {
    fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, letterSpacing: 2,
    color: '#f8f8f2', marginBottom: 16,
  },
  statRow: { display: 'flex', alignItems: 'center', gap: 20 },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  statNum: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 30, color: '#f5c518', letterSpacing: 1 },
  statLabel: { fontSize: 11, color: 'rgba(248,248,242,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 36, background: 'rgba(255,255,255,0.1)' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2,
    color: '#f8f8f2', marginBottom: 14,
  },
  teamsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  teamCard: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '16px 18px',
  },
  teamCardEliminated: { opacity: 0.55 },
  teamCardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  teamFlag: { fontSize: 36 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  teamMeta: { fontSize: 12, color: 'rgba(248,248,242,0.4)' },
  teamStats: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  teamStat: { display: 'flex', flexDirection: 'column', gap: 1 },
  teamStatNum: { fontFamily: 'DM Mono, monospace', fontSize: 17, fontWeight: 700, color: '#f8f8f2' },
  teamStatLabel: { fontSize: 10, color: 'rgba(248,248,242,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },
  teamStatDivider: { width: 1, height: 28, background: 'rgba(255,255,255,0.08)' },
  nextMatch: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', background: 'rgba(255,255,255,0.03)',
    borderRadius: 8, borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  nextMatchLabel: {
    fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
    color: '#2ec4b6', background: 'rgba(46,196,182,0.12)',
    padding: '2px 6px', borderRadius: 4,
  },
  nextMatchText: { fontSize: 12, color: 'rgba(248,248,242,0.6)' },
};
