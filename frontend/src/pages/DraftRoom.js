import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { api, getFlag, POT_COLORS } from '../services/api';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export default function DraftRoom() {
  const { user } = useApp();
  const navigate = useNavigate();
  const { connected, draftState, lastEvent, send } = useWebSocket(user?.id);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState(null);
  const feedRef = useRef(null);
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  // Process events for notification feed
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'pick_made') {
      const picker = lastEvent.users?.find(u => u.id === lastEvent.userId);
      const team = lastEvent.allTeams?.find(t => t.id === lastEvent.teamId);
      if (picker && team) {
        const entry = {
          id: Date.now(),
          text: `${picker.emoji} ${picker.name} picked ${getFlag(team.country_code)} ${team.name}`,
          isMe: lastEvent.userId === user?.id,
        };
        setFeed(prev => [entry, ...prev].slice(0, 20));

        if (lastEvent.nextPickerId === user?.id) {
          setNotification("It's your turn to pick!");
          setTimeout(() => setNotification(null), 5000);
        }
      }
    }
    if (lastEvent.type === 'draft_started') {
      setFeed([{ id: Date.now(), text: '🚀 Draft has started!', isMe: false }]);
    }
    if (lastEvent.type === 'error') {
      setNotification(`❌ ${lastEvent.message}`);
      setTimeout(() => setNotification(null), 5000);
    }
  }, [lastEvent, user?.id]);

  if (!draftState) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingDot} />
        <span>Connecting to draft room...</span>
      </div>
    );
  }

  const { state, users = [], availableTeams = [], picks = [], allTeams = [] } = draftState;
  const isCommissioner = user?.is_commissioner;
  const isDraftWaiting = state?.status === 'waiting';
  const isDraftActive = state?.status === 'active';
  const isDraftDone = state?.status === 'completed';

  // Compute whose turn it is
  const draftOrder = state?.draft_order || [];
  const currentPick = state?.current_pick || 1;
  const roundIndex = Math.floor((currentPick - 1) / (draftOrder.length || 1));
  const isReversed = roundIndex % 2 === 1;
  const pickInRound = (currentPick - 1) % (draftOrder.length || 1);
  const effectiveIndex = isReversed ? draftOrder.length - 1 - pickInRound : pickInRound;
  const currentPickerId = isDraftActive ? draftOrder[effectiveIndex] : null;
  const isMyTurn = currentPickerId === user?.id;
  const currentPicker = users.find(u => u.id === currentPickerId);

  // My teams
  const myPicks = picks.filter(p => p.user_id === user?.id);

  // Parse odds string to numeric value for sorting (+350 → 350, null → Infinity)
  const parseOdds = (odds) => {
    if (!odds) return Infinity;
    return parseInt(odds.replace('+', '').replace('-', ''), 10);
  };

  // Filter and sort available teams by odds (best → worst)
  const filtered = availableTeams
    .filter(t => {
      if (filter !== 'all' && t.group_name !== filter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => parseOdds(a.odds) - parseOdds(b.odds));

  const makePick = (teamId) => {
    if (!isMyTurn || !isDraftActive) return;
    send({ type: 'make_pick', userId: user.id, teamId });
  };

  const startDraft = () => {
    send({ type: 'start_draft', userId: user.id });
  };

  const shuffleOrder = () => {
    send({ type: 'shuffle_order', userId: user.id });
  };

  const teamsPerUser = draftOrder.length > 0
    ? Math.floor(48 / draftOrder.length)
    : 0;

  return (
    <div style={styles.page}>
      {/* Notification banner */}
      {notification && (
        <div style={styles.notification}>
          <span>⚡ {notification}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>DRAFT ROOM</h1>
          <div style={styles.connStatus}>
            <span style={{ ...styles.dot, background: connected ? '#2ec4b6' : '#e63946' }} />
            <span style={styles.connText}>{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button className="btn-secondary" onClick={() => navigate('/profile')} style={{ fontSize: 13, padding: '8px 16px' }}>
            My Profile
          </button>
          <button className="btn-secondary" onClick={() => navigate('/scoreboard')} style={{ fontSize: 13, padding: '8px 16px' }}>
            Scoreboard →
          </button>
        </div>
      </div>

      <div style={styles.layout}>
        {/* LEFT: Draft status + participants */}
        <div style={styles.sidebar}>

          {/* Status card */}
          <div className="card" style={{ marginBottom: 16 }}>
            {isDraftWaiting && (
              <>
                <div className="badge badge-gold" style={{ marginBottom: 12 }}>Waiting to Start</div>
                <p style={styles.sidebarText}>
                  {users.length} player{users.length !== 1 ? 's' : ''} joined
                  {teamsPerUser > 0 ? ` · ${teamsPerUser} teams each` : ''}
                </p>
                {/* Draft order preview */}
                {users.length > 0 && (
                  <div style={styles.orderPreview}>
                    <div style={styles.orderTitle}>Pick Order</div>
                    {(() => {
                      const pendingOrder = state?.pending_order || [];
                      const orderedUsers = pendingOrder.length > 0
                        ? pendingOrder.map(id => users.find(u => u.id === id)).filter(Boolean)
                        : users;
                      return orderedUsers.map((u, i) => (
                        <div key={u.id} style={styles.orderRow}>
                          <span style={styles.orderNum}>{i + 1}</span>
                          <span style={styles.orderEmoji}>{u.emoji}</span>
                          <span style={{ fontSize: 12, fontWeight: u.id === user?.id ? 700 : 400 }}>{u.name}</span>
                          {u.id === user?.id && <span style={{ fontSize: 10, color: 'rgba(248,248,242,0.4)' }}>(you)</span>}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {isCommissioner ? (
                  <>
                    <p style={{ ...styles.sidebarText, marginBottom: 8, color: 'rgba(248,248,242,0.5)', fontSize: 12 }}>
                      You're the commissioner. Start when everyone's joined.
                    </p>
                    <button
                      className="btn-secondary"
                      onClick={shuffleOrder}
                      disabled={users.length < 2}
                      style={{ width: '100%', marginBottom: 8, fontSize: 13 }}
                    >
                      🔀 Randomize Order
                    </button>
                    <button
                      className="btn-primary"
                      onClick={startDraft}
                      disabled={users.length < 2}
                      style={{ width: '100%', marginBottom: 8 }}
                    >
                      Start Draft
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ width: '100%', fontSize: 12, color: '#e63946', borderColor: 'rgba(230,57,70,0.3)' }}
                      onClick={async () => {
                        if (!window.confirm('Reset everything? This clears all users, picks, and points.')) return;
                        await api.resetDraft(user.id);
                        window.location.href = '/';
                      }}
                    >
                      Reset Draft
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ ...styles.sidebarText, color: 'rgba(248,248,242,0.5)', fontSize: 12 }}>
                      Waiting for commissioner to start...
                    </p>
                    {!isCommissioner && (
                      <button
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: 13, marginTop: 8 }}
                        onClick={async () => {
                          const updated = await api.claimCommissioner(user.id);
                          if (updated?.id) {
                            localStorage.setItem('wc_user', JSON.stringify(updated));
                            window.location.reload();
                          }
                        }}
                      >
                        👑 Claim Commissioner
                      </button>
                    )}
                  </>
                )}
              </>
            )}

            {isDraftActive && (
              <>
                <div className="badge badge-green" style={{ marginBottom: 12 }}>Draft Live</div>
                <p style={styles.sidebarText}>
                  Pick #{currentPick} of {state.total_picks}
                </p>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${((currentPick - 1) / state.total_picks) * 100}%` }} />
                </div>
                <div style={{ marginTop: 12 }}>
                  {isMyTurn ? (
                    <div style={styles.yourTurn}>
                      ⚡ Your turn! Select a team →
                    </div>
                  ) : (
                    <div style={styles.waitingTurn}>
                      {currentPicker?.emoji} Waiting for {currentPicker?.name}...
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(248,248,242,0.4)', marginTop: 8 }}>
                  Round {roundIndex + 1} · {isReversed ? 'Reversed' : 'Forward'} order
                </p>
              </>
            )}

            {isDraftDone && (
              <>
                <div className="badge badge-gold" style={{ marginBottom: 12 }}>Draft Complete!</div>
                <p style={styles.sidebarText}>All 48 teams have been drafted.</p>
                <button className="btn-primary" onClick={() => navigate('/scoreboard')} style={{ width: '100%', marginTop: 12, marginBottom: 8 }}>
                  View Scoreboard →
                </button>
                {isCommissioner && (
                  <button
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: 12, color: '#e63946', borderColor: 'rgba(230,57,70,0.3)' }}
                    onClick={async () => {
                      if (!window.confirm('Reset everything? This clears all users, picks, and points.')) return;
                      await api.resetDraft(user.id);
                      window.location.href = '/';
                    }}
                  >
                    Reset Draft
                  </button>
                )}
              </>
            )}
          </div>

          {/* My teams */}
          {myPicks.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={styles.sidebarHeading}>My Teams ({myPicks.length})</h4>
              <div style={styles.myTeamsList}>
                {myPicks.map(pick => (
                  <div key={pick.team_id} style={styles.myTeamItem}>
                    <span style={{ fontSize: 18 }}>{getFlag(pick.country_code)}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{pick.team_name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(248,248,242,0.4)' }}>Group {pick.group_name}</div>
                    </div>
                    <span style={{ ...styles.potBadge, background: POT_COLORS[pick.pot] + '30', color: POT_COLORS[pick.pot], border: `1px solid ${POT_COLORS[pick.pot]}50` }}>
                      P{pick.pot}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={styles.sidebarHeading}>Players ({users.length})</h4>
            {users.map((u, i) => {
              const userPicks = picks.filter(p => p.user_id === u.id);
              const isCurrentPicker = u.id === currentPickerId && isDraftActive;
              return (
                <div key={u.id} style={{ ...styles.playerRow, ...(isCurrentPicker ? styles.playerRowActive : {}) }}>
                  <span style={styles.playerEmoji}>{u.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: u.id === user?.id ? 700 : 400 }}>
                      {u.name} {u.id === user?.id ? '(you)' : ''} {u.is_commissioner ? '👑' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(248,248,242,0.4)' }}>{userPicks.length} teams picked</div>
                  </div>
                  {isCurrentPicker && <span style={styles.pickingBadge}>Picking</span>}
                </div>
              );
            })}
          </div>

          {/* Activity feed */}
          {feed.length > 0 && (
            <div className="card">
              <h4 style={styles.sidebarHeading}>Activity</h4>
              <div ref={feedRef} style={styles.feed}>
                {feed.map(entry => (
                  <div key={entry.id} style={{ ...styles.feedItem, ...(entry.isMe ? styles.feedItemMe : {}) }}>
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Team picker */}
        <div style={styles.main}>
          <div style={styles.teamPickerHeader}>
            <h2 style={styles.teamsTitle}>
              Available Teams
              <span style={styles.teamCount}>{availableTeams.length}</span>
            </h2>
            <div style={styles.filters}>
              <input
                style={styles.searchInput}
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                style={styles.select}
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="all">All Groups</option>
                {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
              </select>
            </div>
          </div>

          {/* Team grid */}
          <div style={styles.teamGrid}>
            {filtered.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                isMyTurn={isMyTurn && isDraftActive}
                onPick={makePick}
              />
            ))}
            {filtered.length === 0 && (
              <div style={styles.empty}>No teams found</div>
            )}
          </div>

          {/* Draft board — all picks so far */}
          {picks.length > 0 && (
            <div style={styles.draftBoardSection}>
              <h3 style={styles.draftBoardTitle}>Draft Board</h3>
              <div style={styles.draftBoard}>
                {picks.map(pick => {
                  const picker = users.find(u => u.id === pick.user_id);
                  return (
                    <div key={pick.id} style={styles.draftPick}>
                      <span style={styles.pickNum}>#{pick.pick_number}</span>
                      <span style={{ fontSize: 18 }}>{getFlag(pick.country_code)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick.team_name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(248,248,242,0.4)' }}>{picker?.emoji} {picker?.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamCard({ team, isMyTurn, onPick }) {
  const [hovered, setHovered] = useState(false);

  const nextMatchDate = team.next_match_date ? new Date(team.next_match_date) : null;
  const nextMatchStr = nextMatchDate
    ? nextMatchDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      style={{
        ...styles.teamCard,
        ...(isMyTurn ? styles.teamCardPickable : {}),
        ...(hovered && isMyTurn ? styles.teamCardHovered : {}),
      }}
      onClick={() => isMyTurn && onPick(team.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.teamCardFlag}>{getFlag(team.country_code)}</div>
      <div style={styles.teamCardName}>{team.name}</div>
      {team.fifa_rank && (
        <div style={styles.teamCardRank}>#{team.fifa_rank} FIFA</div>
      )}
      {team.odds && (
        <div style={styles.teamCardOdds}>{team.odds}</div>
      )}
      <div style={styles.teamCardMeta}>
        <span style={styles.groupBadge}>Grp {team.group_name}</span>
        <span style={{ ...styles.potBadge, background: POT_COLORS[team.pot] + '25', color: POT_COLORS[team.pot] }}>
          Pot {team.pot}
        </span>
      </div>
      {nextMatchStr && team.next_match_opponent && (
        <div style={styles.teamCardNext}>
          vs {team.next_match_opponent} · {nextMatchStr}
        </div>
      )}
      {isMyTurn && (
        <div style={styles.pickOverlay}>PICK</div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', padding: '16px 20px 40px', maxWidth: 1400, margin: '0 auto' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, color: 'rgba(248,248,242,0.5)' },
  loadingDot: { width: 8, height: 8, borderRadius: '50%', background: '#f5c518', animation: 'pulse 1s infinite' },
  notification: {
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    background: '#f5c518', color: '#0a2e1a', padding: '10px 24px',
    borderRadius: 40, fontWeight: 700, fontSize: 14, zIndex: 1000,
    animation: 'fadeIn 0.3s ease', boxShadow: '0 4px 20px rgba(245,197,24,0.4)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  title: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: 3, color: '#f5c518' },
  connStatus: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block' },
  connText: { fontSize: 12, color: 'rgba(248,248,242,0.5)' },
  headerRight: { display: 'flex', gap: 8 },
  layout: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 },
  sidebar: {},
  sidebarHeading: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: 1.5, marginBottom: 12, color: '#f8f8f2' },
  sidebarText: { fontSize: 14, color: 'rgba(248,248,242,0.7)', marginBottom: 8 },
  progressBar: { height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', background: '#f5c518', borderRadius: 2, transition: 'width 0.5s ease' },
  yourTurn: { background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#f5c518' },
  waitingTurn: { background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'rgba(248,248,242,0.5)' },
  orderPreview: { marginBottom: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' },
  orderTitle: { fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(248,248,242,0.35)', marginBottom: 8 },
  orderRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' },
  orderNum: { fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'rgba(248,248,242,0.3)', width: 16 },
  orderEmoji: { fontSize: 16, width: 20, textAlign: 'center' },
  myTeamsList: { display: 'flex', flexDirection: 'column', gap: 8 },
  myTeamItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  potBadge: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, fontFamily: 'DM Mono, monospace' },
  playerRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  playerRowActive: { background: 'rgba(245,197,24,0.05)', borderRadius: 8, padding: '8px', margin: '0 -8px', borderBottom: 'none' },
  playerEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  pickingBadge: { fontSize: 10, background: 'rgba(245,197,24,0.2)', color: '#f5c518', padding: '2px 8px', borderRadius: 10, fontWeight: 700, animation: 'pulse 1.5s infinite' },
  feed: { maxHeight: 160, overflowY: 'auto' },
  feedItem: { fontSize: 12, color: 'rgba(248,248,242,0.6)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', animation: 'slideIn 0.3s ease' },
  feedItemMe: { color: '#f5c518' },
  main: {},
  teamPickerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  teamsTitle: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 10 },
  teamCount: { fontSize: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 10px', fontFamily: 'DM Mono, monospace' },
  filters: { display: 'flex', gap: 8 },
  searchInput: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px', color: '#f8f8f2', fontSize: 13, width: 120,
  },
  select: {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px', color: '#f8f8f2', fontSize: 13,
  },
  teamGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 },
  teamCard: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'default',
    transition: 'all 0.15s ease', position: 'relative', overflow: 'hidden',
  },
  teamCardPickable: { cursor: 'pointer', border: '1px solid rgba(245,197,24,0.2)' },
  teamCardHovered: { background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.4)', transform: 'translateY(-2px)' },
  teamCardFlag: { fontSize: 32, marginBottom: 6 },
  teamCardName: { fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.2 },
  teamCardRank: { fontSize: 10, color: 'rgba(248,248,242,0.4)', marginBottom: 2 },
  teamCardOdds: { fontSize: 11, fontWeight: 700, color: '#2ec4b6', fontFamily: 'DM Mono, monospace', marginBottom: 6 },
  teamCardMeta: { display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 4 },
  teamCardNext: { fontSize: 9, color: 'rgba(248,248,242,0.35)', marginTop: 4, lineHeight: 1.3 },
  groupBadge: { fontSize: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(248,248,242,0.6)', padding: '2px 6px', borderRadius: 4 },
  pickOverlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(245,197,24,0.9)', color: '#0a2e1a', fontFamily: 'Bebas Neue, sans-serif',
    fontSize: 22, letterSpacing: 3, opacity: 0, transition: 'opacity 0.15s',
  },
  empty: { gridColumn: '1/-1', textAlign: 'center', color: 'rgba(248,248,242,0.3)', padding: 40 },
  draftBoardSection: { marginTop: 32 },
  draftBoardTitle: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, letterSpacing: 2, marginBottom: 16 },
  draftBoard: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 },
  draftPick: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, animation: 'fadeIn 0.3s ease',
  },
  pickNum: { fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'rgba(248,248,242,0.3)', minWidth: 24 },
};
